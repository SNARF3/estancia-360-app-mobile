/**
 * sync.ts v3 — Estancia360
 *
 * Flujo:
 *   - Toda escritura → SQLite local (is_synced=0). Siempre offline-first.
 *   - Solo cuando el usuario pulsa "Sincronizar" → syncAll() intenta conectar al servidor.
 *   - Si no hay internet, el fetch falla y se informa al usuario. Sin checks de NetInfo.
 *
 * Endpoints batch:
 *   POST {API_BASE}/estancia-360/sync/cria   — pastures, lots, animals, histories, cría
 *   POST {API_BASE}/estancia-360/sync/recria — weight records, rearing selections
 *
 * Formato de ítem: { localId, operation, serverId?, data, happenedAt? }
 * FKs no resueltas: data.localRef_{field} = localId referenciado
 * Respuesta: { [entityKey]: { [localId]: serverId } }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './db-pool';
import { now } from './db-utils';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.estancia360.com';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    errors: SyncError[];
}

export interface SyncError {
    table: string;
    id: string;
    error: string;
}

interface BatchItem {
    localId: string;
    operation: 'create' | 'update' | 'delete';
    serverId?: number | string;
    data: Record<string, unknown>;
    happenedAt?: string;
}

interface BatchEntityResponse {
    succeeded: number;
    failed: number;
    results: Array<{ localId: string; serverId?: string | number; error?: string }>;
}

type BatchResponse = {
    totalSucceeded?: number;
    totalFailed?: number;
    [key: string]: BatchEntityResponse | number | undefined;
};

// ─── Definición de tablas y sus FK fields ─────────────────────────────────────

type SyncTableConfig = {
    key: string;
    table: string;
    fkFields: string[];
    fieldDefaults?: Record<string, unknown>;
    whereExtra?: string;  // filtro adicional AND'd con is_synced=0 en la consulta
};

const CRIA_CONFIG: SyncTableConfig[] = [
    { key: 'ranchPastures',           table: 'ranch_pastures',          fkFields: [],                                              fieldDefaults: { area_hectares: 0 } },
    { key: 'ranchLots',               table: 'ranch_lots',              fkFields: ['id_ranch_pasture'] },
    { key: 'ranchAnimals',            table: 'ranch_animals',           fkFields: ['id_lot', 'id_mother', 'id_father'],            fieldDefaults: { id_animal_class: 1 } },
    { key: 'animalDeclaredHistories', table: 'animal_declared_history', fkFields: ['id_ranch_animal'] },
    { key: 'breedingServices',        table: 'breeding_services',       fkFields: ['id_event', 'id_animal_male'] },
    { key: 'gestationDiagnoses',      table: 'gestation_diagnoses',     fkFields: ['id_event', 'id_service'] },
    { key: 'parturitions',            table: 'parturitions',            fkFields: ['id_event', 'id_diagnosis', 'id_cria'] },
    { key: 'weanings',                table: 'weanings',                fkFields: ['id_event', 'id_cria', 'id_lot_dest'] },
    // Nota: CAMBIO_PROCESO (tipo 15) no va aquí porque animal_events no tiene local_id en el
    // servidor — el cambio de estado queda capturado en ranch_animals.id_productive_status.
];

const RECRIA_CONFIG: SyncTableConfig[] = [
    { key: 'weightRecords',     table: 'weight_records',      fkFields: ['id_event', 'id_lot'] },
    { key: 'rearingSelections', table: 'rearing_selections',  fkFields: ['id_event', 'id_lot_dest'] },
];

// Tablas únicas (animal_events puede aparecer en config con filtro, deduplicar)
export const ALL_TABLES = [...new Set([...CRIA_CONFIG, ...RECRIA_CONFIG].map(c => c.table))];
const META_FIELDS = new Set(['is_synced', 'server_id', 'sync_action', 'synced_at']);

// Campos que SQLite guarda como string pero el servidor espera como integer
const FORCE_INT_FIELDS = new Set(['id_ranch']);

// ─── Utilidades ───────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    console.log('[sync] token exists:', !!token);
    if (!token) throw new Error('No hay sesión activa');
    return token;
}

function isNetworkError(err: unknown): boolean {
    if (err instanceof TypeError) return true;
    if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        return msg.includes('network request failed') ||
               msg.includes('failed to fetch') ||
               msg.includes('econnrefused') ||
               msg.includes('etimedout');
    }
    return false;
}

async function apiFetch(endpoint: string, body: object): Promise<BatchResponse> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[sync] POST', url);
    const token = await getAuthToken();
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    console.log('[sync] response status:', res.status);
    if (!res.ok) {
        const text = await res.text();
        console.error('[sync] response error:', text);
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<BatchResponse>;
}

// ─── Mapa de server_ids ya conocidos ─────────────────────────────────────────

async function buildServerIdMap(): Promise<Map<string, string>> {
    const db = await getDb();
    const map = new Map<string, string>();
    for (const table of ALL_TABLES) {
        try {
            const rows = await db.getAllAsync<{ id: string; server_id: string }>(
                `SELECT id, server_id FROM ${table} WHERE server_id IS NOT NULL AND is_synced = 1`
            );
            for (const row of rows) map.set(row.id, row.server_id);
        } catch { /* tabla puede no existir */ }
    }
    console.log('[sync] serverIdMap size:', map.size);
    return map;
}

