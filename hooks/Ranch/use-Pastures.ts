// hooks/Ranch/use-Pastures.ts
// CRUD completo de potreros (ranch_pastures) y lotes (ranch_lots)

import { useCallback, useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { getDb } from '../db.sqlite/db-pool';
import { newId, now } from '../db.sqlite/db-utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LotType = 'cria' | 'recria' | 'engorde' | 'reproductiva' | 'general';

export interface Pasture {
    id: string;
    server_id?: string;
    id_ranch: string;
    name: string;
    area_hectares: number;
    description?: string;
    is_active: number;   // 1=activo, 0=inactivo
    created_at: string;
    updated_at: string;
    is_synced: number;
    // Computado en la query
    lots_count: number;
    animals_count: number;
}

export interface Lot {
    id: string;
    server_id?: string;
    id_ranch: string;
    id_ranch_pasture: string;
    name: string;
    lot_type: LotType;
    capacity?: number;
    is_active: number;
    created_at: string;
    updated_at: string;
    is_synced: number;
    // Computado
    animals_count: number;
}

export interface CreatePastureInput {
    name: string;
    area_hectares: number;
    description?: string;
}

export interface CreateLotInput {
    id_ranch_pasture: string;
    name: string;
    lot_type: LotType;
    capacity?: number;
}

// ─── Etiquetas para UI ────────────────────────────────────────────────────────

export const LOT_TYPE_LABELS: Record<LotType, string> = {
    cria: 'Cría',
    recria: 'Recría',
    engorde: 'Engorde',
    reproductiva: 'Reproductiva',
    general: 'General',
};

export const LOT_TYPE_COLORS: Record<LotType, string> = {
    cria: '#8B5CF6',
    recria: '#3B82F6',
    engorde: '#F59E0B',
    reproductiva: '#EC4899',
    general: '#6B7280',
};

// ─── Hook principal ────────────────────────────────────────────────────────────

export function usePastures() {
    const [pastures, setPastures] = useState<Pasture[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Listar potreros con conteos ──────────────────────────────────────────

    const fetchPastures = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const rows = await db.getAllAsync<Pasture>(
                `SELECT
           p.*,
           COUNT(DISTINCT l.id)  AS lots_count,
           COUNT(DISTINCT a.id)  AS animals_count
         FROM ranch_pastures p
         LEFT JOIN ranch_lots    l ON l.id_ranch_pasture = p.id AND l.is_active = 1
         LEFT JOIN ranch_animals a ON a.id_lot = l.id AND a.id_status != 3
         WHERE p.id_ranch = ?
         GROUP BY p.id
         ORDER BY p.name ASC`,
                [session.id_ranch]
            );
            setPastures(rows);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Crear potrero ────────────────────────────────────────────────────────

    const createPasture = useCallback(async (input: CreatePastureInput): Promise<boolean> => {
        setError(null);
        try {
            const session = await getSession();
            if (!session) { setError('No hay sesión activa.'); return false; }
            const db = await getDb();
            const ts = now();
            const id = newId();

            await db.runAsync(
                `INSERT INTO ranch_pastures
           (id, id_ranch, name, area_hectares, description, is_active, created_at, updated_at, is_synced, sync_action)
         VALUES (?,?,?,?,?,1,?,?,0,'INSERT')`,
                [id, session.id_ranch, input.name.trim(), input.area_hectares,
                    input.description?.trim() ?? null, ts, ts]
            );

            await fetchPastures();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al crear el potrero.');
            return false;
        }
    }, [fetchPastures]);

    // ── Editar potrero ───────────────────────────────────────────────────────

    const updatePasture = useCallback(async (id: string, input: Partial<CreatePastureInput>): Promise<boolean> => {
        setError(null);
        try {
            const db = await getDb();
            const ts = now();
            await db.runAsync(
                `UPDATE ranch_pastures SET
           name          = COALESCE(?, name),
           area_hectares = COALESCE(?, area_hectares),
           description   = COALESCE(?, description),
           updated_at    = ?,
           is_synced     = 0,
           sync_action   = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [input.name?.trim() ?? null, input.area_hectares ?? null,
                input.description?.trim() ?? null, ts, id]
            );
            await fetchPastures();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al editar el potrero.');
            return false;
        }
    }, [fetchPastures]);

    // ── Desactivar potrero ───────────────────────────────────────────────────

    const deactivatePasture = useCallback(async (id: string): Promise<boolean> => {
        setError(null);
        try {
            const db = await getDb();
            // Verificar que no tenga animales activos
            const check = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ranch_animals a
         JOIN ranch_lots l ON l.id = a.id_lot
         WHERE l.id_ranch_pasture = ? AND a.id_status != 3`,
                [id]
            );
            if ((check?.count ?? 0) > 0) {
                setError('No se puede desactivar: el potrero tiene animales activos.');
                return false;
            }
            await db.runAsync(
                `UPDATE ranch_pastures SET is_active = 0, updated_at = ?,
         is_synced = 0, sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [now(), id]
            );
            await fetchPastures();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al desactivar el potrero.');
            return false;
        }
    }, [fetchPastures]);

    return { pastures, loading, error, fetchPastures, createPasture, updatePasture, deactivatePasture };
}

// ─── Hook de lotes ────────────────────────────────────────────────────────────

export function useLots(id_ranch_pasture?: string) {
    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLots = useCallback(async (pastureId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const pid = pastureId ?? id_ranch_pasture;
            const where = pid ? `AND l.id_ranch_pasture = '${pid}'` : '';

            const rows = await db.getAllAsync<Lot>(
                `SELECT
           l.*,
           COUNT(a.id) AS animals_count
         FROM ranch_lots l
         LEFT JOIN ranch_animals a ON a.id_lot = l.id AND a.id_status != 3
         WHERE l.id_ranch = ? ${where}
         GROUP BY l.id
         ORDER BY l.name ASC`,
                [session.id_ranch]
            );
            setLots(rows);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id_ranch_pasture]);

    const createLot = useCallback(async (input: CreateLotInput): Promise<boolean> => {
        setError(null);
        try {
            const session = await getSession();
            if (!session) { setError('No hay sesión activa.'); return false; }
            const db = await getDb();
            const ts = now();
            const id = newId();

            await db.runAsync(
                `INSERT INTO ranch_lots
           (id, id_ranch, id_ranch_pasture, name, lot_type, capacity, is_active, created_at, updated_at, is_synced, sync_action)
         VALUES (?,?,?,?,?,?,1,?,?,0,'INSERT')`,
                [id, session.id_ranch, input.id_ranch_pasture, input.name.trim(),
                    input.lot_type, input.capacity ?? null, ts, ts]
            );

            await fetchLots();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al crear el lote.');
            return false;
        }
    }, [fetchLots]);

    const updateLot = useCallback(async (id: string, input: Partial<Omit<CreateLotInput, 'id_ranch_pasture'>>): Promise<boolean> => {
        setError(null);
        try {
            const db = await getDb();
            await db.runAsync(
                `UPDATE ranch_lots SET
           name      = COALESCE(?, name),
           lot_type  = COALESCE(?, lot_type),
           capacity  = COALESCE(?, capacity),
           updated_at = ?,
           is_synced  = 0,
           sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [input.name?.trim() ?? null, input.lot_type ?? null,
                input.capacity ?? null, now(), id]
            );
            await fetchLots();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al editar el lote.');
            return false;
        }
    }, [fetchLots]);

    const deactivateLot = useCallback(async (id: string): Promise<boolean> => {
        setError(null);
        try {
            const db = await getDb();
            const check = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM ranch_animals WHERE id_lot = ? AND id_status != 3`, [id]
            );
            if ((check?.count ?? 0) > 0) {
                setError('No se puede desactivar: el lote tiene animales activos.');
                return false;
            }
            await db.runAsync(
                `UPDATE ranch_lots SET is_active = 0, updated_at = ?,
         is_synced = 0, sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [now(), id]
            );
            await fetchLots();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al desactivar el lote.');
            return false;
        }
    }, [fetchLots]);

    return { lots, loading, error, fetchLots, createLot, updateLot, deactivateLot };
}

// ─── Hook para selector de lote (usado en WeaningForm, etc.) ─────────────────

export interface PastureWithLots extends Pasture {
    lots: Lot[];
}

export function useLotSelector() {
    const [data, setData] = useState<PastureWithLots[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (filterType?: LotType) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const pastures = await db.getAllAsync<Pasture>(
                `SELECT p.*, 0 AS lots_count, 0 AS animals_count
         FROM ranch_pastures p WHERE p.id_ranch = ? AND p.is_active = 1 ORDER BY p.name ASC`,
                [session.id_ranch]
            );

            const typeFilter = filterType ? `AND l.lot_type = '${filterType}'` : '';

            const result: PastureWithLots[] = [];
            for (const p of pastures) {
                const lots = await db.getAllAsync<Lot>(
                    `SELECT l.*, COUNT(a.id) AS animals_count
           FROM ranch_lots l
           LEFT JOIN ranch_animals a ON a.id_lot = l.id AND a.id_status != 3
           WHERE l.id_ranch_pasture = ? AND l.is_active = 1 ${typeFilter}
           GROUP BY l.id ORDER BY l.name ASC`,
                    [p.id]
                );
                if (lots.length > 0) result.push({ ...p, lots });
            }
            setData(result);
        } catch (e) {
            console.error('useLotSelector:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, fetch };
}