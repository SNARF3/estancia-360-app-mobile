// hooks/Animals/offline/use-AnimalWeightSeries.ts
// Serie completa de pesajes de UN animal + KPIs derivados (peso actual, variación,
// ganancia total, GMD de los últimos 30 días). Mismo patrón de query que ya usa
// useAnimalFullHistory (hooks/Animals/offline/use-AnimalHistory.ts) para "Pesaje",
// pero ascendente y sin formatear a timeline — acá se necesitan los números crudos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDb } from '../../db.sqlite/db-pool';

export interface WeightPoint {
    id: string;
    event_date: string;
    weight: number;
    weight_type: 'scale' | 'estimated';
    body_condition: number | null;
    is_synced: number;
}

export interface AnimalWeightStats {
    currentWeight: number | null;
    currentWeightDate: string | null;
    previousWeight: number | null;
    previousWeightDate: string | null;
    weightDelta: number | null;
    totalGain: number | null;
    /** kg/día, comparando el último pesaje contra el más antiguo dentro de los últimos 30 días */
    gmd30: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStats(series: WeightPoint[], fallbackWeight?: number): AnimalWeightStats {
    if (series.length === 0) {
        return {
            currentWeight: fallbackWeight ?? null,
            currentWeightDate: null,
            previousWeight: null,
            previousWeightDate: null,
            weightDelta: null,
            totalGain: null,
            gmd30: null,
        };
    }

    const first = series[0];
    const last = series[series.length - 1];
    const previous = series.length >= 2 ? series[series.length - 2] : null;

    const totalGain = series.length >= 2 ? last.weight - first.weight : null;
    const weightDelta = previous ? last.weight - previous.weight : null;

    const lastTime = new Date(last.event_date).getTime();
    const cutoff = lastTime - 30 * DAY_MS;
    // series está ascendente: el primer punto con fecha >= cutoff es el más antiguo
    // dentro de la ventana de 30 días.
    const refPoint = series.find(p => new Date(p.event_date).getTime() >= cutoff) ?? last;

    let gmd30: number | null = null;
    if (refPoint.id !== last.id) {
        const days = (lastTime - new Date(refPoint.event_date).getTime()) / DAY_MS;
        if (days > 0) gmd30 = (last.weight - refPoint.weight) / days;
    }

    return {
        currentWeight: last.weight,
        currentWeightDate: last.event_date,
        previousWeight: previous?.weight ?? null,
        previousWeightDate: previous?.event_date ?? null,
        weightDelta,
        totalGain,
        gmd30,
    };
}

export function useAnimalWeightSeries(animalId: string, fallbackWeight?: number) {
    const [series, setSeries] = useState<WeightPoint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        if (!animalId) { setLoading(false); return; }
        setLoading(true);
        try {
            const db = await getDb();
            const rows = await db.getAllAsync<WeightPoint>(
                `SELECT wr.id, ae.event_date, wr.weight, wr.weight_type, wr.body_condition, wr.is_synced
                 FROM weight_records wr
                 JOIN animal_events ae ON ae.id = wr.id_event
                 WHERE ae.id_ranch_animal = ?
                 ORDER BY ae.event_date ASC`,
                [animalId]
            );
            setSeries(rows);
        } catch (e) {
            console.error('useAnimalWeightSeries:', e);
        } finally {
            setLoading(false);
        }
    }, [animalId]);

    useEffect(() => { fetch(); }, [fetch]);

    const stats = useMemo(() => computeStats(series, fallbackWeight), [series, fallbackWeight]);

    return { series, stats, loading, refresh: fetch };
}
