// hooks/health/use-Vaccination.ts

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerVaccination } from '../db.sqlite/repositories/events';

export interface VaccinationFormData {
    animalCode: string;
    eventDate: string;
    vaccineName: string;
    dose: string;
    responsible: string;
    notes: string;
}

const initial: VaccinationFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    vaccineName: '',
    dose: '',
    responsible: '',
    notes: '',
};

export function useVaccination() {
    const [formData, setFormData] = useState<VaccinationFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof VaccinationFormData>(
        field: K, value: VaccinationFormData[K]
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
        if (!formData.vaccineName.trim()) {
            setError('El nombre de la vacuna es obligatorio.'); return false;
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

            const animal = await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM ranch_animals
                 WHERE id_ranch = ? AND code = ? COLLATE NOCASE AND id_status = 1 LIMIT 1`,
                [session.id_ranch, formData.animalCode.trim()]
            );
            if (!animal) {
                setError(`No se encontró el animal con código "${formData.animalCode}".`);
                return false;
            }

            await registerVaccination({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                event_date: new Date(formData.eventDate).toISOString(),
                vaccine_name: formData.vaccineName.trim(),
                dose: formData.dose || undefined,
                responsible: formData.responsible || undefined,
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al guardar la vacunación.');
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
