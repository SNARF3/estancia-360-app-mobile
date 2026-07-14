import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerExit } from '../db.sqlite/repositories/events';

export type ExitReason = 'death' | 'discard' | 'loss' | 'other';

export interface ExitFormData {
    animalCode: string;
    reason: ExitReason | '';
    notes: string;
    eventDate: string;
}

const INITIAL: ExitFormData = {
    animalCode: '',
    reason: '',
    notes: '',
    eventDate: new Date().toISOString().split('T')[0],
};

export function useAnimalExit() {
    const [formData, setFormData] = useState<ExitFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof ExitFormData>(field: K, value: ExitFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) { setError('El código del animal es obligatorio.'); return false; }
        if (!formData.reason) { setError('Seleccioná el motivo de la baja.'); return false; }
        if (formData.reason === 'other' && !formData.notes.trim()) {
            setError('El campo "Observaciones" es obligatorio cuando el motivo es "Otro".'); return false;
        }
        if (!formData.eventDate) { setError('La fecha es obligatoria.'); return false; }

        setLoading(true);
        try {
            const { getDb } = await import('../db.sqlite/db-pool');
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const animal = await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ? COLLATE NOCASE LIMIT 1`,
                [session.id_ranch, formData.animalCode.trim()]
            );
            if (!animal) { setError(`No se encontró el animal "${formData.animalCode}".`); return false; }

            await registerExit({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                reason: formData.reason as ExitReason,
                notes: formData.notes || undefined,
                event_date: new Date(formData.eventDate).toISOString(),
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar la baja.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(INITIAL);
        setError(null);
        setSuccess(false);
    };

    return { formData, updateField, saveRecord, resetForm, loading, error, success };
}
