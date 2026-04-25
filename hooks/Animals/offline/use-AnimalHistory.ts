// hooks/Animals/offline/use-AnimalHistory.ts
// Hooks de lectura para el historial de cada módulo desde SQLite

import { useCallback, useState } from 'react';
import { getSession } from '../../auth/use-Auth';
import { getDb } from '../../db.sqlite/db-pool';

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface ServiceRecord {
    id: string;
    event_id: string;
    event_date: string;
    animal_code: string;
    animal_id: string;
    service_type: string;
    id_animal_male: string | null;
    male_code: string | null;
    semen_breed: string | null;
    technician: string | null;
    reproductive_lot: string | null;
    notes: string | null;
    is_synced: number;
}

export interface DiagnosisRecord {
    id: string;
    event_id: string;
    event_date: string;
    animal_code: string;
    animal_id: string;
    method: string;
    result: string;
    gestation_days: number | null;
    estimated_birth: string | null;
    veterinarian: string | null;
    notes: string | null;
    is_synced: number;
}

export interface ParturitionRecord {
    id: string;
    event_id: string;
    event_date: string;
    animal_code: string;   // madre
    animal_id: string;
    birth_type: string;
    cria_status: string;
    cria_code: string | null;
    cria_weight: number | null;
    mother_condition: string | null;
    notes: string | null;
    is_synced: number;
}

export interface WeaningRecord {
    id: string;
    event_id: string;
    event_date: string;
    cria_code: string;
    cria_id: string;
    lot_dest_name: string | null;
    weaning_weight: number | null;
    weaning_age: number | null;
    notes: string | null;
    is_synced: number;
}

export interface RearingSelectionRecord {
    id: string;
    event_id: string;
    event_date: string;
    animal_code: string;
    animal_id: string;
    destination: string;
    lot_dest_name: string | null;
    weight_at_selection: number | null;
    body_condition: number | null;
    genetic_score: number | null;
    age_days: number | null;
    notes: string | null;
    is_synced: number;
}

// ─── useGetServices ───────────────────────────────────────────────────────────

export function useGetServices() {
    const [records, setRecords] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (id_ranch_animal?: string) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const whereAnimal = id_ranch_animal
                ? `AND ae.id_ranch_animal = '${id_ranch_animal}'`
                : '';

            const rows = await db.getAllAsync<ServiceRecord>(
                `SELECT
           bs.id, bs.id_event AS event_id,
           ae.event_date, ae.notes,
           a.code AS animal_code, a.id AS animal_id,
           bs.service_type, bs.id_animal_male,
           male.code AS male_code,
           bs.semen_breed, bs.technician, bs.reproductive_lot,
           bs.is_synced
         FROM breeding_services bs
         JOIN animal_events ae ON ae.id = bs.id_event
         JOIN ranch_animals  a  ON a.id  = ae.id_ranch_animal
         LEFT JOIN ranch_animals male ON male.id = bs.id_animal_male
         WHERE a.id_ranch = ? ${whereAnimal}
         ORDER BY ae.event_date DESC`,
                [session.id_ranch]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useGetServices:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { records, loading, fetch };
}

// ─── useGetDiagnoses ──────────────────────────────────────────────────────────

export function useGetDiagnoses() {
    const [records, setRecords] = useState<DiagnosisRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (id_ranch_animal?: string) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const whereAnimal = id_ranch_animal
                ? `AND ae.id_ranch_animal = '${id_ranch_animal}'`
                : '';

            const rows = await db.getAllAsync<DiagnosisRecord>(
                `SELECT
           gd.id, gd.id_event AS event_id,
           ae.event_date, ae.notes,
           a.code AS animal_code, a.id AS animal_id,
           gd.method, gd.result,
           gd.gestation_days, gd.estimated_birth, gd.veterinarian,
           gd.is_synced
         FROM gestation_diagnoses gd
         JOIN animal_events ae ON ae.id = gd.id_event
         JOIN ranch_animals  a  ON a.id  = ae.id_ranch_animal
         WHERE a.id_ranch = ? ${whereAnimal}
         ORDER BY ae.event_date DESC`,
                [session.id_ranch]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useGetDiagnoses:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { records, loading, fetch };
}

// ─── useGetParturitions ───────────────────────────────────────────────────────

export function useGetParturitions() {
    const [records, setRecords] = useState<ParturitionRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (id_ranch_animal?: string) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const whereAnimal = id_ranch_animal
                ? `AND ae.id_ranch_animal = '${id_ranch_animal}'`
                : '';

            const rows = await db.getAllAsync<ParturitionRecord>(
                `SELECT
           p.id, p.id_event AS event_id,
           ae.event_date, ae.notes,
           madre.code AS animal_code, madre.id AS animal_id,
           p.birth_type, p.cria_status,
           cria.code AS cria_code,
           p.cria_weight, p.mother_condition,
           p.is_synced
         FROM parturitions p
         JOIN animal_events ae    ON ae.id    = p.id_event
         JOIN ranch_animals madre ON madre.id = ae.id_ranch_animal
         LEFT JOIN ranch_animals cria ON cria.id = p.id_cria
         WHERE madre.id_ranch = ? ${whereAnimal}
         ORDER BY ae.event_date DESC`,
                [session.id_ranch]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useGetParturitions:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { records, loading, fetch };
}

// ─── useGetWeanings ───────────────────────────────────────────────────────────

export function useGetWeanings() {
    const [records, setRecords] = useState<WeaningRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (id_ranch_animal?: string) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const whereAnimal = id_ranch_animal
                ? `AND w.id_cria = '${id_ranch_animal}'`
                : '';

            const rows = await db.getAllAsync<WeaningRecord>(
                `SELECT
           w.id, w.id_event AS event_id,
           ae.event_date, ae.notes,
           cria.code AS cria_code, cria.id AS cria_id,
           lot.name AS lot_dest_name,
           w.weaning_weight, w.weaning_age,
           w.is_synced
         FROM weanings w
         JOIN animal_events ae ON ae.id  = w.id_event
         JOIN ranch_animals cria ON cria.id = w.id_cria
         LEFT JOIN ranch_lots lot ON lot.id = w.id_lot_dest
         WHERE cria.id_ranch = ? ${whereAnimal}
         ORDER BY ae.event_date DESC`,
                [session.id_ranch]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useGetWeanings:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { records, loading, fetch };
}

// ─── useGetRearingSelections ──────────────────────────────────────────────────

export function useGetRearingSelections() {
    const [records, setRecords] = useState<RearingSelectionRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async (id_ranch_animal?: string) => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();

            const whereAnimal = id_ranch_animal
                ? `AND ae.id_ranch_animal = '${id_ranch_animal}'`
                : '';

            const rows = await db.getAllAsync<RearingSelectionRecord>(
                `SELECT
           rs.id, rs.id_event AS event_id,
           ae.event_date, ae.notes,
           a.code AS animal_code, a.id AS animal_id,
           rs.destination,
           lot.name AS lot_dest_name,
           rs.weight_at_selection, rs.body_condition,
           rs.genetic_score, rs.age_days,
           rs.is_synced
         FROM rearing_selections rs
         JOIN animal_events ae ON ae.id = rs.id_event
         JOIN ranch_animals  a  ON a.id  = ae.id_ranch_animal
         LEFT JOIN ranch_lots lot ON lot.id = rs.id_lot_dest
         WHERE a.id_ranch = ? ${whereAnimal}
         ORDER BY ae.event_date DESC`,
                [session.id_ranch]
            );
            setRecords(rows);
        } catch (e) {
            console.error('useGetRearingSelections:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    return { records, loading, fetch };
}