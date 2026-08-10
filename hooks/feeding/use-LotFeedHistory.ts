// hooks/feeding/use-LotFeedHistory.ts
// Historial de alimentación de UN lote — reusado tanto en LotDetail.tsx (lote propio)
// como en DetailAnimal.tsx (lote actual del animal), ya que feed_records es por lote,
// no por animal (no existe id_ranch_animal en esa tabla, ni local ni en el backend).

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../db.sqlite/db-pool';

export interface FeedRecordItem {
    id: string;
    feed_date: string;
    feed_type: string;
    quantity: number | null;
    unit: string | null;
    cost: number | null;
    notes: string | null;
    is_synced: number;
}

export function useLotFeedHistory(idLot: string | null | undefined) {
    const [records, setRecords] = useState<FeedRecordItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        if (!idLot) { setRecords([]); setLoading(false); return; }
        setLoading(true);
        try {
            const db = await getDb();
            const rows = await db.getAllAsync<FeedRecordItem>(
                `SELECT id, feed_date, feed_type, quantity, unit, cost, notes, is_synced
                 FROM feed_records WHERE id_lot = ? ORDER BY feed_date DESC`,
                [idLot]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useLotFeedHistory:', e);
        } finally {
            setLoading(false);
        }
    }, [idLot]);

    useEffect(() => { fetch(); }, [fetch]);

    return { records, loading, refresh: fetch };
}