// ─── Construcción del batch ───────────────────────────────────────────────────

function snakeToCamel(key: string): string {
    return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function buildData(
    row: Record<string, unknown>,
    fkFields: string[],
    serverIdMap: Map<string, string>,
    fieldDefaults: Record<string, unknown> = {}
): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
        if (key === 'id' || META_FIELDS.has(key)) continue;
        // Aplicar default si el valor es nulo o cero en campos que tienen default
        const isMissing = value === null || value === undefined || (value === 0 && fieldDefaults[key] !== undefined);
        const effective = isMissing ? (fieldDefaults[key] ?? null) : value;
        if (effective === null || effective === undefined) continue;

        // La API NestJS usa camelCase — convertir desde snake_case de SQLite
        const camelKey = snakeToCamel(key);

        if (fkFields.includes(key)) {
            const serverId = serverIdMap.get(effective as string);
            if (serverId) {
                data[camelKey] = serverId;
            } else {
                data[`localRef_${camelKey}`] = effective;
            }
        } else {
            const finalValue = FORCE_INT_FIELDS.has(key) && typeof effective === 'string'
                ? parseInt(effective, 10)
                : effective;
            data[camelKey] = finalValue;
        }
    }
    return data;
}

const OPERATION_MAP: Record<string, 'create' | 'update' | 'delete'> = {
    INSERT: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
};

function toBatchItems(
    rows: Record<string, unknown>[],
    fkFields: string[],
    serverIdMap: Map<string, string>,
    fieldDefaults: Record<string, unknown> = {}
): BatchItem[] {
    return rows.map(row => {
        const rawServerId = row.server_id as string | null | undefined;
        const serverId = rawServerId
            ? (/^\d+$/.test(rawServerId) ? parseInt(rawServerId, 10) : rawServerId)
            : undefined;
        return {
            localId: row.id as string,
            operation: OPERATION_MAP[(row.sync_action as string) ?? 'INSERT'] ?? 'create',
            ...(serverId != null ? { serverId } : {}),
            data: buildData(row, fkFields, serverIdMap, fieldDefaults),
            happenedAt: (row.created_at ?? row.updated_at) as string | undefined,
        };
    });
}

// ─── Aplicar respuesta ────────────────────────────────────────────────────────

async function markLinkedEventsAsSynced(db: SQLiteDatabase): Promise<void> {
    const linked = [
        'breeding_services', 'gestation_diagnoses', 'parturitions', 'weanings',
        'weight_records', 'rearing_selections',
    ];
    const unions = linked
        .map(t => `SELECT id_event FROM ${t} WHERE is_synced=1 AND id_event IS NOT NULL`)
        .join(' UNION ');
    try {
        await db.runAsync(
            `UPDATE animal_events SET is_synced=1, synced_at=? WHERE id IN (${unions}) AND is_synced=0`,
            [now()]
        );
    } catch { /* ignorar si tabla no existe */ }
}

