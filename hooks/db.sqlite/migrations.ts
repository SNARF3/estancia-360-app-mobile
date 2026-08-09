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
      await db.execAsync(`ALTER TABLE animal_events RENAME TO animal_events_old`);
      await db.execAsync(`
        CREATE TABLE animal_events (
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
        )
      `);
      await db.execAsync(`INSERT INTO animal_events SELECT * FROM animal_events_old`);
      await db.execAsync(`DROP TABLE animal_events_old`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_animal ON animal_events(id_ranch_animal)`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_type   ON animal_events(id_event_type)`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_synced ON animal_events(is_synced)`);

      await db.execAsync(`ALTER TABLE feed_records RENAME TO feed_records_old`);
      await db.execAsync(`
        CREATE TABLE feed_records (
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
        )
      `);
      await db.execAsync(`INSERT INTO feed_records SELECT * FROM feed_records_old`);
      await db.execAsync(`DROP TABLE feed_records_old`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_feed_lot  ON feed_records(id_lot)`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_feed_date ON feed_records(feed_date)`);
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
      await db.execAsync(`ALTER TABLE fattening_entries ADD COLUMN id_lot_dest TEXT REFERENCES ranch_lots(id)`);
    },
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
    });
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}
