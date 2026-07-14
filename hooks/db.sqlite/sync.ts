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
import { newId, now } from './db-utils';

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
    {
        key: 'weightRecords',
        table: 'weight_records',
        fkFields: ['id_event', 'id_lot'],
        // Solo pesajes de animales en Recría (ps<=2); los de Engorde van por syncEngorde
        whereExtra: `t.id_event IN (SELECT ae2.id FROM animal_events ae2 JOIN ranch_animals ra ON ra.id = ae2.id_ranch_animal WHERE ra.id_productive_status <= 2)`,
    },
    { key: 'rearingSelections', table: 'rearing_selections', fkFields: ['id_event', 'id_lot_dest'] },
];

const ENGORDE_CONFIG: SyncTableConfig[] = [
    // Ingresos manuales a Engorde (sistema, peso inicial)
    { key: 'fatteningEntries', table: 'fattening_entries', fkFields: ['id_event'] },
    {
        key: 'weightRecords',
        table: 'weight_records',
        fkFields: ['id_event', 'id_lot'],
        // Solo pesajes de animales en Engorde (ps=3)
        whereExtra: `t.id_event IN (SELECT ae2.id FROM animal_events ae2 JOIN ranch_animals ra ON ra.id = ae2.id_ranch_animal WHERE ra.id_productive_status = 3)`,
    },
    // Alimentación por lote — no tiene animal_event
    { key: 'feedRecords', table: 'feed_records', fkFields: ['id_lot'] },
];

const SANIDAD_CONFIG: SyncTableConfig[] = [
    { key: 'vaccinations',    table: 'vaccinations',    fkFields: ['id_ranch_animal'] },
    { key: 'treatments',      table: 'treatments',      fkFields: ['id_ranch_animal'] },
    { key: 'healthIncidents', table: 'health_incidents', fkFields: ['id_ranch_animal'] },
];

// Queries explícitas para sanidad: id_event es FK interno y no se envía al servidor.
// Se JOIN con animal_events para obtener id_ranch_animal y event_date.
// withdrawal_end_date se excluye de treatments — el servidor lo calcula (eventDate + withdrawalDays).
const SANIDAD_QUERIES: Record<string, string> = {
    vaccinations: `
        SELECT v.id, v.server_id, v.sync_action, v.is_synced, v.created_at, v.updated_at,
               v.vaccine_name, v.dose, v.responsible, v.notes,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM vaccinations v JOIN animal_events ae ON ae.id = v.id_event
        WHERE v.is_synced = 0`,
    treatments: `
        SELECT t.id, t.server_id, t.sync_action, t.is_synced, t.created_at, t.updated_at,
               t.illness, t.medication, t.dose, t.duration_days, t.withdrawal_days,
               t.responsible, t.notes,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM treatments t JOIN animal_events ae ON ae.id = t.id_event
        WHERE t.is_synced = 0`,
    health_incidents: `
        SELECT hi.id, hi.server_id, hi.sync_action, hi.is_synced, hi.created_at, hi.updated_at,
               hi.incident_type, hi.description, hi.notes,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM health_incidents hi JOIN animal_events ae ON ae.id = hi.id_event
        WHERE hi.is_synced = 0`,
};

const MOVIMIENTOS_CONFIG: SyncTableConfig[] = [
    { key: 'animalPurchases', table: 'animal_purchases', fkFields: ['id_event'] },
    { key: 'animalSales',     table: 'animal_sales',     fkFields: ['id_event'] },
    { key: 'animalTransfers', table: 'animal_transfers',  fkFields: ['id_event', 'id_lot_origin', 'id_lot_dest'] },
    { key: 'animalExits',     table: 'animal_exits',      fkFields: ['id_event'] },
];

