/**
 * repositories/animals.ts
 * Estancia360 — Operaciones CRUD para ranch_animals
 */

import { ANIMAL_STATUSES, PRODUCTIVE_STATUSES } from '../database';
import { getDb } from '../db-pool';
import { newId, now } from '../db-utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Animal {
    id: string;
    server_id?: string;
    id_mother?: string;
    id_father?: string;
    id_ranch: string;
    id_breed: number;
    id_status: number;
    id_productive_status: number;
    id_animal_class: number;
    id_lot?: string;
    code: string;
    birthdate: string;           // ISO date
    weight?: number;
    sex: 'M' | 'F';
    origin?: string;
    created_at: string;
    updated_at: string;
    is_synced: number;
    sync_action: string;
}

export interface CreateAnimalInput {
    id_mother?: string;
    id_father?: string;
    id_ranch: string;
    id_breed: number;
    id_productive_status: number;
    id_animal_class: number;
    id_lot?: string;
    code: string;
    birthdate: string;
    weight?: number;
    sex: 'M' | 'F';
    origin?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Crea un animal (por nacimiento o compra) */
export async function createAnimal(input: CreateAnimalInput): Promise<Animal> {
    const db = await getDb();
    const ts = now();
    const animal: Animal = {
        id: newId(),
        id_ranch: input.id_ranch,
        id_breed: input.id_breed,
        id_status: ANIMAL_STATUSES.ACTIVO,
        id_productive_status: input.id_productive_status,
        id_animal_class: input.id_animal_class,
        code: input.code,
        birthdate: input.birthdate,
        sex: input.sex,
        id_mother: input.id_mother,
        id_father: input.id_father,
        id_lot: input.id_lot,
        weight: input.weight,
        origin: input.origin,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
        sync_action: 'INSERT',
    };

    await db.runAsync(
        `INSERT INTO ranch_animals (
      id, id_mother, id_father, id_ranch, id_breed, id_status,
      id_productive_status, id_animal_class, id_lot,
      code, birthdate, weight, sex, origin,
      created_at, updated_at, is_synced, sync_action
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            animal.id, animal.id_mother ?? null, animal.id_father ?? null,
            animal.id_ranch, animal.id_breed, animal.id_status,
            animal.id_productive_status, animal.id_animal_class, animal.id_lot ?? null,
            animal.code, animal.birthdate, animal.weight ?? null,
            animal.sex, animal.origin ?? null,
            animal.created_at, animal.updated_at, animal.is_synced, animal.sync_action,
        ]
    );

    return animal;
}

/** Lista animales activos de un ranch, con filtros opcionales */
export async function getAnimals(params: {
    id_ranch: string;
    id_productive_status?: number;
    id_lot?: string;
    sex?: 'M' | 'F';
    page?: number;
    pageSize?: number;
}): Promise<Animal[]> {
    const db = await getDb();
    const conditions: string[] = ['id_ranch = ?', 'id_status != ?'];
    const args: (string | number)[] = [params.id_ranch, ANIMAL_STATUSES.INACTIVO];

    if (params.id_productive_status !== undefined) {
        conditions.push('id_productive_status = ?');
        args.push(params.id_productive_status);
    }
    if (params.id_lot) {
        conditions.push('id_lot = ?');
        args.push(params.id_lot);
    }
    if (params.sex) {
        conditions.push('sex = ?');
        args.push(params.sex);
    }

    const limit = params.pageSize ?? 50;
    const offset = ((params.page ?? 1) - 1) * limit;

    return db.getAllAsync<Animal>(
        `SELECT * FROM ranch_animals WHERE ${conditions.join(' AND ')}
     ORDER BY code ASC LIMIT ? OFFSET ?`,
        [...args, limit, offset]
    );
}

/** Busca un animal por ID local o server_id */
export async function getAnimalById(id: string): Promise<Animal | null> {
    const db = await getDb();
    return db.getFirstAsync<Animal>(
        `SELECT * FROM ranch_animals WHERE id = ? OR server_id = ?`,
        [id, id]
    );
}

/** Busca animal por código dentro de un ranch */
export async function getAnimalByCode(id_ranch: string, code: string): Promise<Animal | null> {
    const db = await getDb();
    return db.getFirstAsync<Animal>(
        `SELECT * FROM ranch_animals WHERE id_ranch = ? AND code = ?`,
        [id_ranch, code]
    );
}

/** Actualiza estado productivo y lote (transición de ciclo) */
export async function updateAnimalProductiveStatus(
    id: string,
    id_productive_status: number,
    id_lot?: string
): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `UPDATE ranch_animals
     SET id_productive_status = ?,
         id_lot     = COALESCE(?, id_lot),
         updated_at = ?,
         is_synced  = 0,
         sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
     WHERE id = ?`,
        [id_productive_status, id_lot ?? null, now(), id]
    );
}

/** Da de baja un animal (Baja + Inactivo) */
export async function dischargeAnimal(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `UPDATE ranch_animals
     SET id_productive_status = ?,
         id_status  = ?,
         updated_at = ?,
         is_synced  = 0,
         sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
     WHERE id = ?`,
        [PRODUCTIVE_STATUSES.BAJA, ANIMAL_STATUSES.INACTIVO, now(), id]
    );
}

/** Asigna un animal a un lote sin cambiar su estado productivo */
export async function assignAnimalToLot(id: string, id_lot: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `UPDATE ranch_animals
         SET id_lot = ?, updated_at = ?,
             is_synced = 0,
             sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
        [id_lot, now(), id]
    );
}

/** Actualiza el peso actual del animal */
export async function updateAnimalWeight(id: string, weight: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `UPDATE ranch_animals
     SET weight = ?, updated_at = ?,
         is_synced = 0,
         sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
     WHERE id = ?`,
        [weight, now(), id]
    );
}

/** Pone animal en observación (cuarentena) */
export async function setAnimalObservation(id: string, inObservation: boolean): Promise<void> {
    const db = await getDb();
    const status = inObservation ? ANIMAL_STATUSES.OBSERVACION : ANIMAL_STATUSES.ACTIVO;
    await db.runAsync(
        `UPDATE ranch_animals SET id_status = ?, updated_at = ?,
     is_synced = 0,
     sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
     WHERE id = ?`,
        [status, now(), id]
    );
}

/**
 * Verifica si un animal tiene retiro sanitario activo.
 * Retorna true si NO puede venderse.
 */
export async function hasActiveWithdrawal(id_ranch_animal: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
     FROM treatments t
     JOIN animal_events ae ON ae.id = t.id_event
     WHERE ae.id_ranch_animal = ?
       AND t.withdrawal_end_date >= date('now')`,
        [id_ranch_animal]
    );
    return (row?.count ?? 0) > 0;
}

/**
 * Verifica si una vaca tiene diagnóstico 'pregnant' activo (sin parto asociado).
 * RN-13: No puede recibir nuevo servicio si tiene gestación activa.
 */
export async function hasActivePregnancy(id_ranch_animal: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
     FROM gestation_diagnoses gd
     JOIN breeding_services bs ON bs.id = gd.id_service
     JOIN animal_events ae ON ae.id = bs.id_event
     WHERE ae.id_ranch_animal = ?
       AND gd.result = 'pregnant'
       AND NOT EXISTS (
         SELECT 1 FROM parturitions p WHERE p.id_diagnosis = gd.id
       )`,
        [id_ranch_animal]
    );
    return (row?.count ?? 0) > 0;
}