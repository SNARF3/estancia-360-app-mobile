/**
 * database.ts
 * Estancia360 — SQLite local para React Native
 *
 * Tablas incluidas: solo las del negocio operativo.
 * Catálogos geográficos (countries/regions/cities) NO se almacenan
 * localmente — se resuelven con id_city referenciado directamente.
 * Catálogos de sistema (roles, ranch_roles, etc.) se embeben como
 * constantes TypeScript para no ocupar espacio en SQLite.
 *
 * Dependencias:
 *   expo-sqlite (>= 14.x) con API async
 *   npm install expo-sqlite
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { runMigrations, LATEST_SCHEMA_VERSION } from './migrations';

// ─── Constantes de catálogos fijos (evitan tablas innecesarias en SQLite) ────

export const PRODUCTION_TYPES = {
  CRIA: 1,
  RECRIA: 2,
  ENGORDE: 3,
} as const;

export const PRODUCTIVE_STATUSES = {
  CRIA: 1,
  RECRIA: 2,
  ENGORDE: 3,
  BAJA: 4,
} as const;

export const ANIMAL_STATUSES = {
  ACTIVO: 1,
  OBSERVACION: 2,
  INACTIVO: 3,
  PENDIENTE_MOVIMIENTO: 4,
  VENDIDO: 5,
} as const;

export const EVENT_TYPES = {
  SERVICIO: 1,
  DIAGNOSTICO: 2,
  PARTO: 3,
  DESTETE: 4,
  PESO: 5,
  SELECCION_RECRIA: 6,
  COMPRA: 7,
  VENTA: 8,
  TRANSFERENCIA: 9,
  SALIDA: 10,
  VACUNACION: 11,
  TRATAMIENTO: 12,
  INCIDENTE: 13,
  ENTRADA_ENGORDE: 14,
  CAMBIO_PROCESO: 15,
} as const;

export const RANCH_ROLES = {
  DUENO: 1,
  TRABAJADOR: 2,
  ADMINISTRADOR: 3,
} as const;

export const ANIMAL_CLASSES = {
  1: { name: 'Ternera', sex: 'F' },
  2: { name: 'Ternero Macho Entero', sex: 'M' },
  3: { name: 'Ternero Macho Castrado', sex: 'M' },
  4: { name: 'Hembra Destetada', sex: 'F' },
  5: { name: 'Macho Entero Destetado', sex: 'M' },
  6: { name: 'Macho Castrado Destetado', sex: 'M' },
  7: { name: 'Vaquilla', sex: 'F' },
  8: { name: 'Vaca', sex: 'F' },
  9: { name: 'Hembra Esterilizada', sex: 'F' },
  10: { name: 'Torillo', sex: 'M' },
  11: { name: 'Novillo', sex: 'M' },
} as const;

// Catálogo real de razas (backend: db-estancia-360/schema/catalog/animal-breeds/data.sql)
export const BREED_SEEDS: [number, string][] = [
  [1, 'Criollo Boliviano'],
  [2, 'Nelore'],
  [3, 'Brahman'],
  [4, 'Senepol'],
  [5, 'Sindi'],
  [6, 'Holstein'],
  [7, 'Pardo Suizo'],
  [8, 'Jersey'],
  [9, 'Mestizo'],
];

// ─── Schema DDL ───────────────────────────────────────────────────────────────

/**
 * NOTA sobre IDs en SQLite offline:
 * Usamos TEXT con UUID v4 como PK para evitar colisiones al sincronizar
 * con el servidor Postgres (que usa SERIAL/BIGSERIAL). Al sincronizar,
 * el servidor devuelve el id_server y lo guardamos en *_server_id.
 *
 * Campos de sync en TODAS las tablas transaccionales:
 *   is_synced      INTEGER DEFAULT 0   — 0=pendiente, 1=sincronizado
 *   server_id      TEXT                — ID asignado por el servidor tras sync
 *   sync_action    TEXT                — 'INSERT' | 'UPDATE' | 'DELETE'
 *   synced_at      TEXT                — timestamp ISO cuando se sincronizó
 */

