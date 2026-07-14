import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerTreatment } from '../db.sqlite/repositories/events';

export interface MedEntry {
    id: string;
    medication: string;
    dose: string;
    durationDays: string;
    withdrawalDays: string;
}

export interface TreatmentFormData {
    animalCode: string;
    eventDate: string;
    illness: string;
    meds: MedEntry[];
    responsible: string;
    notes: string;
}

function makeMed(): MedEntry {
    return { id: Math.random().toString(36).slice(2), medication: '', dose: '', durationDays: '', withdrawalDays: '' };
}

const initial: TreatmentFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    illness: '',
    meds: [makeMed()],
    responsible: '',
    notes: '',
};

export function useTreatment() {
    const [formData, setFormData] = useState<TreatmentFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof Omit<TreatmentFormData, 'meds'>>(
        field: K, value: TreatmentFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const updateMed = (id: string, field: keyof Omit<MedEntry, 'id'>, value: string) => {
        setFormData(prev => ({
            ...prev,
            meds: prev.meds.map(m => m.id === id ? { ...m, [field]: value } : m),
        }));
        setError(null);
    };

    const addMed = () => {
        setFormData(prev => ({ ...prev, meds: [...prev.meds, makeMed()] }));
    };

    const removeMed = (id: string) => {
        setFormData(prev => ({
            ...prev,
            meds: prev.meds.length > 1 ? prev.meds.filter(m => m.id !== id) : prev.meds,
        }));
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) {
            setError('El código del animal es obligatorio.'); return false;
        }
        if (!formData.eventDate) {
            setError('La fecha es obligatoria.'); return false;
        }

        const filled = formData.meds.filter(m => m.medication.trim());
        if (filled.length === 0) {
            setError('Ingresá al menos un medicamento.'); return false;
        }

        for (const m of filled) {
            if (m.durationDays && isNaN(parseInt(m.durationDays))) {
                setError('La duración debe ser un número entero.'); return false;
            }
            if (m.withdrawalDays && isNaN(parseInt(m.withdrawalDays))) {
                setError('El período de retiro debe ser un número entero.'); return false;
            }
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
                meds: filled.map(m => ({
                    medication: m.medication.trim(),
                    dose: m.dose.trim() || undefined,
                    duration_days: m.durationDays ? parseInt(m.durationDays) : undefined,
                    withdrawal_days: m.withdrawalDays ? parseInt(m.withdrawalDays) : undefined,
                })),
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
        setFormData({ ...initial, meds: [makeMed()] });
        setError(null);
        setSuccess(false);
    };

    return { formData, updateField, updateMed, addMed, removeMed, saveRecord, resetForm, loading, error, success };
}
