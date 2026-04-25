/**
 * db-pool.ts
 * Estancia360 — Singleton de conexión SQLite
 *
 * Expo SQLite maneja internamente el pool de conexiones, pero necesitamos
 * un singleton para no abrir múltiples instancias de la DB en la app.
 *
 * Uso:
 *   const db = await getDb();
 *   const rows = await db.getAllAsync('SELECT * FROM ranch_animals WHERE id_ranch = ?', [ranchId]);
 */

import * as SQLite from 'expo-sqlite';
import { initDatabase } from './database';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Retorna la instancia singleton de la base de datos.
 * Inicializa el schema si es la primera vez.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (_db) return _db;

    // Evitar inicializaciones paralelas (race condition en startup)
    if (_initPromise) return _initPromise;

    _initPromise = initDatabase().then((db) => {
        _db = db;
        _initPromise = null;
        return db;
    });

    return _initPromise;
}

/**
 * Cierra la conexión. Útil en tests o al hacer logout completo.
 */
export async function closeDb(): Promise<void> {
    if (_db) {
        await _db.closeAsync();
        _db = null;
    }
}

/**
 * Resetea completamente la base de datos local.
 * CUIDADO: borra todos los datos sin sincronizar.
 */
export async function resetDb(): Promise<void> {
    await closeDb();
    await SQLite.deleteDatabaseAsync('estancia360.db');
}