const MOVIMIENTOS_QUERIES: Record<string, string> = {
    animal_purchases: `
        SELECT ap.id, ap.server_id, ap.sync_action, ap.is_synced, ap.created_at, ap.updated_at,
               ap.supplier, ap.origin, ap.purchase_price, ap.price_per_kg,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM animal_purchases ap JOIN animal_events ae ON ae.id = ap.id_event
        WHERE ap.is_synced = 0`,
    animal_sales: `
        SELECT asal.id, asal.server_id, asal.sync_action, asal.is_synced, asal.created_at, asal.updated_at,
               asal.buyer, asal.destination, asal.sale_price, asal.price_per_kg,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM animal_sales asal JOIN animal_events ae ON ae.id = asal.id_event
        WHERE asal.is_synced = 0`,
    animal_transfers: `
        SELECT at2.id, at2.server_id, at2.sync_action, at2.is_synced, at2.created_at, at2.updated_at,
               at2.id_lot_origin, at2.id_lot_dest, at2.reason,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM animal_transfers at2 JOIN animal_events ae ON ae.id = at2.id_event
        WHERE at2.is_synced = 0`,
    animal_exits: `
        SELECT aex.id, aex.server_id, aex.sync_action, aex.is_synced, aex.created_at, aex.updated_at,
               aex.reason, aex.notes,
               ae.id_ranch_animal, ae.created_at AS event_date
        FROM animal_exits aex JOIN animal_events ae ON ae.id = aex.id_event
        WHERE aex.is_synced = 0`,
};

// Tablas únicas (animal_events puede aparecer en config con filtro, deduplicar)
export const ALL_TABLES = [...new Set([...CRIA_CONFIG, ...RECRIA_CONFIG, ...ENGORDE_CONFIG, ...SANIDAD_CONFIG, ...MOVIMIENTOS_CONFIG].map(c => c.table))];
const META_FIELDS = new Set(['is_synced', 'server_id', 'sync_action', 'synced_at']);

// Campos que SQLite guarda como string pero el servidor espera como integer
const FORCE_INT_FIELDS = new Set(['id_ranch']);

// ─── Utilidades ───────────────────────────────────────────────────────────────