async function applyResponse(
    db: SQLiteDatabase,
    config: { key: string; table: string }[],
    response: BatchResponse,
    errors: SyncError[]
): Promise<number> {
    console.log(`[sync] server totals → succeeded:${response.totalSucceeded} failed:${response.totalFailed}`);
    let synced = 0;
    await db.withTransactionAsync(async () => {
        for (const { key, table } of config) {
            const entity = response[key] as BatchEntityResponse | undefined;
            if (!entity || !Array.isArray(entity.results)) continue;
            console.log(`[sync]   ${key}: ${entity.succeeded} ok, ${entity.failed} failed`);
            for (const item of entity.results) {
                if (item.error || item.serverId == null) {
                    console.log(`[sync]     FAIL [${item.localId?.slice(0,8)}]: ${item.error ?? 'sin serverId'}`);
                    errors.push({ table, id: item.localId ?? '', error: item.error ?? 'sin serverId en respuesta' });
                    continue;
                }
                try {
                    const result = await db.runAsync(
                        `UPDATE ${table} SET is_synced=1, server_id=?, synced_at=? WHERE id=?`,
                        [String(item.serverId), now(), item.localId]
                    );
                    if (result.changes > 0) synced++;
                } catch (err) {
                    errors.push({ table, id: item.localId, error: String(err) });
                }
            }
        }
    });
    return synced;
}

// ─── Sync de Cría ─────────────────────────────────────────────────────────────

async function getRanchId(): Promise<number> {
    const db = await getDb();
    const session = await db.getFirstAsync<{ id_ranch: string }>(
        `SELECT id_ranch FROM local_session WHERE id = 1`
    );
    const idRanch = parseInt(session?.id_ranch ?? '', 10);
    if (!idRanch || isNaN(idRanch)) throw new Error('No hay ranch activo en sesión');
    return idRanch;
}

async function syncCria(
    serverIdMap: Map<string, string>,
    onProgress?: (msg: string, pct: number) => void
): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];

    let hasPending = false;
    for (const { table } of CRIA_CONFIG) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            if ((row?.count ?? 0) > 0) { hasPending = true; break; }
        } catch { /* tabla no existe */ }
    }
    if (!hasPending) {
        console.log('[sync] syncCria → nada pendiente');
        return { synced: 0, errors: [] };
    }

    // Persistir valores por defecto en SQLite para futuras consultas locales
    try {
        const r1 = await db.runAsync(`UPDATE ranch_pastures SET area_hectares=0 WHERE area_hectares IS NULL`);
        const r2 = await db.runAsync(`UPDATE ranch_animals SET id_animal_class=1 WHERE id_animal_class IS NULL`);
        if (r1.changes > 0) console.log(`[sync] patch area_hectares: ${r1.changes} rows`);
        if (r2.changes > 0) console.log(`[sync] patch id_animal_class: ${r2.changes} rows`);
    } catch (e) { console.warn('[sync] patch error:', e); }

    onProgress?.('Preparando datos de Cría...', 15);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields, fieldDefaults, whereExtra } of CRIA_CONFIG) {
        try {
            const needsEvent = fkFields.includes('id_event');
            const extra = whereExtra ? ` AND ${needsEvent ? 't.' : ''}${whereExtra}` : '';
            const query = needsEvent
                ? `SELECT t.*, ae.id_ranch_animal FROM ${table} t LEFT JOIN animal_events ae ON ae.id = t.id_event WHERE t.is_synced = 0${extra}`
                : `SELECT * FROM ${table} WHERE is_synced = 0${extra}`;
            const effectiveFkFields = needsEvent ? [...fkFields, 'id_ranch_animal'] : fkFields;

            const rows = await db.getAllAsync<Record<string, unknown>>(query);
            if (rows.length > 0) {
                batch[key] = toBatchItems(rows, effectiveFkFields, serverIdMap, fieldDefaults);
                console.log(`[sync] cría batch ${key}: ${rows.length} registros`);
            }
        } catch (e) { console.warn(`[sync] batch error ${table}:`, e); }
    }

    if (Object.keys(batch).length === 0) return { synced: 0, errors: [] };

    console.log('[sync] cría payload:', Object.fromEntries(Object.entries(batch).map(([k, v]) => [k, v.length])));
    for (const [key, items] of Object.entries(batch)) {
        console.log(`[sync]   ${key}[0] sample:`, JSON.stringify(items[0]));
    }

    // LOG DIAGNÓSTICO — aparece después de conectar al servidor
    onProgress?.('Enviando datos de Cría...', 30);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/cria', { idRanch, ...batch });
    console.log('[sync] DIAG pasture[0] data:', JSON.stringify(batch.ranchPastures?.[0]?.data));
    console.log('[sync] DIAG animal[0] data:', JSON.stringify(batch.ranchAnimals?.[0]?.data));

    onProgress?.('Aplicando respuesta de Cría...', 45);
    const synced = await applyResponse(db, CRIA_CONFIG, response, errors);
    await markLinkedEventsAsSynced(db);

    // Actualizar el mapa con los server_ids recién obtenidos
    for (const { key, table } of CRIA_CONFIG) {
        const entity = response[key] as BatchEntityResponse | undefined;
        if (entity?.results) {
            for (const item of entity.results) {
                if (item.localId && item.serverId != null) {
                    serverIdMap.set(item.localId, String(item.serverId));
                }
            }
        }
        try {
            const rows = await db.getAllAsync<{ id: string; server_id: string }>(
                `SELECT id, server_id FROM ${table} WHERE server_id IS NOT NULL`
            );
            for (const r of rows) serverIdMap.set(r.id, r.server_id);
        } catch { /* tabla no existe */ }
    }

    return { synced, errors };
}

