/**
 * repositories/events.ts
 * Estancia360 — Tabla pivot animal_events + módulo Cría completo
 *
 * Patrón de uso:
 *   Siempre crear primero el animal_event, luego el registro de detalle.
 *   Ambas operaciones van dentro de withTransactionAsync para atomicidad.
 */

import { ANIMAL_STATUSES, EVENT_TYPES, PRODUCTIVE_STATUSES } from '../database';
import { getDb } from '../db-pool';
import { calcWithdrawalEnd, newId, now } from '../db-utils';
import {
    createAnimal,
    dischargeAnimal,
    hasActivePregnancy,
    hasActiveWithdrawal,
    setAnimalObservation,
    updateAnimalProductiveStatus,
    updateAnimalWeight,
    type CreateAnimalInput,
} from './animals';

// ─── Evento base ──────────────────────────────────────────────────────────────

export interface AnimalEvent {
    id: string;
    server_id?: string;
    id_user: string;
    id_ranch_animal: string;
    id_event_type: number;
    notes?: string;
    event_date: string;
    created_at: string;
    updated_at: string;
    is_synced: number;
}

async function createEvent(params: {
    id_user: string;
    id_ranch_animal: string;
    id_event_type: number;
    event_date: string;
    notes?: string;
}): Promise<AnimalEvent> {
    const db = await getDb();
    const ts = now();
    const event: AnimalEvent = {
        id: newId(),
        id_user: params.id_user,
        id_ranch_animal: params.id_ranch_animal,
        id_event_type: params.id_event_type,
        event_date: params.event_date,
        notes: params.notes,
        created_at: ts,
        updated_at: ts,
        is_synced: 0,
    };

    try {
        await db.runAsync(
            `INSERT INTO animal_events
           (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
         VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
            [event.id, event.id_user, event.id_ranch_animal, event.id_event_type,
            event.notes ?? null, event.event_date, event.created_at, event.updated_at]
        );
    } catch (err) {
        // Diagnóstico 2026-08-09: createEvent es el paso compartido por TODOS los
        // registros de eventos (Cría/Recría/Engorde/Sanidad) — si esto explota con
        // "no such table" de nuevo pese al fix de migrations.ts, esto deja registrado
        // en qué estado real estaba el schema en el momento exacto del fallo.
        const tables = await db.getAllAsync<{ name: string }>(
            `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'animal_events%'`
        ).catch(() => []);
        console.error('[events] createEvent falló. Tablas animal_events*:', tables, 'Error:', err);
        throw err;
    }

    return event;
}

// ─── MÓDULO CRÍA — Servicio reproductivo ─────────────────────────────────────

export interface CreateBreedingServiceInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    service_type: 'natural' | 'artificial_insemination' | 'embryo_transfer';
    id_animal_male?: string;
    semen_breed?: string;
    technician?: string;
    reproductive_lot?: string;
    notes?: string;
}

export async function registerBreedingService(input: CreateBreedingServiceInput) {
    const db = await getDb();

    const pregnant = await hasActivePregnancy(input.id_ranch_animal);
    if (pregnant) throw new Error('RN-13: La vaca tiene una gestación activa.');

    let event_id = '';
    let service_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.SERVICIO,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO breeding_services
         (id, id_event, id_animal_male, service_type, semen_breed, technician, reproductive_lot, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.id_animal_male ?? null, input.service_type,
                input.semen_breed ?? null, input.technician ?? null,
                input.reproductive_lot ?? null, ts, ts]
        );

        event_id = event.id;
        service_id = id;
    });

    return { event_id, service_id };
}

// ─── MÓDULO CRÍA — Diagnóstico de gestación ───────────────────────────────────

export interface CreateGestationDiagnosisInput {
    id_user: string;
    id_ranch_animal: string;
    id_service: string;
    event_date: string;
    method: 'palpation' | 'ultrasound';
    result: 'pregnant' | 'empty';
    gestation_days?: number;
    estimated_birth?: string;
    veterinarian?: string;
    notes?: string;
}

export async function registerGestationDiagnosis(input: CreateGestationDiagnosisInput) {
    const db = await getDb();

    let event_id = '';
    let diagnosis_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.DIAGNOSTICO,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO gestation_diagnoses
         (id, id_event, id_service, method, result, gestation_days, estimated_birth, veterinarian, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.id_service, input.method, input.result,
                input.gestation_days ?? null, input.estimated_birth ?? null,
                input.veterinarian ?? null, ts, ts]
        );

        event_id = event.id;
        diagnosis_id = id;
    });

    return { event_id, diagnosis_id };
}

// ─── MÓDULO CRÍA — Parto ───────────────────────────────────────────────────────

export interface CreateParturitionInput {
    id_user: string;
    id_ranch_animal: string;
    id_ranch: string;
    id_diagnosis: string;
    event_date: string;
    birth_type: 'normal' | 'assisted' | 'cesarean';
    cria_status: 'alive' | 'dead';
    cria_weight?: number;
    mother_condition?: 'good' | 'regular' | 'bad';
    notes?: string;
    cria?: {
        code: string;
        sex: 'M' | 'F';
        id_animal_class: number;
        id_lot?: string;
        id_breed?: number;
    };
}

export async function registerParturition(input: CreateParturitionInput) {
    const db = await getDb();

    if (input.cria_status === 'alive' && !input.cria) {
        throw new Error('RF-04.7: Se deben proveer datos de la cría para cria_status=alive.');
    }

    let event_id = '';
    let parturition_id = '';
    let id_cria: string | null = null;

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.PARTO,
            event_date: input.event_date,
            notes: input.notes,
        });

        if (input.cria_status === 'alive' && input.cria) {
            const criaInput: CreateAnimalInput = {
                id_ranch: input.id_ranch,
                id_mother: input.id_ranch_animal,
                id_breed: input.cria.id_breed ?? 1,
                id_productive_status: PRODUCTIVE_STATUSES.CRIA,
                id_animal_class: input.cria.id_animal_class,
                id_lot: input.cria.id_lot,
                code: input.cria.code,
                birthdate: input.event_date.split('T')[0],
                sex: input.cria.sex,
                origin: 'born',
            };
            const cria = await createAnimal(criaInput);
            id_cria = cria.id;
        }

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO parturitions
         (id, id_event, id_diagnosis, birth_type, id_cria, cria_weight, cria_status, mother_condition, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.id_diagnosis, input.birth_type,
                id_cria, input.cria_weight ?? null, input.cria_status,
                input.mother_condition ?? null, ts, ts]
        );

        event_id = event.id;
        parturition_id = id;
    });

    return { event_id, parturition_id, id_cria };
}

// ─── MÓDULO CRÍA — Destete ────────────────────────────────────────────────────

export interface CreateWeaningInput {
    id_user: string;
    id_cria: string;
    id_lot_dest: string;
    event_date: string;
    weaning_weight?: number;
    weaning_age?: number;
    notes?: string;
}

export async function registerWeaning(input: CreateWeaningInput) {
    const db = await getDb();

    let event_id = '';
    let weaning_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_cria,
            id_event_type: EVENT_TYPES.DESTETE,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO weanings
         (id, id_event, id_cria, id_lot_dest, weaning_weight, weaning_age, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.id_cria, input.id_lot_dest,
                input.weaning_weight ?? null, input.weaning_age ?? null, ts, ts]
        );

        await updateAnimalProductiveStatus(input.id_cria, PRODUCTIVE_STATUSES.RECRIA, input.id_lot_dest);
        if (input.weaning_weight) await updateAnimalWeight(input.id_cria, input.weaning_weight);

        event_id = event.id;
        weaning_id = id;
    });

    return { event_id, weaning_id };
}

// ─── MÓDULO RECRÍA/ENGORDE — Pesaje ───────────────────────────────────────────

export interface CreateWeightRecordInput {
    id_user: string;
    id_ranch_animal: string;
    id_lot?: string | null;
    event_date: string;
    weight: number;
    weight_type: 'scale' | 'estimated';
    body_condition?: number;
    age_days?: number;
    notes?: string;
}

export async function registerWeightRecord(input: CreateWeightRecordInput) {
    const db = await getDb();

    let event_id = '';
    let weight_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.PESO,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO weight_records
         (id, id_event, id_lot, weight, weight_type, body_condition, age_days, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.id_lot ?? null, input.weight, input.weight_type,
                input.body_condition ?? null, input.age_days ?? null, ts, ts]
        );

        await updateAnimalWeight(input.id_ranch_animal, input.weight);

        event_id = event.id;
        weight_id = id;
    });

    return { event_id, weight_id };
}

// ─── MÓDULO MOVIMIENTOS — batch-first (movements + movement_animals) ─────────
// Matchea el modelo real del backend: un movement agrupa N movement_animals con
// cabecera compartida. sale queda 'pending' hasta confirmar/rechazar cada animal
// (ver confirmMovementAnimal); purchase/pasture_transfer/ranch_exit van directo
// a 'confirmed'. Reemplaza los viejos registerSale/registerPurchase/registerTransfer
// (uno por animal, sin agrupación) — ver migrations.ts v1 para el reemplazo de schema.

export interface MovementAnimalInput {
    id_ranch_animal?: string;   // requerido excepto en purchase
    id_lot_dest?: string;       // requerido en pasture_transfer
    notes?: string;
    newAnimal?: {                // requerido únicamente en purchase
        code: string;
        sex: 'M' | 'F';
        id_breed: number;
        id_animal_class: number;
        birthdate: string;
        weight?: number;
        id_lot?: string;
        id_productive_status?: number;
    };
}

export interface CreateMovementInput {
    id_user: string;
    id_ranch: string;
    movement_type: 'sale' | 'purchase' | 'pasture_transfer' | 'ranch_exit';
    event_date: string;
    counterpart_name?: string;
    origin_name?: string;
    total_price?: number;
    price_per_kg?: number;
    notes?: string;
    animals: MovementAnimalInput[];
}

export async function registerMovement(input: CreateMovementInput) {
    if (input.animals.length === 0) throw new Error('Un movimiento necesita al menos un animal.');

    if (input.movement_type === 'sale') {
        for (const a of input.animals) {
            if (a.id_ranch_animal && (await hasActiveWithdrawal(a.id_ranch_animal))) {
                throw new Error('RN-18: uno o más animales tienen un período de retiro sanitario activo.');
            }
        }
    }

    const db = await getDb();
    const ts = now();
    const movementId = newId();
    const status: 'pending' | 'confirmed' = input.movement_type === 'sale' ? 'pending' : 'confirmed';
    const movementAnimalIds: string[] = [];

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `INSERT INTO movements
         (id, id_ranch, movement_type, status, movement_date, counterpart_name, origin_name, total_price, price_per_kg, notes, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [movementId, input.id_ranch, input.movement_type, status, input.event_date,
                input.counterpart_name ?? null, input.origin_name ?? null,
                input.total_price ?? null, input.price_per_kg ?? null, input.notes ?? null, ts, ts]
        );

        for (const animalDto of input.animals) {
            const maId = newId();

            if (input.movement_type === 'purchase') {
                const data = animalDto.newAnimal!;
                const animal = await createAnimal({
                    id_ranch: input.id_ranch,
                    id_breed: data.id_breed,
                    id_animal_class: data.id_animal_class,
                    id_productive_status: data.id_productive_status ?? PRODUCTIVE_STATUSES.CRIA,
                    id_lot: data.id_lot,
                    code: data.code,
                    birthdate: data.birthdate,
                    weight: data.weight,
                    sex: data.sex,
                    origin: 'purchased',
                });

                const event = await createEvent({
                    id_user: input.id_user,
                    id_ranch_animal: animal.id,
                    id_event_type: EVENT_TYPES.COMPRA,
                    event_date: input.event_date,
                    notes: animalDto.notes,
                });

                await db.runAsync(
                    `INSERT INTO movement_animals
             (id, id_movement, id_ranch_animal, id_lot_dest, status, id_event, notes,
              new_code, new_sex, new_id_breed, new_id_animal_class, new_birthdate, new_weight, new_id_lot, new_id_productive_status,
              created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [maId, movementId, animal.id, data.id_lot ?? null, 'confirmed', event.id, animalDto.notes ?? null,
                        data.code, data.sex, data.id_breed, data.id_animal_class, data.birthdate,
                        data.weight ?? null, data.id_lot ?? null, data.id_productive_status ?? null, ts, ts]
                );
            } else if (input.movement_type === 'sale') {
                const animalId = animalDto.id_ranch_animal!;
                const animal = await db.getFirstAsync<{ id_status: number; id_lot: string | null }>(
                    `SELECT id_status, id_lot FROM ranch_animals WHERE id = ?`, [animalId]
                );

                await db.runAsync(
                    `INSERT INTO movement_animals
             (id, id_movement, id_ranch_animal, id_lot_origin, prev_id_status, status, notes, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [maId, movementId, animalId, animal?.id_lot ?? null, animal?.id_status ?? null,
                        'pending', animalDto.notes ?? null, ts, ts]
                );

                await db.runAsync(
                    `UPDATE ranch_animals SET id_status = ?, updated_at = ?,
             is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
           WHERE id = ?`,
                    [ANIMAL_STATUSES.PENDIENTE_MOVIMIENTO, ts, animalId]
                );
            } else if (input.movement_type === 'pasture_transfer') {
                const animalId = animalDto.id_ranch_animal!;
                const animal = await db.getFirstAsync<{ id_status: number; id_lot: string | null }>(
                    `SELECT id_status, id_lot FROM ranch_animals WHERE id = ?`, [animalId]
                );

                const event = await createEvent({
                    id_user: input.id_user,
                    id_ranch_animal: animalId,
                    id_event_type: EVENT_TYPES.TRANSFERENCIA,
                    event_date: input.event_date,
                    notes: animalDto.notes,
                });

                await db.runAsync(
                    `INSERT INTO movement_animals
             (id, id_movement, id_ranch_animal, id_lot_origin, id_lot_dest, prev_id_status, status, id_event, notes, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [maId, movementId, animalId, animal?.id_lot ?? null, animalDto.id_lot_dest ?? null,
                        animal?.id_status ?? null, 'confirmed', event.id, animalDto.notes ?? null, ts, ts]
                );

                await db.runAsync(`UPDATE ranch_animals SET id_lot = ?, updated_at = ? WHERE id = ?`, [animalDto.id_lot_dest ?? null, ts, animalId]);
            } else if (input.movement_type === 'ranch_exit') {
                const animalId = animalDto.id_ranch_animal!;
                const animal = await db.getFirstAsync<{ id_status: number; id_lot: string | null }>(
                    `SELECT id_status, id_lot FROM ranch_animals WHERE id = ?`, [animalId]
                );

                const event = await createEvent({
                    id_user: input.id_user,
                    id_ranch_animal: animalId,
                    id_event_type: EVENT_TYPES.SALIDA,
                    event_date: input.event_date,
                    notes: animalDto.notes,
                });

                await db.runAsync(
                    `INSERT INTO movement_animals
             (id, id_movement, id_ranch_animal, id_lot_origin, prev_id_status, status, id_event, notes, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [maId, movementId, animalId, animal?.id_lot ?? null, animal?.id_status ?? null,
                        'confirmed', event.id, animalDto.notes ?? null, ts, ts]
                );

                await db.runAsync(
                    `UPDATE ranch_animals SET id_status = ?, id_productive_status = ?, updated_at = ?,
             is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
           WHERE id = ?`,
                    [ANIMAL_STATUSES.VENDIDO, PRODUCTIVE_STATUSES.BAJA, ts, animalId]
                );
            }

            movementAnimalIds.push(maId);
        }
    });

    return { movement_id: movementId, movement_animal_ids: movementAnimalIds };
}

/**
 * Confirma o rechaza UN animal de una venta pendiente.
 * accepted → vendido+baja (irreversible). rejected → revierte a prev_id_status.
 */
export async function confirmMovementAnimal(idMovementAnimal: string, id_user: string, status: 'accepted' | 'rejected', notes?: string) {
    const db = await getDb();
    const ts = now();

    const ma = await db.getFirstAsync<{ id_ranch_animal: string; prev_id_status: number | null; id_movement: string }>(
        `SELECT id_ranch_animal, prev_id_status, id_movement FROM movement_animals WHERE id = ?`, [idMovementAnimal]
    );
    if (!ma) throw new Error(`movement_animal ID=${idMovementAnimal} no encontrado.`);

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `UPDATE movement_animals SET status = ?, notes = COALESCE(?, notes), updated_at = ?,
       is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
       WHERE id = ?`,
            [status, notes ?? null, ts, idMovementAnimal]
        );

        if (status === 'accepted') {
            await db.runAsync(
                `UPDATE ranch_animals SET id_status = ?, id_productive_status = ?, updated_at = ?,
         is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [ANIMAL_STATUSES.VENDIDO, PRODUCTIVE_STATUSES.BAJA, ts, ma.id_ranch_animal]
            );

            const event = await createEvent({
                id_user,
                id_ranch_animal: ma.id_ranch_animal,
                id_event_type: EVENT_TYPES.VENTA,
                event_date: ts,
            });
            await db.runAsync(`UPDATE movement_animals SET id_event = ? WHERE id = ?`, [event.id, idMovementAnimal]);
        } else {
            await db.runAsync(
                `UPDATE ranch_animals SET id_status = ?, updated_at = ?,
         is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
         WHERE id = ?`,
                [ma.prev_id_status ?? ANIMAL_STATUSES.ACTIVO, ts, ma.id_ranch_animal]
            );
        }
    });
}

/**
 * Cancela un movimiento pendiente (venta) completo — equivalente local a
 * PATCH /movements/:id/cancel. Solo aplica a movements en status='pending' (hoy
 * únicamente 'sale' puede quedar pending; el resto de los tipos van directo a
 * 'confirmed' en registerMovement). Animales todavía 'pending' revierten a
 * prev_id_status; animales ya 'accepted' NO se tocan (RN-07, venta irreversible),
 * igual que CancelMovementUseCase en el backend.
 */
export async function cancelMovement(idMovement: string) {
    const db = await getDb();
    const ts = now();

    const movement = await db.getFirstAsync<{ status: string; sync_action: string; server_id: string | null }>(
        `SELECT status, sync_action, server_id FROM movements WHERE id = ?`, [idMovement]
    );
    if (!movement) throw new Error(`Movimiento ID=${idMovement} no encontrado.`);
    if (movement.status === 'cancelled') return; // idempotente
    if (movement.status === 'confirmed') throw new Error('Este movimiento ya fue confirmado — no se puede cancelar (RN-07).');

    const animals = await db.getAllAsync<{ id: string; id_ranch_animal: string; status: string; prev_id_status: number | null }>(
        `SELECT id, id_ranch_animal, status, prev_id_status FROM movement_animals WHERE id_movement = ?`, [idMovement]
    );

    // Si el movement nunca llegó a sincronizarse, el servidor nunca lo vio — no hay
    // nada que reconciliar ahí. Se archiva localmente como sincronizado (nada que
    // mandar) en vez de dejarlo pendiente, que produciría un `create` de una venta
    // ya cancelada (buildMovementsBatch no manda `status`, así que el servidor la
    // registraría como pending de nuevo, ignorando la cancelación local).
    const neverSynced = movement.sync_action === 'INSERT' && !movement.server_id;

    await db.withTransactionAsync(async () => {
        for (const a of animals) {
            if (a.status === 'pending') {
                await db.runAsync(
                    `UPDATE ranch_animals SET id_status = ?, updated_at = ?,
             is_synced = 0, sync_action = CASE WHEN sync_action='INSERT' THEN 'INSERT' ELSE 'UPDATE' END
           WHERE id = ?`,
                    [a.prev_id_status ?? ANIMAL_STATUSES.ACTIVO, ts, a.id_ranch_animal]
                );
            }
        }

        if (neverSynced) {
            await db.runAsync(
                `UPDATE movements SET status = 'cancelled', updated_at = ?, is_synced = 1, synced_at = ? WHERE id = ?`,
                [ts, ts, idMovement]
            );
            await db.runAsync(
                `UPDATE movement_animals SET is_synced = 1, synced_at = ? WHERE id_movement = ?`,
                [ts, idMovement]
            );
        } else {
            await db.runAsync(
                `UPDATE movements SET status = 'cancelled', updated_at = ?, is_synced = 0, sync_action = 'UPDATE' WHERE id = ?`,
                [ts, idMovement]
            );
        }
    });
}

// ─── MÓDULO MOVIMIENTOS — Salida (muerte/descarte) ────────────────────────────

export interface CreateExitInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    reason: 'death' | 'discard' | 'loss' | 'other';
    notes?: string;
}

export async function registerExit(input: CreateExitInput) {
    const db = await getDb();

    let event_id = '';
    let exit_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.SALIDA,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO animal_exits
         (id, id_event, reason, notes, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.reason, input.notes ?? null, ts, ts]
        );

        await dischargeAnimal(input.id_ranch_animal);

        event_id = event.id;
        exit_id = id;
    });

    return { event_id, exit_id };
}

// ─── MÓDULO SANIDAD — Tratamiento ─────────────────────────────────────────────

export interface MedItem {
    medication: string;
    dose?: string;
    duration_days?: number;
    withdrawal_days?: number;
}

export interface CreateTreatmentInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    illness?: string;
    meds: MedItem[];
    responsible?: string;
    notes?: string;
}

export async function registerTreatment(input: CreateTreatmentInput) {
    const db = await getDb();

    let event_id = '';
    const treatment_ids: string[] = [];

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.TRATAMIENTO,
            event_date: input.event_date,
            notes: input.notes,
        });

        const ts = now();
        for (const med of input.meds) {
            const id = newId();
            const withdrawal_end_date = (med.withdrawal_days && med.withdrawal_days > 0)
                ? calcWithdrawalEnd(input.event_date, med.withdrawal_days)
                : null;
            await db.runAsync(
                `INSERT INTO treatments
                 (id, id_event, illness, medication, dose, duration_days, withdrawal_days, withdrawal_end_date, responsible, notes, created_at, updated_at, is_synced, sync_action)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                [id, event.id, input.illness ?? null, med.medication,
                    med.dose ?? null, med.duration_days ?? null,
                    med.withdrawal_days ?? null, withdrawal_end_date,
                    input.responsible ?? null, input.notes ?? null, ts, ts]
            );
            treatment_ids.push(id);
        }

        event_id = event.id;
    });

    return { event_id, treatment_ids };
}

