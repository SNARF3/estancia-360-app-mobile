// hooks/health/use-Treatment.ts

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerTreatment } from '../db.sqlite/repositories/events';

export interface TreatmentFormData {
    animalCode: string;
    eventDate: string;
    illness: string;
    medication: string;
    dose: string;
    durationDays: string;
    withdrawalDays: string;
    responsible: string;
    notes: string;
}

const initial: TreatmentFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    illness: '',
    medication: '',
    dose: '',
    durationDays: '',
    withdrawalDays: '',
    responsible: '',
    notes: '',
};

export function useTreatment() {
    const [formData, setFormData] = useState<TreatmentFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof TreatmentFormData>(
        field: K, value: TreatmentFormData[K]
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
        if (!formData.medication.trim()) {
            setError('El medicamento es obligatorio.'); return false;
        }
        if (!formData.eventDate) {
            setError('La fecha es obligatoria.'); return false;
        }

        const durationDays = formData.durationDays ? parseInt(formData.durationDays) : undefined;
        const withdrawalDays = formData.withdrawalDays ? parseInt(formData.withdrawalDays) : undefined;

        if (durationDays !== undefined && isNaN(durationDays)) {
            setError('La duración debe ser un número entero.'); return false;
        }
        if (withdrawalDays !== undefined && isNaN(withdrawalDays)) {
            setError('El período de retiro debe ser un número entero.'); return false;
        }

        setLoading(true);
        try {
            const { getDb } = await import('../db.sqlite/db-pool');
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const animal = await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM ranch_animals
                 WHERE id_ranch = ? AND code = ? COLLATE NOCASE AND id_status = 1 LIMIT 1`,
                [session.id_ranch, formData.animalCode.trim()]
            );
            if (!animal) {
                setError(`No se encontró el animal con código "${formData.animalCode}".`);
                return false;
            }

            await registerTreatment({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                event_date: new Date(formData.eventDate).toISOString(),
                illness: formData.illness || undefined,
                medication: formData.medication.trim(),
                dose: formData.dose || undefined,
                duration_days: durationDays,
                withdrawal_days: withdrawalDays,
                responsible: formData.responsible || undefined,
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el tratamiento.');
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