// ─── Sync de Recría ───────────────────────────────────────────────────────────

async function syncRecria(
    serverIdMap: Map<string, string>,
    onProgress?: (msg: string, pct: number) => void
): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];

    let hasPending = false;
    for (const { table } of RECRIA_CONFIG) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            if ((row?.count ?? 0) > 0) { hasPending = true; break; }
        } catch { /* tabla no existe */ }
    }
    if (!hasPending) {
        console.log('[sync] syncRecria → nada pendiente');
        return { synced: 0, errors: [] };
    }

    onProgress?.('Preparando datos de Recría...', 60);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields, fieldDefaults, whereExtra } of RECRIA_CONFIG) {
        try {
            const needsEvent = fkFields.includes('id_event');
            const extra = whereExtra ? ` AND ${needsEvent ? 't.' : ''}${whereExtra}` : '';
            const query = needsEvent
                ? `SELECT t.*, ae.id_ranch_animal FROM ${table} t LEFT JOIN animal_events ae ON ae.id = t.id_event WHERE t.is_synced = 0${extra}`
                : `SELECT * FROM ${table} WHERE is_synced = 0${extra}`;
            const effectiveFkFields = needsEvent ? [...fkFields, 'id_ranch_animal'] : fkFields;

            const rows = await db.getAllAsync<Record<string, unknown>>(query);
            if (rows.length > 0) {
                batch[key] = toBatchItems(rows, effectiveFkFields, serverIdMap, fieldDefaults);
                console.log(`[sync] recría batch ${key}: ${rows.length} registros`);
            }
        } catch (e) { console.warn(`[sync] batch error ${table}:`, e); }
    }

    if (Object.keys(batch).length === 0) return { synced: 0, errors: [] };

    console.log('[sync] recría payload:', Object.fromEntries(Object.entries(batch).map(([k, v]) => [k, v.length])));
    for (const [key, items] of Object.entries(batch)) {
        console.log(`[sync]   ${key}[0] sample:`, JSON.stringify(items[0]));
    }

    onProgress?.('Enviando datos de Recría...', 75);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/recria', { idRanch, ...batch });

    onProgress?.('Aplicando respuesta de Recría...', 90);
    const synced = await applyResponse(db, RECRIA_CONFIG, response, errors);
    await markLinkedEventsAsSynced(db);

    return { synced, errors };
}

// ─── syncAll — punto de entrada público ──────────────────────────────────────

/**
 * Sincroniza todos los registros pendientes con el servidor.
 * Solo llamar cuando el usuario pulsa "Sincronizar". No hacer auto-sync.
 * Si no hay internet el fetch falla y se devuelve error de red.
 */
