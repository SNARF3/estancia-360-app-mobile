/**
 * sync.ts
 * Estancia360 — Sincronización offline → servidor
 *
 * Estrategia:
 *   1. Al crear/modificar cualquier registro local: is_synced=0, sync_action=INSERT|UPDATE|DELETE
 *   2. Cuando hay internet: syncAll() recorre TODAS las tablas con is_synced=0
 *      y las envía al servidor en orden (respetando FKs: pastures → lots → animals → events → detalles)
 *   3. El servidor devuelve el server_id → lo guardamos en server_id
 *   4. Marcamos is_synced=1, sync_action=null
 *
 * El orden de sync es crítico por las foreign keys del servidor Postgres.
 */

import NetInfo from '@react-native-community/netinfo';
import { SQLiteBindValue } from 'expo-sqlite';
import { getDb } from './db-pool';
import { now } from './db-utils';

// ─── Configuración ────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.estancia360.com';

// Orden de sincronización (respeta dependencias FK del servidor)
const SYNC_ORDER: SyncTableConfig[] = [
    { table: 'ranch_pastures', endpoint: '/sync/pastures' },
    { table: 'ranch_lots', endpoint: '/sync/lots' },
    { table: 'ranch_animals', endpoint: '/sync/animals' },
    { table: 'animal_declared_history', endpoint: '/sync/animal-history' },
    { table: 'animal_events', endpoint: '/sync/events' },
    // Detalles (dependen de animal_events)
    { table: 'breeding_services', endpoint: '/sync/breeding-services' },
    { table: 'gestation_diagnoses', endpoint: '/sync/gestation-diagnoses' },
    { table: 'parturitions', endpoint: '/sync/parturitions' },
    { table: 'weanings', endpoint: '/sync/weanings' },
    { table: 'weight_records', endpoint: '/sync/weight-records' },
    { table: 'rearing_selections', endpoint: '/sync/rearing-selections' },
    { table: 'fattening_entries', endpoint: '/sync/fattening-entries' },
    { table: 'feed_records', endpoint: '/sync/feed-records' },
    { table: 'animal_purchases', endpoint: '/sync/purchases' },
    { table: 'animal_sales', endpoint: '/sync/sales' },
    { table: 'animal_transfers', endpoint: '/sync/transfers' },
    { table: 'animal_exits', endpoint: '/sync/exits' },
    { table: 'vaccinations', endpoint: '/sync/vaccinations' },
    { table: 'treatments', endpoint: '/sync/treatments' },
    { table: 'health_incidents', endpoint: '/sync/health-incidents' },
];

interface SyncTableConfig {
    table: string;
    endpoint: string;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SyncResult {
    success: boolean;
    synced: number;   // registros sincronizados exitosamente
    failed: number;   // registros que fallaron
    errors: SyncError[];
}

interface SyncError {
    table: string;
    id: string;
    error: string;
}

// ─── Utilidades internas ──────────────────────────────────────────────────────

/** Retorna el token JWT del usuario logueado (almacenado en SecureStore o similar) */
async function getAuthToken(): Promise<string> {
    // Implementar según tu store de autenticación (SecureStore, Zustand, etc.)
    // Ejemplo con expo-secure-store:
    // const { default: SecureStore } = await import('expo-secure-store');
    // return await SecureStore.getItemAsync('auth_token') ?? '';
    throw new Error('getAuthToken: implementar con tu store de auth');
}

async function apiFetch(endpoint: string, body: object): Promise<{ server_id: string }[]> {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res.json() as Promise<{ server_id: string }[]>;
}

// ─── Sincronización de una tabla ──────────────────────────────────────────────

/**
 * Sincroniza todos los registros pendientes de una tabla.
 * Envía en lotes de 50 registros para no saturar el servidor.
 */
async function syncTable(config: SyncTableConfig): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];
    let synced = 0;
    const BATCH_SIZE = 50;

    while (true) {
        // Obtener siguiente lote de pendientes
        const rows = await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM ${config.table} WHERE is_synced = 0 LIMIT ?`,
            [BATCH_SIZE]
        );

        if (rows.length === 0) break;

        try {
            // Enviar lote al servidor
            const serverResults = await apiFetch(config.endpoint, { records: rows });

            // Procesar respuesta: actualizar server_id y marcar como sincronizado
            await db.withTransactionAsync(async () => {
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const result = serverResults[i];
                    await db.runAsync(
                        `UPDATE ${config.table}
             SET is_synced   = 1,
                 server_id   = ?,
                 synced_at   = ?,
                 sync_action = NULL
             WHERE id = ?`,
                        [result?.server_id ?? null, now(), row.id as string]
                    );
                    synced++;
                }
            });
        } catch (err) {
            // Si el lote falla, intentar registro a registro para aislar el problema
            for (const row of rows) {
                try {
                    const singleResult = await apiFetch(config.endpoint, { records: [row] });
                    await db.runAsync(
                        `UPDATE ${config.table}
             SET is_synced   = 1,
                 server_id   = ?,
                 synced_at   = ?,
                 sync_action = NULL
             WHERE id = ?`,
                        [singleResult[0]?.server_id ?? null, now(), row.id as string]
                    );
                    synced++;
                } catch (singleErr) {
                    errors.push({
                        table: config.table,
                        id: row.id as string,
                        error: singleErr instanceof Error ? singleErr.message : String(singleErr),
                    });
                    // No marcamos como synced, se reintentará en el próximo sync
                }
            }
        }
    }

    return { synced, errors };
}

// ─── Sync completo ────────────────────────────────────────────────────────────

/**
 * Sincroniza TODOS los registros pendientes.
 * Respeta el orden de tablas para mantener integridad referencial en el servidor.
 *
 * Uso típico:
 *   - Al conectarse a internet (listener de NetInfo)
 *   - Al abrir la app
 *   - Botón manual "Sincronizar ahora"
 */
export async function syncAll(): Promise<SyncResult> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
        return { success: false, synced: 0, failed: 0, errors: [{ table: 'network', id: '', error: 'Sin conexión a internet' }] };
    }

    let totalSynced = 0;
    const allErrors: SyncError[] = [];

    for (const config of SYNC_ORDER) {
        const { synced, errors } = await syncTable(config);
        totalSynced += synced;
        allErrors.push(...errors);
    }

    // Actualizar last_sync en sesión local
    if (allErrors.length === 0) {
        const db = await getDb();
        await db.runAsync(`UPDATE local_session SET last_sync = ? WHERE id = 1`, [now()]);
    }

    return {
        success: allErrors.length === 0,
        synced: totalSynced,
        failed: allErrors.length,
        errors: allErrors,
    };
}

// ─── Contador de pendientes ───────────────────────────────────────────────────

/** Retorna cuántos registros hay pendientes de sincronizar (útil para badge en UI) */
export async function getPendingCount(): Promise<number> {
    const db = await getDb();
    let total = 0;

    for (const config of SYNC_ORDER) {
        const row = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${config.table} WHERE is_synced = 0`
        );
        total += row?.count ?? 0;
    }

    return total;
}

