// hooks/rearing/use-WeightRecord.ts
// Registro individual de pesaje para animales en Recría o Engorde

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerWeightRecord } from '../db.sqlite/repositories/events';

export interface WeightRecordFormData {
    animalCode: string;
    eventDate: string;
    weight: string;
    weightType: 'scale' | 'estimated';
    bodyCondition: number | null;
    notes: string;
}

const initial: WeightRecordFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    weight: '',
    weightType: 'scale',
    bodyCondition: null,
    notes: '',
};

export function useWeightRecord() {
    const [formData, setFormData] = useState<WeightRecordFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof WeightRecordFormData>(
        field: K, value: WeightRecordFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) {
            setError('El código del animal es obligatorio.'); return false;
        }
        const w = parseFloat(formData.weight);
        if (isNaN(w) || w <= 0) {
            setError('Ingresa un peso válido mayor a 0 kg.'); return false;
        }
        if (!formData.eventDate) {
            setError('La fecha es obligatoria.'); return false;
        }

        setLoading(true);
        try {
            const { getDb } = await import('../db.sqlite/db-pool');
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const animal = await db.getFirstAsync<{ id: string; id_lot: string | null }>(
                `SELECT id, id_lot FROM ranch_animals
                 WHERE id_ranch = ? AND code = ? COLLATE NOCASE AND id_status = 1 LIMIT 1`,
                [session.id_ranch, formData.animalCode.trim()]
            );
            if (!animal) {
                setError(`No se encontró el animal con código "${formData.animalCode}".`);
                return false;
            }
            if (!animal.id_lot) {
                setError('El animal no está registrado en ningún lote. Asignalo a un lote desde la pantalla de Potreros antes de registrar un pesaje.');
                return false;
            }

            console.log("DEBUG PESAJE: Animal encontrado:", {
                id: animal.id,
                id_lot: animal.id_lot,
                weightToRegister: w
            });

            await registerWeightRecord({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                id_lot: animal.id_lot || null,
                event_date: new Date(formData.eventDate).toISOString(),
                weight: w,
                weight_type: formData.weightType,
                body_condition: formData.bodyCondition ?? undefined,
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el pesaje.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(initial);
        setError(null);
        setSuccess(false);
    };

    return { formData, updateField, saveRecord, resetForm, loading, error, success };
}
