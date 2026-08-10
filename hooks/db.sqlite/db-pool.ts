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
    if (_db) {
        console.log('[db-pool] getDb: devolviendo instancia cacheada (sin re-init)');
        return _db;
    }

    // Evitar inicializaciones paralelas (race condition en startup)
    if (_initPromise) {
        console.log('[db-pool] getDb: init ya en curso, esperando la misma promesa');
        return _initPromise;
    }

    console.log('[db-pool] getDb: sin cache, arrancando initDatabase()');

    // Si initDatabase() falla, hay que limpiar _initPromise también en el catch —
    // dejarlo seteado a una promesa rechazada la deja "pegada" ahí para siempre,
    // así que cualquier getDb() posterior (ej. al guardar un pesaje) revienta con
    // el mismo error indefinidamente, aunque la causa haya sido transitoria (bug
    // real encontrado 2026-08-10: un fallo de migración en el primer intento
    // dejaba el resto de la sesión de la app completamente rota sin forma de
    // reintentar sin cerrar y reabrir la app entera).
    _initPromise = initDatabase()
        .then((db) => {
            _db = db;
            _initPromise = null;
            return db;
        })
        .catch((err) => {
            _initPromise = null;
            throw err;
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