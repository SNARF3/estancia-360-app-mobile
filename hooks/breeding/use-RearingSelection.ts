// hooks/breeding/use-RearingSelection.ts

import { useState } from 'react';
import { ANIMAL_STATUSES, EVENT_TYPES, PRODUCTIVE_STATUSES } from '../db.sqlite/database';
import { getDb } from '../db.sqlite/db-pool';
import { newId, now } from '../db.sqlite/db-utils';
import {
    findAnimalByCode,
    findLotByName,
    getActiveUserId,
} from './breeding.helpers';
import { Destination } from './breeding.types';

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export interface RearingSelectionFormData {
    animalCode: string;
    eventDate: string;
    destination: Destination;
    lotDestName?: string;
    weight_at_selection?: number | null;
    body_condition?: number | null;
    genetic_score?: number | null;
    age_days?: number | null;
    notes?: string;
}

const initialForm: RearingSelectionFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    destination: 'replacement',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRearingSelection() {
    const [formData, setFormData] = useState<RearingSelectionFormData>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof RearingSelectionFormData>(
        field: K,
        value: RearingSelectionFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveSelection = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        // ── Validaciones ──────────────────────────────────────────────────────────
        if (!formData.animalCode.trim()) {
            setError('El código del animal es obligatorio.');
            return false;
        }
        if (!formData.eventDate) {
            setError('La fecha de selección es obligatoria.');
            return false;
        }
        if (!formData.destination) {
            setError('El destino del animal es obligatorio.');
            return false;
        }
        if (
            (formData.destination === 'fattening' || formData.destination === 'replacement') &&
            !formData.lotDestName?.trim()
        ) {
            setError('El lote de destino es obligatorio para este destino.');
            return false;
        }

        setLoading(true);
        try {
            const db = await getDb();

            // ── Buscar animal ─────────────────────────────────────────────────────
            const animal = await findAnimalByCode(formData.animalCode);
            if (!animal) {
                setError(`No se encontró ningún animal con el código "${formData.animalCode}".`);
                return false;
            }
            if (animal.id_productive_status !== 2) {
                setError('El animal debe estar en etapa Recría para registrar una selección.');
                return false;
            }

            // ── Buscar lote de destino ────────────────────────────────────────────
            let id_lot_dest: string | null = null;
            if (formData.lotDestName?.trim()) {
                const lot = await findLotByName(formData.lotDestName);
                if (!lot) {
                    setError(`No se encontró ningún lote activo con el nombre "${formData.lotDestName}".`);
                    return false;
                }
                id_lot_dest = lot.id;
            }

            const id_user = await getActiveUserId();
            const ts = now();

            await db.withTransactionAsync(async () => {
                // 1. Crear animal_event para la selección
                const eventId = newId();
                await db.runAsync(
                    `INSERT INTO animal_events
             (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [eventId, id_user, animal.id, EVENT_TYPES.SELECCION_RECRIA,
                        formData.notes ?? null,
                        new Date(formData.eventDate).toISOString(), ts, ts]
                );

                // 2. Crear rearing_selection
                const selectionId = newId();
                await db.runAsync(
                    `INSERT INTO rearing_selections
             (id, id_event, id_lot_dest, destination, weight_at_selection, body_condition, genetic_score, age_days, notes, created_at, updated_at, is_synced, sync_action)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                    [selectionId, eventId, id_lot_dest,
                        formData.destination,
                        formData.weight_at_selection ?? null,
                        formData.body_condition ?? null,
                        formData.genetic_score ?? null,
                        formData.age_days ?? null,
                        formData.notes ?? null, ts, ts]
                );

                // 3. Acciones según destino
                if (formData.destination === 'fattening') {
                    // Crear fattening_entry
                    const fattEventId = newId();
                    await db.runAsync(
                        `INSERT INTO animal_events
               (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [fattEventId, id_user, animal.id, EVENT_TYPES.ENTRADA_ENGORDE,
                            null, new Date(formData.eventDate).toISOString(), ts, ts]
                    );
                    await db.runAsync(
                        `INSERT INTO fattening_entries
               (id, id_event, system_type, initial_weight, notes, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,'field',?,?,?,?,0,'INSERT')`,
                        [newId(), fattEventId,
                        formData.weight_at_selection ?? null,
                        formData.notes ?? null, ts, ts]
                    );
                    // Actualizar animal a Engorde
                    await db.runAsync(
                        `UPDATE ranch_animals
             SET id_productive_status = ?, id_lot = COALESCE(?, id_lot), updated_at = ?,
                 is_synced = 0,
                 sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
             WHERE id = ?`,
                        [PRODUCTIVE_STATUSES.ENGORDE, id_lot_dest, ts, animal.id]
                    );

                } else if (formData.destination === 'sale') {
                    // Crear animal_sale
                    const saleEventId = newId();
                    await db.runAsync(
                        `INSERT INTO animal_events
               (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [saleEventId, id_user, animal.id, EVENT_TYPES.VENTA,
                            null, new Date(formData.eventDate).toISOString(), ts, ts]
                    );
                    await db.runAsync(
                        `INSERT INTO animal_sales
               (id, id_event, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,?,?,0,'INSERT')`,
                        [newId(), saleEventId, ts, ts]
                    );
                    // Dar de baja el animal
                    await db.runAsync(
                        `UPDATE ranch_animals
             SET id_productive_status = ?, id_status = ?, updated_at = ?,
                 is_synced = 0,
                 sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
             WHERE id = ?`,
                        [PRODUCTIVE_STATUSES.BAJA, ANIMAL_STATUSES.INACTIVO, ts, animal.id]
                    );

                } else if (formData.destination === 'replacement' && id_lot_dest) {
                    // Solo mover al lote de reposición, status sigue en Recría
                    await db.runAsync(
                        `UPDATE ranch_animals
             SET id_lot = ?, updated_at = ?,
                 is_synced = 0,
                 sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
             WHERE id = ?`,
                        [id_lot_dest, ts, animal.id]
                    );
                }
            });

            setSuccess(true);
            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al guardar la selección.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(initialForm);
        setError(null);
        setSuccess(false);
    };

    return { formData, updateField, saveSelection, resetForm, loading, error, success };
}