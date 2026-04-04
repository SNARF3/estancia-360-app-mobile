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
  10: { name: 'Toro', sex: 'M' },
  11: { name: 'Novillo', sex: 'M' },
} as const;

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
    id_user         TEXT    NOT NULL,
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
    system_type     TEXT    NOT NULL CHECK(system_type IN ('field','feedlot')),
    initial_weight  REAL,
    notes           TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event) REFERENCES animal_events(id)
  )`,

  // Alimentación — nivel de lote (tiene su propio is_synced desde el diseño)
  `CREATE TABLE IF NOT EXISTS feed_records (
    id          TEXT    PRIMARY KEY,
    server_id   TEXT,
    id_lot      TEXT    NOT NULL,
    id_user     TEXT    NOT NULL,
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

  `CREATE TABLE IF NOT EXISTS animal_purchases (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    supplier        TEXT,
    origin          TEXT,
    purchase_price  REAL,
    price_per_kg    REAL,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event) REFERENCES animal_events(id)
  )`,

  `CREATE TABLE IF NOT EXISTS animal_sales (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    buyer           TEXT,
    destination     TEXT,
    sale_price      REAL,
    price_per_kg    REAL,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event) REFERENCES animal_events(id)
  )`,

  `CREATE TABLE IF NOT EXISTS animal_transfers (
    id              TEXT    PRIMARY KEY,
    server_id       TEXT,
    id_event        TEXT    NOT NULL,
    id_lot_origin   TEXT    NOT NULL,
    id_lot_dest     TEXT    NOT NULL,
    reason          TEXT    CHECK(reason IN ('management','breeding','rearing','fattening','health')),
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    is_synced       INTEGER NOT NULL DEFAULT 0,
    sync_action     TEXT    NOT NULL DEFAULT 'INSERT',
    synced_at       TEXT,
    FOREIGN KEY (id_event)      REFERENCES animal_events(id),
    FOREIGN KEY (id_lot_origin) REFERENCES ranch_lots(id),
    FOREIGN KEY (id_lot_dest)   REFERENCES ranch_lots(id)
  )`,

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

  // ─── Cola de sync (log de operaciones pendientes en orden) ────────────────
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT    NOT NULL,
    record_id   TEXT    NOT NULL,
    action      TEXT    NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
    payload     TEXT    NOT NULL,   -- JSON del registro completo
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_queue_table ON sync_queue(table_name, record_id)`,

  // Semilla de razas por defecto
  `INSERT OR IGNORE INTO animal_breeds (id, name, is_active) VALUES (1, 'VACA', 1)`,
];

// ─── Inicialización ───────────────────────────────────────────────────────────

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('estancia360.db');

  // WAL mode: mejor performance en lecturas/escrituras concurrentes
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA synchronous = NORMAL;');

  // Ejecutar DDL en transacción
  await db.withTransactionAsync(async () => {
    for (const stmt of DDL_STATEMENTS) {
      await db.execAsync(stmt);
    }
  });

  return db;
}