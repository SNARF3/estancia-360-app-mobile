// hooks/Animals/offline/use-AnimalHistory.ts
// Hooks de lectura para el historial de cada módulo desde SQLite

import { useCallback, useEffect, useState } from 'react';
import { Colors } from '../../../constants/theme';
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

// ─── useAnimalFullHistory ─────────────────────────────────────────────────────
// Historial completo de un animal individual: todos los tipos de eventos.

export interface TimelineEntry {
    id: string;
    event_date: string;
    label: string;
    icon: string;
    color: string;
    summary: string;
    details: string[];
    is_synced: number;
}

export function useAnimalFullHistory(animalId: string) {
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        if (!animalId) return;
        setLoading(true);
        try {
            const db = await getDb();
            const all: TimelineEntry[] = [];

            // Servicios reproductivos
            const services = await db.getAllAsync<any>(
                `SELECT bs.id, ae.event_date, bs.service_type, bs.semen_breed, bs.technician,
                        male.code AS male_code, bs.is_synced
                 FROM breeding_services bs
                 JOIN animal_events ae ON ae.id = bs.id_event
                 LEFT JOIN ranch_animals male ON male.id = bs.id_animal_male
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const s of services) {
                const typeLabels: Record<string, string> = { natural: 'Monta Natural', artificial_insemination: 'Inseminación Artificial', embryo_transfer: 'T. Embrionaria' };
                all.push({
                    id: s.id, event_date: s.event_date, label: 'Servicio',
                    icon: 'heart', color: '#F59E0B',
                    summary: typeLabels[s.service_type] ?? s.service_type,
                    details: [
                        s.male_code ? `Macho: ${s.male_code}` : null,
                        s.semen_breed ? `Semen: ${s.semen_breed}` : null,
                        s.technician ? `Técnico: ${s.technician}` : null,
                    ].filter(Boolean) as string[],
                    is_synced: s.is_synced,
                });
            }

            // Diagnósticos de gestación
            const diags = await db.getAllAsync<any>(
                `SELECT gd.id, ae.event_date, gd.method, gd.result, gd.gestation_days,
                        gd.estimated_birth, gd.veterinarian, gd.is_synced
                 FROM gestation_diagnoses gd
                 JOIN animal_events ae ON ae.id = gd.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const d of diags) {
                const isPrg = d.result === 'pregnant';
                all.push({
                    id: d.id, event_date: d.event_date, label: 'Diagnóstico',
                    icon: 'analytics', color: isPrg ? Colors.primary : '#EF4444',
                    summary: isPrg ? 'Preñada' : 'Vacía',
                    details: [
                        d.method === 'palpation' ? 'Palpación' : 'Ecografía',
                        d.gestation_days ? `${d.gestation_days} días gestación` : null,
                        d.estimated_birth ? `Parto est.: ${d.estimated_birth}` : null,
                        d.veterinarian ?? null,
                    ].filter(Boolean) as string[],
                    is_synced: d.is_synced,
                });
            }

            // Partos (esta vaca como madre)
            const parts = await db.getAllAsync<any>(
                `SELECT p.id, ae.event_date, p.birth_type, p.cria_status, p.cria_weight,
                        p.mother_condition, cria.code AS cria_code, p.is_synced
                 FROM parturitions p
                 JOIN animal_events ae ON ae.id = p.id_event
                 LEFT JOIN ranch_animals cria ON cria.id = p.id_cria
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const p of parts) {
                const alive = p.cria_status === 'alive';
                const typeLabel: Record<string, string> = { normal: 'Normal', assisted: 'Asistido', cesarean: 'Cesárea' };
                all.push({
                    id: p.id, event_date: p.event_date, label: 'Parto',
                    icon: 'fitness', color: '#8B5CF6',
                    summary: typeLabel[p.birth_type] ?? p.birth_type,
                    details: [
                        alive ? 'Cría viva' : 'Cría muerta',
                        p.cria_code ? `Cría: ${p.cria_code}` : null,
                        p.cria_weight ? `Peso cría: ${p.cria_weight} kg` : null,
                        p.mother_condition ? `Madre: ${p.mother_condition}` : null,
                    ].filter(Boolean) as string[],
                    is_synced: p.is_synced,
                });
            }

            // Destete (este animal como cría)
            const weans = await db.getAllAsync<any>(
                `SELECT w.id, ae.event_date, w.weaning_weight, w.weaning_age,
                        lot.name AS lot_name, w.is_synced
                 FROM weanings w
                 JOIN animal_events ae ON ae.id = w.id_event
                 LEFT JOIN ranch_lots lot ON lot.id = w.id_lot_dest
                 WHERE w.id_cria = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const w of weans) {
                all.push({
                    id: w.id, event_date: w.event_date, label: 'Destete',
                    icon: 'git-branch', color: '#0EA5E9',
                    summary: w.weaning_weight ? `${w.weaning_weight} kg` : 'Destete registrado',
                    details: [
                        w.weaning_age ? `${w.weaning_age} días de edad` : null,
                        w.lot_name ? `Lote destino: ${w.lot_name}` : null,
                    ].filter(Boolean) as string[],
                    is_synced: w.is_synced,
                });
            }

            // Pesajes
            const weights = await db.getAllAsync<any>(
                `SELECT wr.id, ae.event_date, wr.weight, wr.weight_type, wr.body_condition, wr.is_synced
                 FROM weight_records wr
                 JOIN animal_events ae ON ae.id = wr.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const w of weights) {
                all.push({
                    id: w.id, event_date: w.event_date, label: 'Pesaje',
                    icon: 'scale', color: '#10B981',
                    summary: `${w.weight} kg`,
                    details: [
                        w.weight_type === 'scale' ? 'Báscula' : 'Estimado',
                        w.body_condition ? `Condición corporal: ${w.body_condition}/5` : null,
                    ].filter(Boolean) as string[],
                    is_synced: w.is_synced,
                });
            }

            // Vacunaciones
            const vacs = await db.getAllAsync<any>(
                `SELECT v.id, ae.event_date, v.vaccine_name, v.dose, v.responsible, v.is_synced
                 FROM vaccinations v
                 JOIN animal_events ae ON ae.id = v.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const v of vacs) {
                all.push({
                    id: v.id, event_date: v.event_date, label: 'Vacunación',
                    icon: 'shield-checkmark', color: '#3B82F6',
                    summary: v.vaccine_name,
                    details: [
                        v.dose ? `Dosis: ${v.dose}` : null,
                        v.responsible ?? null,
                    ].filter(Boolean) as string[],
                    is_synced: v.is_synced,
                });
            }

            // Tratamientos
            const treats = await db.getAllAsync<any>(
                `SELECT t.id, ae.event_date, t.medication, t.illness, t.dose,
                        t.duration_days, t.withdrawal_days, t.is_synced
                 FROM treatments t
                 JOIN animal_events ae ON ae.id = t.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const t of treats) {
                all.push({
                    id: t.id, event_date: t.event_date, label: 'Tratamiento',
                    icon: 'bandage', color: '#F97316',
                    summary: t.medication,
                    details: [
                        t.illness ? `Enfermedad: ${t.illness}` : null,
                        t.dose ? `Dosis: ${t.dose}` : null,
                        t.duration_days ? `${t.duration_days} días` : null,
                        t.withdrawal_days ? `Retiro: ${t.withdrawal_days} días` : null,
                    ].filter(Boolean) as string[],
                    is_synced: t.is_synced,
                });
            }

            // Incidentes sanitarios
            const incidents = await db.getAllAsync<any>(
                `SELECT hi.id, ae.event_date, hi.incident_type, hi.description,
                        hi.resolved_at, hi.is_synced
                 FROM health_incidents hi
                 JOIN animal_events ae ON ae.id = hi.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const h of incidents) {
                all.push({
                    id: h.id, event_date: h.event_date, label: 'Incidente',
                    icon: 'warning', color: '#EF4444',
                    summary: h.incident_type === 'quarantine' ? 'Cuarentena' : 'Enfermedad detectada',
                    details: [
                        h.description ?? null,
                        h.resolved_at ? `Resuelto: ${h.resolved_at}` : 'Sin resolver',
                    ].filter(Boolean) as string[],
                    is_synced: h.is_synced,
                });
            }

            // Entrada a engorde
            const fattenings = await db.getAllAsync<any>(
                `SELECT fe.id, ae.event_date, fe.system_type, fe.initial_weight, fe.is_synced
                 FROM fattening_entries fe
                 JOIN animal_events ae ON ae.id = fe.id_event
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const f of fattenings) {
                all.push({
                    id: f.id, event_date: f.event_date, label: 'Entrada Engorde',
                    icon: 'trending-up', color: '#D97706',
                    summary: f.system_type === 'feedlot' ? 'Feedlot' : 'Pastoreo',
                    details: [
                        f.initial_weight ? `Peso inicial: ${f.initial_weight} kg` : null,
                    ].filter(Boolean) as string[],
                    is_synced: f.is_synced,
                });
            }

            // Selecciones de recría
            const selections = await db.getAllAsync<any>(
                `SELECT rs.id, ae.event_date, rs.destination, rs.weight_at_selection,
                        rs.body_condition, lot.name AS lot_name, rs.is_synced
                 FROM rearing_selections rs
                 JOIN animal_events ae ON ae.id = rs.id_event
                 LEFT JOIN ranch_lots lot ON lot.id = rs.id_lot_dest
                 WHERE ae.id_ranch_animal = ? ORDER BY ae.event_date DESC`, [animalId]
            );
            for (const r of selections) {
                const destLabels: Record<string, string> = { replacement: 'Reposición', fattening: 'Engorde', sale: 'Venta' };
                const destColors: Record<string, string> = { replacement: Colors.primary, fattening: '#F59E0B', sale: '#EF4444' };
                all.push({
                    id: r.id, event_date: r.event_date, label: 'Selección Recría',
                    icon: 'swap-horizontal', color: destColors[r.destination] ?? Colors.textSecondary,
                    summary: destLabels[r.destination] ?? r.destination,
                    details: [
                        r.weight_at_selection ? `${r.weight_at_selection} kg` : null,
                        r.body_condition ? `CC: ${r.body_condition}/5` : null,
                        r.lot_name ? `Lote: ${r.lot_name}` : null,
                    ].filter(Boolean) as string[],
                    is_synced: r.is_synced,
                });
            }

            all.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
            setEntries(all);
        } catch (e) {
            console.error('useAnimalFullHistory:', e);
        } finally {
            setLoading(false);
        }
    }, [animalId]);

    useEffect(() => { fetch(); }, [fetch]);

    return { entries, loading, refresh: fetch };
}