// ─── MÓDULO SANIDAD — Incidente ───────────────────────────────────────────────

export interface CreateHealthIncidentInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    incident_type: 'illness_detected' | 'quarantine';
    description?: string;
    notes?: string;
}

export async function registerHealthIncident(input: CreateHealthIncidentInput) {
    const db = await getDb();

    let event_id = '';
    let incident_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.INCIDENTE,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO health_incidents
         (id, id_event, incident_type, description, notes, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.incident_type, input.description ?? null, input.notes ?? null, ts, ts]
        );

        if (input.incident_type === 'quarantine') {
            await setAnimalObservation(input.id_ranch_animal, true);
        }

        event_id = event.id;
        incident_id = id;
    });

    return { event_id, incident_id };
}

// ─── MÓDULO SANIDAD — Vacunación ─────────────────────────────────────────────

export interface VaccineItem {
    vaccine_name: string;
    dose?: string;
}

export interface CreateVaccinationInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    vaccines: VaccineItem[];
    responsible?: string;
    notes?: string;
}

export async function registerVaccination(input: CreateVaccinationInput) {
    const db = await getDb();

    let event_id = '';
    const vaccination_ids: string[] = [];

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.VACUNACION,
            event_date: input.event_date,
            notes: input.notes,
        });

        const ts = now();
        for (const vaccine of input.vaccines) {
            const id = newId();
            await db.runAsync(
                `INSERT INTO vaccinations
             (id, id_event, vaccine_name, dose, responsible, notes, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                [id, event.id, vaccine.vaccine_name, vaccine.dose ?? null,
                    input.responsible ?? null, input.notes ?? null, ts, ts]
            );
            vaccination_ids.push(id);
        }

        event_id = event.id;
    });

    return { event_id, vaccination_ids };
}


// ─── MÓDULO ALIMENTACIÓN — registro por lote ─────────────────────────────────
// A propósito NO pasa por createEvent: feed_records es el único tipo de registro
// del sistema que no genera animal_event — se gestiona por lote, no por animal
// individual (así lo documenta el backend explícitamente).

export interface CreateFeedRecordInput {
    id_user: string;
    id_lot: string;
    feed_date: string;
    feed_type: string;
    quantity?: number;
    unit?: string;
    cost?: number;
    notes?: string;
}

export async function registerFeedRecord(input: CreateFeedRecordInput) {
    const db = await getDb();
    const id = newId();
    const ts = now();
    await db.runAsync(
        `INSERT INTO feed_records
       (id, id_lot, id_user, feed_date, feed_type, quantity, unit, cost, notes,
        created_at, updated_at, is_synced, sync_action)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
        [id, input.id_lot, input.id_user, input.feed_date, input.feed_type,
        input.quantity ?? null, input.unit ?? null, input.cost ?? null, input.notes ?? null,
        ts, ts]
    );
    return { id };
}

// ─── Historial de eventos de un animal ───────────────────────────────────────

export async function getAnimalEvents(id_ranch_animal: string): Promise<AnimalEvent[]> {
    const db = await getDb();
    return db.getAllAsync<AnimalEvent>(
        `SELECT * FROM animal_events WHERE id_ranch_animal = ? ORDER BY event_date DESC`,
        [id_ranch_animal]
    );
}