// ─── Pull del servidor (descarga datos actualizados) ─────────────────────────

/**
 * Descarga datos del servidor y los aplica localmente.
 * Solo aplica a registros donde server_id ya existe (actualizaciones remotas).
 *
 * NOTA: El conflicto se resuelve con "servidor gana" (last-write-wins del server).
 * Si el registro local no está sincronizado (is_synced=0), se preserva el local
 * y se programa sync en el próximo ciclo.
 */
export async function pullFromServer(id_ranch: string): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const token = await getAuthToken();
    const db = await getDb();

    // Obtener timestamp del último sync para pedir solo cambios recientes
    const session = await db.getFirstAsync<{ last_sync: string | null }>(
        `SELECT last_sync FROM local_session WHERE id = 1`
    );
    const since = session?.last_sync ?? '1970-01-01T00:00:00.000Z';

    const res = await fetch(
        `${API_BASE_URL}/sync/pull?id_ranch=${id_ranch}&since=${encodeURIComponent(since)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return;

    const data = await res.json() as Record<string, unknown[]>;

    await db.withTransactionAsync(async () => {
        // Por cada tabla, hacer UPSERT solo de registros ya sincronizados
        // (is_synced=1 significa que el local ya llegó al servidor, es seguro sobreescribir)
        for (const [table, records] of Object.entries(data)) {
            for (const record of records as Record<string, unknown>[]) {
                // Solo actualizar si el local ya está sincronizado o no existe
                const existing = await db.getFirstAsync<{ is_synced: number }>(
                    `SELECT is_synced FROM ${table} WHERE server_id = ?`,
                    [record.id as String] as SQLiteBindValue[]
                );

                if (!existing) {
                    // Registro nuevo del servidor → insertar con is_synced=1
                    const cols = Object.keys(record).join(', ');
                    const placeholders = Object.keys(record).map(() => '?').join(', ');
                    await db.runAsync(
                        `INSERT OR IGNORE INTO ${table} (server_id, is_synced, ${cols}) VALUES (?, 1, ${placeholders})`,
                        [record.id as String, ...Object.values(record)] as SQLiteBindValue[]
                    );
                } else if (existing.is_synced === 1) {
                    // Actualizar solo si ya está en sync (no pisamos cambios locales pendientes)
                    const updates = Object.keys(record)
                        .filter(k => k !== 'id')
                        .map(k => `${k} = ?`).join(', ');
                    await db.runAsync(
                        `UPDATE ${table} SET ${updates}, is_synced = 1 WHERE server_id = ?`,
                        [...Object.values(record).slice(1), record.id] as SQLiteBindValue[]
                    );
                }
                // Si is_synced=0 → tiene cambios locales pendientes → no tocar
            }
        }
    });
}

// ─── Listener automático de conectividad ──────────────────────────────────────

let _unsubscribe: (() => void) | null = null;

/**
 * Activa sincronización automática cuando se detecta conexión a internet.
 * Llamar al iniciar la app. Llamar a stopAutoSync() al desmontar.
 */
export function startAutoSync(onResult?: (result: SyncResult) => void): void {
    _unsubscribe = NetInfo.addEventListener(async (state) => {
        if (state.isConnected && state.isInternetReachable) {
            const result = await syncAll();
            onResult?.(result);
        }
    });
}

export function stopAutoSync(): void {
    _unsubscribe?.();
    _unsubscribe = null;
}