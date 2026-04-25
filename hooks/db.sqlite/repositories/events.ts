/**
 * repositories/events.ts
 * Estancia360 — Tabla pivot animal_events + módulo Cría completo
 *
 * Patrón de uso:
 *   Siempre crear primero el animal_event, luego el registro de detalle.
 *   Ambas operaciones van dentro de withTransactionAsync para atomicidad.
 */

import { EVENT_TYPES, PRODUCTIVE_STATUSES } from '../database';
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

    await db.runAsync(
        `INSERT INTO animal_events
       (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
     VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
        [event.id, event.id_user, event.id_ranch_animal, event.id_event_type,
        event.notes ?? null, event.event_date, event.created_at, event.updated_at]
    );

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
    id_lot: string;
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
            [id, event.id, input.id_lot, input.weight, input.weight_type,
                input.body_condition ?? null, input.age_days ?? null, ts, ts]
        );

        await updateAnimalWeight(input.id_ranch_animal, input.weight);

        event_id = event.id;
        weight_id = id;
    });

    return { event_id, weight_id };
}

// ─── MÓDULO MOVIMIENTOS — Venta ───────────────────────────────────────────────

export interface CreateSaleInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    buyer?: string;
    destination?: string;
    sale_price?: number;
    price_per_kg?: number;
    notes?: string;
}

export async function registerSale(input: CreateSaleInput) {
    const underWithdrawal = await hasActiveWithdrawal(input.id_ranch_animal);
    if (underWithdrawal) throw new Error('RN-18: Animal con período de retiro sanitario activo.');

    const db = await getDb();

    let event_id = '';
    let sale_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.VENTA,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO animal_sales
         (id, id_event, buyer, destination, sale_price, price_per_kg, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.buyer ?? null, input.destination ?? null,
                input.sale_price ?? null, input.price_per_kg ?? null, ts, ts]
        );

        await dischargeAnimal(input.id_ranch_animal);

        event_id = event.id;
        sale_id = id;
    });

    return { event_id, sale_id };
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

export interface CreateTreatmentInput {
    id_user: string;
    id_ranch_animal: string;
    event_date: string;
    illness?: string;
    medication: string;
    dose?: string;
    duration_days?: number;
    withdrawal_days?: number;
    responsible?: string;
    notes?: string;
}

export async function registerTreatment(input: CreateTreatmentInput) {
    const db = await getDb();

    const withdrawal_end_date = (input.withdrawal_days && input.withdrawal_days > 0)
        ? calcWithdrawalEnd(input.event_date, input.withdrawal_days)
        : null;

    let event_id = '';
    let treatment_id = '';

    await db.withTransactionAsync(async () => {
        const event = await createEvent({
            id_user: input.id_user,
            id_ranch_animal: input.id_ranch_animal,
            id_event_type: EVENT_TYPES.TRATAMIENTO,
            event_date: input.event_date,
            notes: input.notes,
        });

        const id = newId();
        const ts = now();
        await db.runAsync(
            `INSERT INTO treatments
         (id, id_event, illness, medication, dose, duration_days, withdrawal_days, withdrawal_end_date, responsible, notes, created_at, updated_at, is_synced, sync_action)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
            [id, event.id, input.illness ?? null, input.medication,
                input.dose ?? null, input.duration_days ?? null,
                input.withdrawal_days ?? null, withdrawal_end_date,
                input.responsible ?? null, input.notes ?? null, ts, ts]
        );

        event_id = event.id;
        treatment_id = id;
    });

    return { event_id, treatment_id };
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

// ─── Historial de eventos de un animal ───────────────────────────────────────

export async function getAnimalEvents(id_ranch_animal: string): Promise<AnimalEvent[]> {
    const db = await getDb();
    return db.getAllAsync<AnimalEvent>(
        `SELECT * FROM animal_events WHERE id_ranch_animal = ? ORDER BY event_date DESC`,
        [id_ranch_animal]
    );
}