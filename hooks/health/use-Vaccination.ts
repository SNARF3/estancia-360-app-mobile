// hooks/health/use-Vaccination.ts

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerVaccination } from '../db.sqlite/repositories/events';

export interface VaccineEntry {
    id: string;
    vaccineName: string;
    dose: string;
}

export interface VaccinationFormData {
    animalCode: string;
    eventDate: string;
    vaccines: VaccineEntry[];
    responsible: string;
    notes: string;
}

function makeEntry(): VaccineEntry {
    return { id: Math.random().toString(36).slice(2), vaccineName: '', dose: '' };
}

const initial: VaccinationFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    vaccines: [makeEntry()],
    responsible: '',
    notes: '',
};

export function useVaccination() {
    const [formData, setFormData] = useState<VaccinationFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof Omit<VaccinationFormData, 'vaccines'>>(
        field: K, value: VaccinationFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const updateVaccine = (id: string, field: keyof Omit<VaccineEntry, 'id'>, value: string) => {
        setFormData(prev => ({
            ...prev,
            vaccines: prev.vaccines.map(v => v.id === id ? { ...v, [field]: value } : v),
        }));
        setError(null);
    };

    const addVaccine = () => {
        setFormData(prev => ({ ...prev, vaccines: [...prev.vaccines, makeEntry()] }));
    };

    const removeVaccine = (id: string) => {
        setFormData(prev => ({
            ...prev,
            vaccines: prev.vaccines.length > 1
                ? prev.vaccines.filter(v => v.id !== id)
                : prev.vaccines,
        }));
    };

    const setVaccineName = (id: string, name: string) => {
        updateVaccine(id, 'vaccineName', name);
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
        const filled = formData.vaccines.filter(v => v.vaccineName.trim());
        if (filled.length === 0) {
            setError('Ingresá al menos una vacuna.'); return false;
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
                vaccines: filled.map(v => ({
                    vaccine_name: v.vaccineName.trim(),
                    dose: v.dose.trim() || undefined,
                })),
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
        setFormData({ ...initial, vaccines: [makeEntry()] });
        setError(null);
        setSuccess(false);
    };

    return {
        formData, updateField, updateVaccine, addVaccine, removeVaccine,
        setVaccineName, saveRecord, resetForm, loading, error, success,
    };
}
