// hooks/breeding/breeding.helpers.ts
// Funciones utilitarias compartidas por todos los hooks del módulo breeding

import { getSession } from '../auth/use-Auth';
import { getDb } from '../db.sqlite/db-pool';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface AnimalRow {
    id: string;
    code: string;
    sex: 'M' | 'F';
    id_productive_status: number;
    id_lot: string | null;
    id_ranch: string;
}

export interface LotRow {
    id: string;
    name: string;
    lot_type: string;
}

export interface ServiceRow {
    id: string;
}

export interface DiagnosisRow {
    id: string;
    result: string;
}

// ─── Buscar animal por código ─────────────────────────────────────────────────

/**
 * Busca un animal por código dentro del ranch activo.
 * Retorna null si no existe.
 */
export async function findAnimalByCode(code: string): Promise<AnimalRow | null> {
    const session = await getSession();
    if (!session) throw new Error('No hay sesión activa.');

    const db = await getDb();
    return db.getFirstAsync<AnimalRow>(
        `SELECT id, code, sex, id_productive_status, id_lot, id_ranch
     FROM ranch_animals
     WHERE id_ranch = ? AND code = ? AND id_status != 3`,
        [session.id_ranch, code.trim().toUpperCase()]
    );
}

/**
 * Busca un lote por nombre dentro del ranch activo.
 * Retorna null si no existe.
 */
export async function findLotByName(name: string): Promise<LotRow | null> {
    const session = await getSession();
    if (!session) throw new Error('No hay sesión activa.');

    const db = await getDb();
    return db.getFirstAsync<LotRow>(
        `SELECT l.id, l.name, l.lot_type
     FROM ranch_lots l
     WHERE l.id_ranch = ? AND l.name = ? AND l.is_active = 1`,
        [session.id_ranch, name.trim()]
    );
}

/**
 * Obtiene el último servicio activo (sin diagnóstico 'pregnant' ni parto)
 * de un animal. Usado para vincular diagnóstico y parto al servicio correcto.
 */
export async function findLastActiveService(id_ranch_animal: string): Promise<ServiceRow | null> {
    const db = await getDb();
    return db.getFirstAsync<ServiceRow>(
        `SELECT bs.id
     FROM breeding_services bs
     JOIN animal_events ae ON ae.id = bs.id_event
     WHERE ae.id_ranch_animal = ?
     ORDER BY ae.event_date DESC
     LIMIT 1`,
        [id_ranch_animal]
    );
}

/**
 * Obtiene el último diagnóstico 'pregnant' sin parto asociado.
 * Usado para vincular el parto al diagnóstico correcto.
 */
export async function findActivePregnantDiagnosis(id_ranch_animal: string): Promise<DiagnosisRow | null> {
    const db = await getDb();
    return db.getFirstAsync<DiagnosisRow>(
        `SELECT gd.id, gd.result
     FROM gestation_diagnoses gd
     JOIN breeding_services bs ON bs.id = gd.id_service
     JOIN animal_events ae ON ae.id = bs.id_event
     WHERE ae.id_ranch_animal = ?
       AND gd.result = 'pregnant'
       AND NOT EXISTS (
         SELECT 1 FROM parturitions p WHERE p.id_diagnosis = gd.id
       )
     ORDER BY ae.event_date DESC
     LIMIT 1`,
        [id_ranch_animal]
    );
}

/**
 * Obtiene el id_user de la sesión activa.
 */
export async function getActiveUserId(): Promise<string> {
    const session = await getSession();
    if (!session) throw new Error('No hay sesión activa.');
    return session.id_user;
}

/**
 * Obtiene el id_ranch de la sesión activa.
 */
export async function getActiveRanchId(): Promise<string> {
    const session = await getSession();
    if (!session) throw new Error('No hay sesión activa.');
    return session.id_ranch;
}