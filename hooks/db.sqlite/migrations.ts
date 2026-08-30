/**
 * migrations.ts
 * Estancia360 — versionado del schema SQLite local
 *
 * database.ts define el baseline actual (lo que recibe una instalación limpia).
 * Este archivo define cómo llevar una instalación EXISTENTE (con datos reales)
 * del baseline anterior al actual, igual que migrations/ en db-estancia-360 pero
 * aplicado a SQLite vía PRAGMA user_version en vez de una tabla _migrations.
 *
 * Reglas:
 *   - Nunca editar una migración ya publicada — agregar una nueva al final.
 *   - Cada migración sube user_version en +1, en orden, sin saltos.
 *   - up() debe ser seguro de correr incluso si algunos de sus efectos ya
 *     ocurrieron a medias (usar IF EXISTS/IF NOT EXISTS donde aplique).
 */

import * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/** true si `column` en `table` todavía es NOT NULL (o sea, la migración que la vuelve
 * nullable todavía no corrió en esta base) — usado para que una migración pueda
 * chequear su propio estado real en vez de asumir "nunca corrió" a ciegas. */
async function columnIsNotNull(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string; notnull: number }>(`PRAGMA table_info(${table})`);
  const col = rows.find((r) => r.name === column);
  return col ? col.notnull === 1 : false;
}