const DDL_STATEMENTS = [

  // ── Configuración de la estancia local (1 registro) ──────────────────────
  // Guarda qué estancia está activa en este dispositivo y el usuario logueado
  `CREATE TABLE IF NOT EXISTS local_session (
    id              INTEGER PRIMARY KEY,   -- siempre 1
    id_ranch        TEXT    NOT NULL,      -- UUID del ranch activo
    id_user         TEXT    NOT NULL,      -- UUID del usuario logueado
    id_role         INTEGER NOT NULL,      -- ranch_role del usuario en este ranch
    ranch_name      TEXT    NOT NULL,
    user_fullname   TEXT    NOT NULL,
    production_types TEXT   NOT NULL,      -- JSON array: [1,2,3]
    last_sync       TEXT                   -- ISO timestamp último sync exitoso
  )`,

  // ── Potreros ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS ranch_pastures (
    id              TEXT    PRIMARY KEY,   -- UUID local
    server_id       TEXT,                  -- ID del servidor tras sync
    id_ranch        TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    area_hectares   REAL    NOT NULL,
    description     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_pastures_ranch ON ranch_pastures(id_ranch)`,

  // ── Lotes ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS ranch_lots (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_ranch        TEXT    NOT NULL,
    id_ranch_pasture TEXT   NOT NULL,
    name            TEXT    NOT NULL,
    lot_type        TEXT    CHECK(lot_type IN ('cria','recria','engorde','reproductiva','general')),
    capacity        INTEGER,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_ranch_pasture) REFERENCES ranch_pastures(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_lots_pasture ON ranch_lots(id_ranch_pasture)`,
  `CREATE INDEX IF NOT EXISTS idx_lots_ranch   ON ranch_lots(id_ranch)`,

  // ── Razas (catálogo local, puede recibir nuevas del servidor) ─────────────
  `CREATE TABLE IF NOT EXISTS animal_breeds (
    id              INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1
  )`,

  // ── Clases de animales (catálogo gestionado por el ganadero) ─────────────
  `CREATE TABLE IF NOT EXISTS animal_classes (
    id                        INTEGER PRIMARY KEY,
    name                      TEXT    NOT NULL,
    sex                       TEXT    CHECK(sex IN ('M','F','any')),
    default_productive_status INTEGER NOT NULL DEFAULT 1,
    is_active                 INTEGER NOT NULL DEFAULT 1
  )`,

  // ── Animales ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS ranch_animals (
    id                  TEXT    PRIMARY KEY,
    server_id           TEXT,
    id_mother           TEXT,
    id_father           TEXT,
    id_ranch            TEXT    NOT NULL,
    id_breed            INTEGER NOT NULL DEFAULT 1,
    id_status           INTEGER NOT NULL DEFAULT 1,   -- animal_statuses
    id_productive_status INTEGER NOT NULL DEFAULT 1,  -- productive_statuses
    id_animal_class     INTEGER NOT NULL,
    id_lot              TEXT,
    code                TEXT    NOT NULL,
    birthdate           TEXT    NOT NULL,             -- ISO date
    weight              REAL,
    sex                 TEXT    NOT NULL CHECK(sex IN ('M','F')),
    origin              TEXT,
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL,
    is_synced           INTEGER NOT NULL DEFAULT 0,
    sync_action         TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at           TEXT,
    FOREIGN KEY (id_lot)    REFERENCES ranch_lots(id),
    FOREIGN KEY (id_mother) REFERENCES ranch_animals(id),
    FOREIGN KEY (id_father) REFERENCES ranch_animals(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_animals_ranch  ON ranch_animals(id_ranch)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_lot    ON ranch_animals(id_lot)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_status ON ranch_animals(id_productive_status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_code ON ranch_animals(id_ranch, code)`,

  // ── Historial declarado (pre-ingreso al sistema) ───────────────────────────
  `CREATE TABLE IF NOT EXISTS animal_declared_history (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_ranch_animal TEXT    NOT NULL,
    prev_births_count       INTEGER,
    prev_last_birth_year    INTEGER,
    prev_avg_weaning_weight REAL,
    notes           TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_ranch_animal) REFERENCES ranch_animals(id)
  )`,

  // ── Eventos (tabla pivot central) ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS animal_events (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_user         TEXT,                  -- nullable: eventos descargados pueden ser de otro usuario no espejado localmente
    id_ranch_animal TEXT    NOT NULL,
    id_event_type   INTEGER NOT NULL,
    notes           TEXT,
    event_date      TEXT    NOT NULL,   -- ISO timestamp
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_ranch_animal) REFERENCES ranch_animals(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_events_animal ON animal_events(id_ranch_animal)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type   ON animal_events(id_event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_events_synced ON animal_events(is_synced)`,

  // ─── MÓDULO CRÍA ──────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS breeding_services (
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
  )`,

  `CREATE TABLE IF NOT EXISTS gestation_diagnoses (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    id_service      TEXT    NOT NULL,
    method          TEXT    NOT NULL CHECK(method IN ('palpation','ultrasound')),
    result          TEXT    NOT NULL CHECK(result IN ('pregnant','empty')),
    gestation_days  INTEGER,
    estimated_birth TEXT,   -- ISO date
    veterinarian    TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event)   REFERENCES animal_events(id),
    FOREIGN KEY (id_service) REFERENCES breeding_services(id)
  )`,

  `CREATE TABLE IF NOT EXISTS parturitions (
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
  )`,

  `CREATE TABLE IF NOT EXISTS weanings (
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
  )`,

  // ─── MÓDULO RECRÍA / ENGORDE ───────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS weight_records (
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
  )`,

  `CREATE TABLE IF NOT EXISTS rearing_selections (
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
  )`,

  `CREATE TABLE IF NOT EXISTS fattening_entries (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    id_lot_dest     TEXT,                  -- lote de engorde destino; ver migrations.ts v3
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
  )`,

  // Alimentación — nivel de lote (tiene su propio is_synced desde el diseño)
  `CREATE TABLE IF NOT EXISTS feed_records (
    id          TEXT    PRIMARY KEY,
    server_id   TEXT,
    id_lot      TEXT    NOT NULL,
    id_user     TEXT,                  -- nullable: registros descargados pueden ser de otro usuario no espejado localmente
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

  `CREATE INDEX IF NOT EXISTS idx_feed_lot  ON feed_records(id_lot)`,
  `CREATE INDEX IF NOT EXISTS idx_feed_date ON feed_records(feed_date)`,

  // ─── MÓDULO MOVIMIENTOS ────────────────────────────────────────────────────
  // Batch-first, matching el backend real: un movements agrupa N movement_animals
  // con cabecera compartida (comprador/precio/fecha). Reemplaza animal_purchases/
  // animal_sales/animal_transfers (ver migrations.ts v1 para instalaciones viejas).

  `CREATE TABLE IF NOT EXISTS movements (
    id                TEXT    PRIMARY KEY,
    server_id         TEXT,
    id_ranch          TEXT    NOT NULL,
    movement_type     TEXT    NOT NULL CHECK(movement_type IN ('sale','purchase','pasture_transfer','ranch_exit')),
    status            TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
    movement_date     TEXT    NOT NULL,
    counterpart_name  TEXT,
    origin_name       TEXT,
    total_price       REAL,
    price_per_kg      REAL,
    notes             TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL,
    is_synced         INTEGER NOT NULL DEFAULT 0,
    sync_action       TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at         TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_movements_ranch  ON movements(id_ranch)`,
  `CREATE INDEX IF NOT EXISTS idx_movements_status ON movements(status)`,

  `CREATE TABLE IF NOT EXISTS movement_animals (
    id                      TEXT    PRIMARY KEY,
    server_id               TEXT,
    id_movement             TEXT    NOT NULL,
    id_ranch_animal         TEXT,             -- NULL en purchase hasta que el server cree el animal y devuelva server_id
    id_lot_origin           TEXT,
    id_lot_dest             TEXT,
    prev_id_status          INTEGER,
    status                  TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','confirmed')),
    -- id_event: NULL mientras status='pending' (venta sin confirmar); se completa al
    -- crear el animal_event local (compra/traslado/salida directos, o venta al confirmar).
    -- Necesario para que markLinkedEventsAsSynced() pueda marcar el evento como sincronizado.
    id_event                TEXT,
    notes                   TEXT,
    -- Solo para purchase: datos del animal nuevo (no existe en ranch_animals hasta confirmar)
    new_code                TEXT,
    new_sex                 TEXT    CHECK(new_sex IN ('M','F')),
    new_id_breed            INTEGER,
    new_id_animal_class     INTEGER,
    new_birthdate           TEXT,
    new_weight              REAL,
    new_id_lot              TEXT,
    new_id_productive_status INTEGER,
    created_at              TEXT    NOT NULL,
    updated_at              TEXT    NOT NULL,
    is_synced                INTEGER NOT NULL DEFAULT 0,
    sync_action              TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at                TEXT,
    FOREIGN KEY (id_movement)     REFERENCES movements(id),
    FOREIGN KEY (id_ranch_animal) REFERENCES ranch_animals(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_movement_animals_movement ON movement_animals(id_movement)`,
  `CREATE INDEX IF NOT EXISTS idx_movement_animals_animal   ON movement_animals(id_ranch_animal)`,

  `CREATE TABLE IF NOT EXISTS animal_exits (
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
  )`,

  // ─── MÓDULO SANIDAD ────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS vaccinations (
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
  )`,

  `CREATE TABLE IF NOT EXISTS treatments (
    id                  TEXT    PRIMARY KEY,
    server_id           TEXT,
    id_event            TEXT    NOT NULL,
    illness             TEXT,
    medication          TEXT    NOT NULL,
    dose                TEXT,
    duration_days       INTEGER,
    withdrawal_days     INTEGER,
    withdrawal_end_date TEXT,   -- ISO date
    responsible         TEXT,
    notes               TEXT,
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL,
    is_synced           INTEGER NOT NULL DEFAULT 0,
    sync_action         TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at           TEXT,
    FOREIGN KEY (id_event) REFERENCES animal_events(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_treatments_withdrawal ON treatments(withdrawal_end_date)`,

  `CREATE TABLE IF NOT EXISTS health_incidents (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    incident_type   TEXT    NOT NULL CHECK(incident_type IN ('illness_detected','quarantine')),
    description     TEXT,
    resolved_at     TEXT,   -- ISO date
    notes           TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event) REFERENCES animal_events(id)
  )`,

];

// Seed clases por defecto (INSERT OR IGNORE — no sobreescribe si ya existen)
const CLASS_SEEDS: [number, string, string, number][] = [
  [1,  'Ternera',                  'F',   1],
  [2,  'Ternero Macho Entero',     'M',   1],
  [3,  'Ternero Macho Castrado',   'M',   1],
  [4,  'Hembra Destetada',         'F',   2],
  [5,  'Macho Entero Destetado',   'M',   2],
  [6,  'Macho Castrado Destetado', 'M',   2],
  [7,  'Vaquilla',                 'F',   2],
  [8,  'Vaca',                     'F',   1],
  [9,  'Hembra Esterilizada',      'F',   1],
  [10, 'Torillo',                  'M',   1],
  [11, 'Novillo',                  'M',   3],
];

async function seedCatalogs(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [id, name, sex, ps] of CLASS_SEEDS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO animal_classes (id, name, sex, default_productive_status, is_active) VALUES (?,?,?,?,1)`,
        [id, name, sex, ps]
      );
    }
    for (const [id, name] of BREED_SEEDS) {
      await db.runAsync(`INSERT OR IGNORE INTO animal_breeds (id, name, is_active) VALUES (?,?,1)`, [id, name]);
    }
  });
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  console.log('[db] opening...');
  const db = await SQLite.openDatabaseAsync('estancia360.db');
  console.log('[db] opened');

  // WAL mode: mejor performance en lecturas/escrituras concurrentes — pero el backend
  // WASM de SQLite en web (wa-sqlite, sin acceso a archivos compartidos) no lo soporta
  // bien: en vez de fallar, la promesa de execAsync queda colgada para siempre y la app
  // nunca sale de "Inicializando...". Nativo (iOS/Android) sí lo soporta normalmente.
  if (Platform.OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    console.log('[db] WAL set');
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
  console.log('[db] foreign_keys set');
  await db.execAsync('PRAGMA synchronous = NORMAL;');
  console.log('[db] synchronous set');

  const existingTables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  console.log('[db] existingTables', existingTables.length);
  const isFreshInstall = existingTables.length === 0;

  // DDL siempre corre — CREATE TABLE/INDEX IF NOT EXISTS es un no-op en instalaciones
  // que ya tienen la tabla, y crea las tablas nuevas del baseline actual en las que
  // todavía no las tienen (instalación vieja que solo tenía las tablas de antes).
  console.log('[db] running DDL, statements:', DDL_STATEMENTS.length);
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < DDL_STATEMENTS.length; i++) {
      await db.execAsync(DDL_STATEMENTS[i]);
    }
  });
  console.log('[db] DDL done');

  if (isFreshInstall) {
    // Instalación limpia: ya nace en el baseline actual, no tiene nada que migrar.
    await db.execAsync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION}`);
    console.log('[db] fresh install, user_version set');
  } else {
    // Instalación existente: puede venir de antes de que este mecanismo existiera
    // (user_version=0 pero con datos reales) o de una versión anterior — aplicar
    // las migraciones pendientes en orden. Ver migrations.ts.
    await runMigrations(db);
    console.log('[db] migrations done');
  }

  await seedCatalogs(db);
  console.log('[db] seed done');

  return db;
}