async function refreshAuthToken(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem('sync_credentials');
        if (!raw) return;
        const { email, password } = JSON.parse(raw) as { email: string; password: string };
        const res = await fetch(`${API_BASE_URL}/estancia-360/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) { console.warn('[sync] refresh token failed:', res.status); return; }
        const data = await res.json() as { accessToken?: string };
        if (data.accessToken) {
            await AsyncStorage.setItem('access_token', data.accessToken);
            console.log('[sync] token refreshed');
        }
    } catch (e) {
        console.warn('[sync] refresh token error:', e);
    }
}

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
        'weight_records', 'rearing_selections', 'fattening_entries',
        'vaccinations', 'treatments', 'health_incidents',
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
            const extra = whereExtra ? ` AND ${whereExtra}` : '';
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

    onProgress?.('Preparando datos de Recría...', 52);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields, fieldDefaults, whereExtra } of RECRIA_CONFIG) {
        try {
            const needsEvent = fkFields.includes('id_event');
            const extra = whereExtra ? ` AND ${whereExtra}` : '';
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

    onProgress?.('Enviando datos de Recría...', 62);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/recria', { idRanch, ...batch });

    onProgress?.('Aplicando respuesta de Recría...', 68);
    const synced = await applyResponse(db, RECRIA_CONFIG, response, errors);
    await markLinkedEventsAsSynced(db);

    return { synced, errors };
}

// ─── Sync de Engorde ──────────────────────────────────────────────────────────

async function syncEngorde(
    serverIdMap: Map<string, string>,
    onProgress?: (msg: string, pct: number) => void
): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];

    let hasPending = false;
    for (const { table } of ENGORDE_CONFIG) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            if ((row?.count ?? 0) > 0) { hasPending = true; break; }
        } catch { /* tabla no existe */ }
    }
    if (!hasPending) {
        console.log('[sync] syncEngorde → nada pendiente');
        return { synced: 0, errors: [] };
    }

    onProgress?.('Preparando datos de Engorde...', 75);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields, fieldDefaults, whereExtra } of ENGORDE_CONFIG) {
        try {
            const needsEvent = fkFields.includes('id_event');
            const extra = whereExtra ? ` AND ${whereExtra}` : '';
            const query = needsEvent
                ? `SELECT t.*, ae.id_ranch_animal FROM ${table} t LEFT JOIN animal_events ae ON ae.id = t.id_event WHERE t.is_synced = 0${extra}`
                : `SELECT * FROM ${table} WHERE is_synced = 0${extra}`;
            const effectiveFkFields = needsEvent ? [...fkFields, 'id_ranch_animal'] : fkFields;

            const rows = await db.getAllAsync<Record<string, unknown>>(query);
            if (rows.length > 0) {
                batch[key] = toBatchItems(rows, effectiveFkFields, serverIdMap, fieldDefaults);
                console.log(`[sync] engorde batch ${key}: ${rows.length} registros`);
            }
        } catch (e) { console.warn(`[sync] batch error ${table}:`, e); }
    }

    if (Object.keys(batch).length === 0) return { synced: 0, errors: [] };

    console.log('[sync] engorde payload:', Object.fromEntries(Object.entries(batch).map(([k, v]) => [k, v.length])));
    for (const [key, items] of Object.entries(batch)) {
        console.log(`[sync]   ${key}[0] sample:`, JSON.stringify(items[0]));
    }

    onProgress?.('Enviando datos de Engorde...', 84);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/engorde', { idRanch, ...batch });

    onProgress?.('Aplicando respuesta de Engorde...', 90);
    const synced = await applyResponse(db, ENGORDE_CONFIG, response, errors);
    await markLinkedEventsAsSynced(db);

    // Actualizar el mapa con los server_ids recién obtenidos
    for (const { table } of ENGORDE_CONFIG) {
        try {
            const rows = await db.getAllAsync<{ id: string; server_id: string }>(
                `SELECT id, server_id FROM ${table} WHERE server_id IS NOT NULL`
            );
            for (const r of rows) serverIdMap.set(r.id, r.server_id);
        } catch { /* tabla no existe */ }
    }

    return { synced, errors };
}

// ─── Sync de Sanidad ─────────────────────────────────────────────────────────

async function syncSanidad(
    serverIdMap: Map<string, string>,
    onProgress?: (msg: string, pct: number) => void
): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];

    let hasPending = false;
    for (const { table } of SANIDAD_CONFIG) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            if ((row?.count ?? 0) > 0) { hasPending = true; break; }
        } catch { /* tabla no existe */ }
    }
    if (!hasPending) {
        console.log('[sync] syncSanidad → nada pendiente');
        return { synced: 0, errors: [] };
    }

    onProgress?.('Preparando datos de Sanidad...', 91);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields } of SANIDAD_CONFIG) {
        try {
            const query = SANIDAD_QUERIES[table];
            const rows = await db.getAllAsync<Record<string, unknown>>(query);
            if (rows.length > 0) {
                batch[key] = toBatchItems(rows, fkFields, serverIdMap);
                console.log(`[sync] sanidad batch ${key}: ${rows.length} registros`);
            }
        } catch (e) { console.warn(`[sync] batch error ${table}:`, e); }
    }

    if (Object.keys(batch).length === 0) return { synced: 0, errors: [] };

    console.log('[sync] sanidad payload:', Object.fromEntries(Object.entries(batch).map(([k, v]) => [k, v.length])));
    for (const [key, items] of Object.entries(batch)) {
        console.log(`[sync]   ${key}[0] sample:`, JSON.stringify(items[0]));
    }

    onProgress?.('Enviando datos de Sanidad...', 94);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/sanidad', { idRanch, ...batch });

    onProgress?.('Aplicando respuesta de Sanidad...', 97);
    const synced = await applyResponse(db, SANIDAD_CONFIG, response, errors);
    await markLinkedEventsAsSynced(db);

    return { synced, errors };
}

async function syncMovimientos(
    serverIdMap: Map<string, string>,
    onProgress?: (msg: string, pct: number) => void
): Promise<{ synced: number; errors: SyncError[] }> {
    const db = await getDb();
    const errors: SyncError[] = [];

    let hasPending = false;
    for (const { table } of MOVIMIENTOS_CONFIG) {
        try {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            if ((row?.count ?? 0) > 0) { hasPending = true; break; }
        } catch { /* tabla no existe */ }
    }
    if (!hasPending) {
        console.log('[sync] syncMovimientos → nada pendiente');
        return { synced: 0, errors: [] };
    }

    onProgress?.('Preparando datos de Movimientos...', 97);
    const batch: Record<string, BatchItem[]> = {};
    for (const { key, table, fkFields } of MOVIMIENTOS_CONFIG) {
        try {
            const query = MOVIMIENTOS_QUERIES[table];
            const rows = await db.getAllAsync<Record<string, unknown>>(query);
            if (rows.length > 0) {
                batch[key] = toBatchItems(rows, fkFields, serverIdMap);
                console.log(`[sync] movimientos batch ${key}: ${rows.length} registros`);
            }
        } catch (e) { console.warn(`[sync] batch error ${table}:`, e); }
    }

    if (Object.keys(batch).length === 0) return { synced: 0, errors: [] };

    onProgress?.('Enviando datos de Movimientos...', 98);
    const idRanch = await getRanchId();
    const response = await apiFetch('/estancia-360/sync/movimientos', { idRanch, ...batch });

    onProgress?.('Aplicando respuesta de Movimientos...', 99);
    const synced = await applyResponse(db, MOVIMIENTOS_CONFIG, response, errors);
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
        onProgress?.('Verificando sesión...', 2);
        await refreshAuthToken();
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

        const engordeResult = await syncEngorde(serverIdMap, onProgress);
        console.log('[sync] engorde:', engordeResult.synced, 'synced,', engordeResult.errors.length, 'errors');
        totalSynced += engordeResult.synced;
        allErrors.push(...engordeResult.errors);

        const sanidadResult = await syncSanidad(serverIdMap, onProgress);
        console.log('[sync] sanidad:', sanidadResult.synced, 'synced,', sanidadResult.errors.length, 'errors');
        totalSynced += sanidadResult.synced;
        allErrors.push(...sanidadResult.errors);

        const movimientosResult = await syncMovimientos(serverIdMap, onProgress);
        console.log('[sync] movimientos:', movimientosResult.synced, 'synced,', movimientosResult.errors.length, 'errors');
        totalSynced += movimientosResult.synced;
        allErrors.push(...movimientosResult.errors);

        onProgress?.('Finalizando...', 99);
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

// ─── Descarga desde servidor (bootstrap e incremental) ───────────────────────

export interface ConflictItem {
    table: string;
    serverId: number | string;
    serverUpdatedAt: string;
    localUpdatedAt: string;
    serverData: Record<string, unknown>;
}

export interface ConflictDecision {
    table: string;
    serverId: number | string;
    choice: 'local' | 'server';
    serverData: Record<string, unknown>;
}

export interface DownloadResult {
    pulled: number;
    deleted: number;
    conflicts: ConflictItem[];
    serverTime?: string;
    cancelled?: boolean;
    error?: string;
}

// Orden de procesamiento respetando dependencias FK
const ENTITY_ORDER = [
    'ranchPastures', 'ranchLots', 'ranchAnimals', 'animalEvents',
    'breedingServices', 'gestationDiagnoses', 'parturitions', 'weanings', 'animalDeclaredHistories',
    'weightRecords', 'rearingSelections', 'fatteningEntries', 'feedRecords',
    'vaccinations', 'treatments', 'healthIncidents',
    'animalPurchases', 'animalSales', 'animalTransfers', 'animalExits',
];

const ENTITY_TABLE: Record<string, string> = {
    ranchPastures:            'ranch_pastures',
    ranchLots:                'ranch_lots',
    ranchAnimals:             'ranch_animals',
    animalEvents:             'animal_events',
    breedingServices:         'breeding_services',
    gestationDiagnoses:       'gestation_diagnoses',
    parturitions:             'parturitions',
    weanings:                 'weanings',
    animalDeclaredHistories:  'animal_declared_history',
    weightRecords:            'weight_records',
    rearingSelections:        'rearing_selections',
    fatteningEntries:         'fattening_entries',
    feedRecords:              'feed_records',
    vaccinations:             'vaccinations',
    treatments:               'treatments',
    healthIncidents:          'health_incidents',
    animalPurchases:          'animal_purchases',
    animalSales:              'animal_sales',
    animalTransfers:          'animal_transfers',
    animalExits:              'animal_exits',
};

function camelToSnake(key: string): string {
    return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function normalizeValue(v: unknown): unknown {
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v ?? null;
}

async function apiGet(endpoint: string, signal?: AbortSignal): Promise<unknown> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[sync] GET', url);
    const token = await getAuthToken();
    const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
}

async function upsertEntity(
    db: SQLiteDatabase,
    table: string,
    serverEntity: Record<string, unknown>
): Promise<{ result: 'inserted' | 'updated' | 'conflict'; conflict?: ConflictItem }> {
    const serverId = serverEntity.id as number | string;

    // Build snake_case row: id → server_id, skip localId, convert booleans
    const snakeRow: Record<string, unknown> = { server_id: String(serverId), is_synced: 1, synced_at: now() };
    for (const [k, v] of Object.entries(serverEntity)) {
        if (k === 'id' || k === 'localId') continue;
        snakeRow[camelToSnake(k)] = normalizeValue(v);
    }

    try {
        const existing = await db.getFirstAsync<{ id: string; is_synced: number; updated_at: string }>(
            `SELECT id, is_synced, updated_at FROM ${table} WHERE server_id = ?`,
            [String(serverId)]
        );

        if (!existing) {
            snakeRow.id = newId();
            const cols = Object.keys(snakeRow).join(', ');
            const phs = Object.keys(snakeRow).map(() => '?').join(', ');
            await db.runAsync(
                `INSERT INTO ${table} (${cols}) VALUES (${phs})`,
                Object.values(snakeRow) as any[]
            );
            return { result: 'inserted' };
        }

        if (existing.is_synced === 0) {
            return {
                result: 'conflict',
                conflict: {
                    table,
                    serverId,
                    serverUpdatedAt: (serverEntity.updatedAt as string) ?? '',
                    localUpdatedAt: existing.updated_at,
                    serverData: serverEntity,
                },
            };
        }

        // Update synced record
        const updateEntries = Object.entries(snakeRow).filter(([k]) => k !== 'server_id');
        const setClauses = updateEntries.map(([k]) => `${k} = ?`).join(', ');
        const values: unknown[] = [...updateEntries.map(([, v]) => v), String(serverId)];
        await db.runAsync(
            `UPDATE ${table} SET ${setClauses} WHERE server_id = ?`,
            values as any[]
        );
        return { result: 'updated' };
    } catch (e) {
        console.warn(`[sync] upsertEntity ${table} #${serverId}:`, e);
        return { result: 'inserted' }; // treat as non-blocking
    }
}