async function columnExists(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

async function tableExists(db: SQLite.SQLiteDatabase, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return !!row;
}

/**
 * Repara una tabla cuya definición de FOREIGN KEY (id_event) quedó apuntando a
 * "animal_events_old" en vez de "animal_events" — causa raíz real del error
 * "no such table: main.animal_events_old", encontrada 2026-08-09 DESPUÉS de que el
 * fix de idempotencia de la migración v2 (ver finishNullableIdUserMigration) no
 * alcanzara para resolverlo en un dispositivo real.
 *
 * Mecanismo: `ALTER TABLE animal_events RENAME TO animal_events_old` (migración v2)
 * no solo renombra esa tabla — SQLite además reescribe automáticamente el texto de
 * FOREIGN KEY de CUALQUIER OTRA tabla que referencie "animal_events" para que ahora
 * diga "animal_events_old" (así la referencia sigue siendo válida apuntando a donde
 * sea que esa tabla vive ahora). Migración v2 después crea una NUEVA tabla
 * "animal_events" (distinta, vacía) y borra "animal_events_old" — pero el texto de
 * FK ya reescrito en las 11 tablas dependientes (weight_records, breeding_services,
 * gestation_diagnoses, parturitions, weanings, rearing_selections,
 * fattening_entries, animal_exits, vaccinations, treatments, health_incidents)
 * sigue diciendo "animal_events_old" — un nombre que ya no existe. Con
 * `foreign_keys = ON`, cualquier INSERT/UPDATE futuro a esas tablas dispara la
 * validación de FK, que intenta resolver "animal_events_old" y revienta con "no
 * such table" — pasa en TODO dispositivo que haya corrido la migración v2 alguna
 * vez, sin importar si corrió limpia o a medias (no es un problema de idempotencia).
 *
 * Fix: reconstruir cada tabla dependiente bajo un nombre TEMPORAL primero (no
 * "animal_events", el nombre que SQLite reescribe en cascada), copiar los datos,
 * borrar la vieja, y recién ahí renombrar la nueva al nombre final — como nada
 * referencia el nombre temporal, este renombrado no dispara ninguna reescritura en
 * cascada y el FK queda apuntando correctamente a "animal_events" para siempre.
 */
async function fixDanglingEventFk(
  db: SQLite.SQLiteDatabase,
  table: string,
  createSqlFor: (name: string) => string,
  indexSqls: string[] = []
): Promise<void> {
  const fixedExists = await tableExists(db, `${table}_fixed`);
  const origExists = await tableExists(db, table);

  if (!fixedExists && origExists) {
    const row = await db.getFirstAsync<{ sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [table]
    );
    if (row && !row.sql.includes('animal_events_old')) {
      console.log(`[migrations] v4 ${table}: schema ya correcto, no-op`);
      return;
    }
    console.log(`[migrations] v4 ${table}: FK apunta a animal_events_old, reconstruyendo`);
    await db.execAsync(createSqlFor(`${table}_fixed`));
  } else if (!fixedExists && !origExists) {
    // Estado imposible en la práctica (todas estas tablas vienen del DDL baseline,
    // nunca deberían faltar en una instalación existente) — por robustez, si
    // pasara, no hay nada de qué recuperar más que crearla vacía.
    console.log(`[migrations] v4 ${table}: ni ${table} ni ${table}_fixed existen, creando vacía`);
    await db.execAsync(createSqlFor(table));
    for (const sql of indexSqls) await db.execAsync(sql);
    return;
  }

  if (await tableExists(db, table)) {
    console.log(`[migrations] v4 ${table}: copiando datos ${table} -> ${table}_fixed (OR IGNORE)`);
    await db.execAsync(`INSERT OR IGNORE INTO ${table}_fixed SELECT * FROM ${table}`);
    await db.execAsync(`DROP TABLE ${table}`);
  }
  await db.execAsync(`ALTER TABLE ${table}_fixed RENAME TO ${table}`);
  for (const sql of indexSqls) await db.execAsync(sql);
  console.log(`[migrations] v4 ${table}: reconstruida OK`);
}

/**
 * Termina la migración rename→recreate→copy→drop de `table` (`id_user` NOT NULL → nullable)
 * sin importar en qué punto haya quedado a medias. Bug real 2026-08-09: el guard anterior
 * (columnIsNotNull sobre `table`) asumía que `table` siempre existe — si un intento previo
 * a este fix se cortó justo después del RENAME (dejando `table` inexistente y `${table}_old`
 * viva con el schema viejo), PRAGMA table_info(table) devuelve 0 filas y el guard lo lee como
 * "ya migrado", saltea todo para siempre y el dispositivo queda sin `table` — cualquier query
 * futura explota con "no such table: main.<table>" (o, si algo más adelante SÍ llega a tocar
 * el nombre viejo, "no such table: main.<table>_old"). Acá se resuelve mirando la existencia
 * real de AMBAS tablas y resumiendo desde donde haya quedado, en vez de un solo chequeo de columna.
 */
async function finishNullableIdUserMigration(
  db: SQLite.SQLiteDatabase,
  table: string,
  createSql: string,
  postCreateSql: string[]
): Promise<void> {
  const oldExists = await tableExists(db, `${table}_old`);
  const newExists = await tableExists(db, table);
  console.log(`[migrations] v2 ${table}: oldExists=${oldExists} newExists=${newExists}`);

  if (!oldExists && newExists && !(await columnIsNotNull(db, table, 'id_user'))) {
    console.log(`[migrations] v2 ${table}: ya migrado, no-op`);
    return; // caso normal: ya corrió completa alguna vez, nada que hacer
  }

  if (!oldExists && !newExists) {
    // No debería pasar en una DB existente (solo aplica a instalaciones nuevas, que no pasan
    // por acá) — pero si pasa, no hay nada de qué partir: crear la tabla nueva vacía.
    console.log(`[migrations] v2 ${table}: ninguna de las dos existe, creando ${table} vacía`);
    await db.execAsync(createSql);
    for (const sql of postCreateSql) await db.execAsync(sql);
    return;
  }

  if (!oldExists && newExists) {
    // `table` existe pero todavía con id_user NOT NULL: recién arranca, hacer el rename.
    console.log(`[migrations] v2 ${table}: arrancando rename ${table} -> ${table}_old`);
    await db.execAsync(`ALTER TABLE ${table} RENAME TO ${table}_old`);
  }

  if (!(await tableExists(db, table))) {
    console.log(`[migrations] v2 ${table}: creando ${table} nueva`);
    await db.execAsync(createSql);
    for (const sql of postCreateSql) await db.execAsync(sql);
  }

  if (await tableExists(db, `${table}_old`)) {
    // OR IGNORE (no INSERT a secas): si un intento previo a este fix ya había copiado los
    // datos y se cortó justo antes del DROP, un INSERT liso reventaría con "UNIQUE constraint
    // failed" sobre el id (PK) ya presente en la tabla nueva — OR IGNORE hace que retomar
    // desde ese punto sea un no-op seguro en vez de un crash nuevo.
    console.log(`[migrations] v2 ${table}: copiando datos de ${table}_old -> ${table} (OR IGNORE)`);
    await db.execAsync(`INSERT OR IGNORE INTO ${table} SELECT * FROM ${table}_old`);
    await db.execAsync(`DROP TABLE ${table}_old`);
    console.log(`[migrations] v2 ${table}: ${table}_old dropeada`);
  }
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description:
      'Movimientos batch-first: animal_purchases/animal_sales/animal_transfers → movements/movement_animals (movements/movement_animals ya fueron creadas por el DDL antes de correr esto). Fix nombre de clase 10: Toro → Torillo.',
    up: async (db) => {
      await db.execAsync(`DROP TABLE IF EXISTS animal_purchases`);
      await db.execAsync(`DROP TABLE IF EXISTS animal_sales`);
      await db.execAsync(`DROP TABLE IF EXISTS animal_transfers`);
      await db.execAsync(`DROP TABLE IF EXISTS sync_queue`);
      await db.runAsync(`UPDATE animal_classes SET name = 'Torillo' WHERE id = 10 AND name = 'Toro'`);
    },
  },
  {
    version: 2,
    description:
      'id_user opcional en animal_events y feed_records — un registro DESCARGADO del server ' +
      'puede haber sido creado por otro usuario que no existe localmente; exigir NOT NULL ahí ' +
      'rompía la descarga inicial (downloadFromServer) con "NOT NULL constraint failed".',
    up: async (db) => {
      // Bug real encontrado 2026-08-09: el guard anterior (columnIsNotNull sobre
      // animal_events/feed_records directo) asumía que esas tablas siempre existen —
      // si un intento previo a este fix se cortó a mitad de camino (ej. justo
      // después del RENAME), la tabla nueva no existe todavía, PRAGMA table_info
      // devuelve 0 filas, el guard lee eso como "ya migrado" y saltea todo para
      // siempre, dejando el dispositivo sin animal_events/feed_records de forma
      // permanente — cualquier escritura posterior revienta con "no such table".
      // finishNullableIdUserMigration resume desde CUALQUIER estado a medias
      // (mirando la existencia real de ambas tablas, no solo una columna) en vez
      // de solo detectar "nunca corrió" vs. "corrió completa".
      await finishNullableIdUserMigration(
        db,
        'animal_events',
        `CREATE TABLE animal_events (
            id              TEXT    PRIMARY KEY,
            server_id       TEXT,
            id_user         TEXT,
            id_ranch_animal TEXT    NOT NULL,
            id_event_type   INTEGER NOT NULL,
            notes           TEXT,
            event_date      TEXT    NOT NULL,
            created_at      TEXT    NOT NULL,
            updated_at      TEXT    NOT NULL,
            is_synced       INTEGER NOT NULL DEFAULT 0,
            sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
            synced_at       TEXT,
            FOREIGN KEY (id_ranch_animal) REFERENCES ranch_animals(id)
          )`,
        [
          `CREATE INDEX IF NOT EXISTS idx_events_animal ON animal_events(id_ranch_animal)`,
          `CREATE INDEX IF NOT EXISTS idx_events_type   ON animal_events(id_event_type)`,
          `CREATE INDEX IF NOT EXISTS idx_events_synced ON animal_events(is_synced)`,
        ]
      );

      await finishNullableIdUserMigration(
        db,
        'feed_records',
        `CREATE TABLE feed_records (
            id          TEXT    PRIMARY KEY,
            server_id   TEXT,
            id_lot      TEXT    NOT NULL,
            id_user     TEXT,
            feed_date   TEXT    NOT NULL,
            feed_type   TEXT    NOT NULL,
            quantity    REAL,
            unit        TEXT,
            cost        REAL,
            notes       TEXT,
            created_at  TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL,
            is_synced   INTEGER NOT NULL DEFAULT 0,
            sync_action TEXT    NOT NULL DEFAULT 'INSERT',
            synced_at   TEXT,
            FOREIGN KEY (id_lot) REFERENCES ranch_lots(id)
          )`,
        [
          `CREATE INDEX IF NOT EXISTS idx_feed_lot  ON feed_records(id_lot)`,
          `CREATE INDEX IF NOT EXISTS idx_feed_date ON feed_records(feed_date)`,
        ]
      );
    },
  },
  {
    version: 3,
    description:
      'fattening_entries gana id_lot_dest — se calculaba y aplicaba localmente (mueve el animal ' +
      'de lote) pero nunca se guardaba en la tabla ni se sincronizaba, así que el backend ' +
      '(RegisterFatteningEntryDto.idLotDest, obligatorio) nunca lo recibía: el ingreso a Engorde ' +
      'creado manualmente en el móvil quedaba con ps=Engorde en el servidor pero el animal seguía ' +
      'en su lote de Recría ahí. El flujo automático vía Selección de Recría no se ve afectado — ' +
      'ese usa rearing_selections.id_lot_dest, que ya existía.',
    up: async (db) => {
      // Mismo criterio de idempotencia que la migración 2: ADD COLUMN revienta con
      // "duplicate column name" si esto se reintenta después de haber corrido —
      // chequear antes de intentarlo, no asumir "nunca corrió".
      if (!(await columnExists(db, 'fattening_entries', 'id_lot_dest'))) {
        await db.execAsync(`ALTER TABLE fattening_entries ADD COLUMN id_lot_dest TEXT REFERENCES ranch_lots(id)`);
      }
    },
  },
  {
    version: 4,
    description:
      'Repara FOREIGN KEY (id_event) dejada apuntando a "animal_events_old" por el RENAME TABLE ' +
      'de la migración v2 en las 11 tablas que referencian animal_events — causa raíz real de ' +
      '"no such table: main.animal_events_old" (ver comentario de fixDanglingEventFk arriba). No ' +
      'agrega ninguna tabla/columna nueva: mismas 11 tablas, mismas columnas, solo se corrige el ' +
      'texto de FK interno de SQLite.',
    up: async (db) => {
      await fixDanglingEventFk(db, 'breeding_services', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_animal_male  TEXT,
        service_type    TEXT    NOT NULL CHECK(service_type IN ('natural','artificial_insemination','embryo_transfer')),
        semen_breed     TEXT,
        technician      TEXT,
        reproductive_lot TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id)
      )`);

      await fixDanglingEventFk(db, 'gestation_diagnoses', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_service      TEXT    NOT NULL,
        method          TEXT    NOT NULL CHECK(method IN ('palpation','ultrasound')),
        result          TEXT    NOT NULL CHECK(result IN ('pregnant','empty')),
        gestation_days  INTEGER,
        estimated_birth TEXT,
        veterinarian    TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event)   REFERENCES animal_events(id),
        FOREIGN KEY (id_service) REFERENCES breeding_services(id)
      )`);

      await fixDanglingEventFk(db, 'parturitions', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_diagnosis    TEXT    NOT NULL,
        birth_type      TEXT    NOT NULL CHECK(birth_type IN ('normal','assisted','cesarean')),
        id_cria         TEXT,
        cria_weight     INTEGER,
        cria_status     TEXT    NOT NULL CHECK(cria_status IN ('alive','dead')),
        mother_condition TEXT   CHECK(mother_condition IN ('good','regular','bad')),
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event)     REFERENCES animal_events(id),
        FOREIGN KEY (id_diagnosis) REFERENCES gestation_diagnoses(id),
        FOREIGN KEY (id_cria)      REFERENCES ranch_animals(id)
      )`);

      await fixDanglingEventFk(db, 'weanings', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_cria         TEXT    NOT NULL,
        id_lot_dest     TEXT    NOT NULL,
        weaning_weight  REAL,
        weaning_age     INTEGER,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event)    REFERENCES animal_events(id),
        FOREIGN KEY (id_cria)     REFERENCES ranch_animals(id),
        FOREIGN KEY (id_lot_dest) REFERENCES ranch_lots(id)
      )`);

      await fixDanglingEventFk(db, 'weight_records', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_lot          TEXT    NOT NULL,
        weight          REAL    NOT NULL,
        weight_type     TEXT    NOT NULL CHECK(weight_type IN ('scale','estimated')),
        body_condition  INTEGER CHECK(body_condition BETWEEN 1 AND 5),
        age_days        INTEGER,
        notes           TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id),
        FOREIGN KEY (id_lot)   REFERENCES ranch_lots(id)
      )`);

      await fixDanglingEventFk(db, 'rearing_selections', (n) => `CREATE TABLE ${n} (
        id                  TEXT    PRIMARY KEY,
        server_id           TEXT,
        id_event            TEXT    NOT NULL,
        id_lot_dest         TEXT,
        destination         TEXT    NOT NULL CHECK(destination IN ('replacement','fattening','sale')),
        weight_at_selection REAL,
        body_condition      INTEGER CHECK(body_condition BETWEEN 1 AND 5),
        genetic_score       REAL,
        age_days            INTEGER,
        notes               TEXT,
        created_at          TEXT    NOT NULL,
        updated_at          TEXT    NOT NULL,
        is_synced           INTEGER NOT NULL DEFAULT 0,
        sync_action         TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at           TEXT,
        FOREIGN KEY (id_event)    REFERENCES animal_events(id),
        FOREIGN KEY (id_lot_dest) REFERENCES ranch_lots(id)
      )`);

      await fixDanglingEventFk(db, 'fattening_entries', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        id_lot_dest     TEXT,
        system_type     TEXT    NOT NULL CHECK(system_type IN ('field','feedlot')),
        initial_weight  REAL,
        notes           TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id),
        FOREIGN KEY (id_lot_dest) REFERENCES ranch_lots(id)
      )`);

      await fixDanglingEventFk(db, 'animal_exits', (n) => `CREATE TABLE ${n} (
        id          TEXT    PRIMARY KEY,
        server_id   TEXT,
        id_event    TEXT    NOT NULL,
        reason      TEXT    NOT NULL CHECK(reason IN ('death','discard','loss','other')),
        notes       TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL,
        is_synced   INTEGER NOT NULL DEFAULT 0,
        sync_action TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at   TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id)
      )`);

      await fixDanglingEventFk(db, 'vaccinations', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        vaccine_name    TEXT    NOT NULL,
        dose            TEXT,
        responsible     TEXT,
        notes           TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id)
      )`);

      await fixDanglingEventFk(db, 'treatments', (n) => `CREATE TABLE ${n} (
        id                  TEXT    PRIMARY KEY,
        server_id           TEXT,
        id_event            TEXT    NOT NULL,
        illness             TEXT,
        medication          TEXT    NOT NULL,
        dose                TEXT,
        duration_days       INTEGER,
        withdrawal_days     INTEGER,
        withdrawal_end_date TEXT,
        responsible         TEXT,
        notes               TEXT,
        created_at          TEXT    NOT NULL,
        updated_at          TEXT    NOT NULL,
        is_synced           INTEGER NOT NULL DEFAULT 0,
        sync_action         TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at           TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id)
      )`, [`CREATE INDEX IF NOT EXISTS idx_treatments_withdrawal ON treatments(withdrawal_end_date)`]);

      await fixDanglingEventFk(db, 'health_incidents', (n) => `CREATE TABLE ${n} (
        id              TEXT    PRIMARY KEY,
        server_id       TEXT,
        id_event        TEXT    NOT NULL,
        incident_type   TEXT    NOT NULL CHECK(incident_type IN ('illness_detected','quarantine')),
        description     TEXT,
        resolved_at     TEXT,
        notes           TEXT,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL,
        is_synced       INTEGER NOT NULL DEFAULT 0,
        sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
        synced_at       TEXT,
        FOREIGN KEY (id_event) REFERENCES animal_events(id)
      )`);
    },
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return;

  // Bug real encontrado 2026-08-17 (Android físico, "FOREIGN KEY constraint failed" en v2):
  // varias migraciones (v2, v4) reconstruyen tablas referenciadas por FK desde otras
  // tablas (RENAME/CREATE/INSERT/DROP) — SQLite documenta que este tipo de cirugía de
  // schema requiere `PRAGMA foreign_keys=OFF` primero (ver "Making Other Kinds Of Table
  // Schema Changes" en la doc de SQLite). No lo hacíamos: `foreign_keys=ON` se setea una
  // sola vez al abrir la DB (database.ts) y quedaba activo durante toda la migración —
  // en iOS no explotó, en este Android sí. El toggle va ACÁ, fuera de los
  // `withTransactionAsync` de cada migración individual, porque `PRAGMA foreign_keys` es
  // no-op si se cambia dentro de una transacción activa (documentado por SQLite).
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    for (const migration of pending) {
      try {
        await db.withTransactionAsync(async () => {
          await migration.up(db);
        });
        await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      } catch (err) {
        // Diagnóstico 2026-08-10: un error acá era casi imposible de investigar en
        // dispositivos a los que no tenemos acceso directo al archivo SQLite (ver
        // caso real: mismo error en simulador vs. celular físico vía Expo Go, cada
        // uno con su propia base local). Adjuntar el estado real del schema en el
        // momento exacto del fallo — antes de que la transacción se pierda — para
        // que el próximo error traiga la evidencia puesta en vez de tener que
        // reproducirlo con acceso al dispositivo.
        let diagnostics = 'no se pudo recolectar diagnóstico adicional';
        try {
          const tables = await db.getAllAsync<{ name: string }>(
            `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
          );
          diagnostics = `tablas actuales (${tables.length}): ${tables.map((t) => t.name).join(', ')}`;
        } catch { /* si esto también falla, seguimos con el mensaje genérico */ }

        const original = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Migración v${migration.version} ("${migration.description.slice(0, 60)}...") falló ` +
          `partiendo de user_version=${currentVersion}. Error original: ${original}. ${diagnostics}`
        );
      }
    }

    // Diagnóstico: si queda algún dato realmente huérfano (no solo texto de FK, que ya
    // arregla la v4), que aparezca acá como warning en vez de explotar más adelante en
    // un INSERT/UPDATE cualquiera sin ninguna pista de dónde viene.
    const violations = await db.getAllAsync<{ table: string }>('PRAGMA foreign_key_check');
    if (violations.length > 0) {
      console.warn('[migrations] foreign_key_check encontró violaciones tras migrar:', violations);
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