export async function syncAll(
    onProgress?: (msg: string, pct: number) => void
): Promise<SyncResult> {
    console.log('[sync] syncAll v5 start');
    const allErrors: SyncError[] = [];
    let totalSynced = 0;

    try {
        onProgress?.('Verificando datos locales...', 5);
        const serverIdMap = await buildServerIdMap();

        const criaResult = await syncCria(serverIdMap, onProgress);
        console.log('[sync] cría:', criaResult.synced, 'synced,', criaResult.errors.length, 'errors');
        totalSynced += criaResult.synced;
        allErrors.push(...criaResult.errors);

        const recriaResult = await syncRecria(serverIdMap, onProgress);
        console.log('[sync] recría:', recriaResult.synced, 'synced,', recriaResult.errors.length, 'errors');
        totalSynced += recriaResult.synced;
        allErrors.push(...recriaResult.errors);

        onProgress?.('Finalizando...', 97);
        if (allErrors.length === 0) {
            const db = await getDb();
            await db.runAsync(`UPDATE local_session SET last_sync=? WHERE id=1`, [now()]);
        }
        onProgress?.('Completado', 100);
    } catch (err) {
        console.error('[sync] error:', err);
        const noInternet = isNetworkError(err);
        allErrors.push({
            table: noInternet ? 'network' : 'sync',
            id: '',
            error: noInternet
                ? 'Sin conexión a internet'
                : (err instanceof Error ? err.message : String(err)),
        });
    }

    console.log('[sync] done → synced:', totalSynced, 'failed:', allErrors.length);
    return {
        success: allErrors.length === 0,
        synced: totalSynced,
        failed: allErrors.length,
        errors: allErrors,
    };
}

// ─── Utilidades de estado ─────────────────────────────────────────────────────

/** Cuántos registros hay pendientes de sincronizar (para badge en SyncScreen). */
export async function getPendingCount(): Promise<number> {
    const db = await getDb();
    let total = 0;
    for (const table of ALL_TABLES) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            total += row?.count ?? 0;
        } catch { /* tabla no existe */ }
    }
    return total;
}

export interface PullResult {
    pulled: number;
    error?: string;
}

/**
 * Descarga cambios del servidor y aplica localmente.
 * fullSync=true descarga desde el inicio del tiempo — útil al cambiar de dispositivo.
 */
export async function pullFromServer(
    id_ranch: string,
    options?: { fullSync?: boolean }
): Promise<PullResult> {
    const db = await getDb();
    const token = await getAuthToken();
    const session = await db.getFirstAsync<{ last_sync: string | null }>(
        `SELECT last_sync FROM local_session WHERE id = 1`
    );
    const since = options?.fullSync
        ? '1970-01-01T00:00:00.000Z'
        : (session?.last_sync ?? '1970-01-01T00:00:00.000Z');

    try {
        const res = await fetch(
            `${API_BASE_URL}/estancia-360/sync/pull?id_ranch=${id_ranch}&since=${encodeURIComponent(since)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return { pulled: 0, error: `HTTP ${res.status}` };
        const data = await res.json() as Record<string, unknown[]>;
        let pulled = 0;
        await db.withTransactionAsync(async () => {
            for (const [table, records] of Object.entries(data)) {
                for (const record of records as Record<string, unknown>[]) {
                    const existing = await db.getFirstAsync<{ is_synced: number }>(
                        `SELECT is_synced FROM ${table} WHERE server_id = ?`,
                        [record.id as string]
                    );
                    if (!existing) {
                        const cols = Object.keys(record).join(', ');
                        const ph = Object.keys(record).map(() => '?').join(', ');
                        await db.runAsync(
                            `INSERT OR IGNORE INTO ${table} (server_id, is_synced, ${cols}) VALUES (?, 1, ${ph})`,
                            [record.id as string, ...Object.values(record)] as any
                        );
                        pulled++;
                    } else if (existing.is_synced === 1) {
                        const updates = Object.keys(record).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
                        await db.runAsync(
                            `UPDATE ${table} SET ${updates}, is_synced=1 WHERE server_id=?`,
                            [...Object.values(record).slice(1), record.id] as any
                        );
                        pulled++;
                    }
                }
            }
        });
        return { pulled };
    } catch (err) {
        return { pulled: 0, error: String(err) };
    }
}