export async function downloadFromServer(
    idRanch: string | number,
    options?: {
        fullSync?: boolean;
        signal?: AbortSignal;
        onProgress?: (msg: string, pct: number) => void;
    }
): Promise<DownloadResult> {
    const { fullSync = false, signal, onProgress } = options ?? {};
    const db = await getDb();

    onProgress?.('Verificando sesión...', 5);
    await refreshAuthToken();

    const session = await db.getFirstAsync<{ last_sync: string | null }>(
        'SELECT last_sync FROM local_session WHERE id = 1'
    );
    const since = fullSync ? undefined : (session?.last_sync ?? undefined);

    let pulled = 0;
    let deleted = 0;
    const conflicts: ConflictItem[] = [];
    let serverTime: string | undefined;
    let cursor: string | undefined;
    let pageNum = 0;
    let progress = 10;

    try {
        do {
            if (signal?.aborted) return { pulled, deleted, conflicts, cancelled: true };

            // Build URL
            const params = new URLSearchParams();
            if (since) params.set('since', since);
            if (cursor) params.set('cursor', cursor);
            params.set('limit', '200');
            const qs = params.toString();
            const endpoint = `/estancia-360/sync/download/${idRanch}${qs ? '?' + qs : ''}`;

            pageNum++;
            onProgress?.(`Descargando datos (página ${pageNum})...`, Math.min(progress, 75));

            const raw = await apiGet(endpoint, signal);
            const body = (raw as any)?.data ?? raw as any;

            serverTime = body.serverTime as string | undefined;
            cursor = body.nextCursor as string | undefined ?? undefined;
            const entities = (body.entities ?? {}) as Record<string, Record<string, unknown>[]>;
            const deletions = (body.deletions ?? []) as Array<{ table: string; ids: (number | string)[] }>;

            // Apply entities in FK order
            await db.withTransactionAsync(async () => {
                for (const entityKey of ENTITY_ORDER) {
                    const table = ENTITY_TABLE[entityKey];
                    const rows = entities[entityKey] ?? [];
                    for (const row of rows) {
                        const { result, conflict } = await upsertEntity(db, table, row);
                        if (result === 'inserted' || result === 'updated') pulled++;
                        if (conflict) conflicts.push(conflict);
                    }
                }

                // Apply tombstones
                for (const { table, ids } of deletions) {
                    for (const id of ids) {
                        try {
                            await db.runAsync(`DELETE FROM ${table} WHERE server_id = ?`, [String(id)]);
                            deleted++;
                        } catch (e) { console.warn(`[sync] delete ${table} #${id}:`, e); }
                    }
                }
            });

            progress = Math.min(progress + 15, 75);
        } while (cursor);

        // If no conflicts, update last_sync now
        if (conflicts.length === 0 && serverTime) {
            await db.runAsync('UPDATE local_session SET last_sync=? WHERE id=1', [serverTime]);
        }

        onProgress?.('Descarga completada', 100);
        return { pulled, deleted, conflicts, serverTime };
    } catch (err) {
        if (signal?.aborted) return { pulled, deleted, conflicts, cancelled: true };
        console.error('[sync] downloadFromServer error:', err);
        return { pulled, deleted, conflicts, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function applyConflictResolutions(
    decisions: ConflictDecision[],
    serverTime?: string
): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
        for (const { table, serverId, choice, serverData } of decisions) {
            if (choice !== 'server') continue;
            const snakeRow: Record<string, unknown> = { is_synced: 1, synced_at: now() };
            for (const [k, v] of Object.entries(serverData)) {
                if (k === 'id' || k === 'localId') continue;
                snakeRow[camelToSnake(k)] = normalizeValue(v);
            }
            const updateEntries = Object.entries(snakeRow);
            const setClauses = updateEntries.map(([k]) => `${k} = ?`).join(', ');
            const values: unknown[] = [...updateEntries.map(([, v]) => v), String(serverId)];
            try {
                await db.runAsync(
                    `UPDATE ${table} SET ${setClauses} WHERE server_id = ?`,
                    values as any[]
                );
            } catch (e) { console.warn(`[sync] applyResolution ${table} #${serverId}:`, e); }
        }
        if (serverTime) {
            await db.runAsync('UPDATE local_session SET last_sync=? WHERE id=1', [serverTime]);
        }
    });
}
