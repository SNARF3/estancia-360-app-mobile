import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerMovement } from '../db.sqlite/repositories/events';

export interface RanchExitAnimalRow {
    id: string;
    code: string;
}

export interface RanchExitFormData {
    animals: RanchExitAnimalRow[];
    destinationRanch: string;
    eventDate: string;
    notes: string;
}

const INITIAL: RanchExitFormData = {
    animals: [],
    destinationRanch: '',
    eventDate: new Date().toISOString().split('T')[0],
    notes: '',
};

/** Salida definitiva a otra estancia (sin venta comercial) — confirmado directo, IRREVERSIBLE. */
export function useAnimalRanchExit() {
    const [formData, setFormData] = useState<RanchExitFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof RanchExitFormData>(field: K, value: RanchExitFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const addAnimals = (animals: RanchExitAnimalRow[]) => {
        setFormData((prev) => {
            const existingIds = new Set(prev.animals.map((a) => a.id));
            const merged = [...prev.animals, ...animals.filter((a) => !existingIds.has(a.id))];
            return { ...prev, animals: merged };
        });
    };

    const removeAnimal = (id: string) => {
        setFormData((prev) => ({ ...prev, animals: prev.animals.filter((a) => a.id !== id) }));
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (formData.animals.length === 0) { setError('Seleccioná al menos un animal.'); return false; }
        if (!formData.destinationRanch.trim()) { setError('La estancia de destino es obligatoria.'); return false; }
        if (!formData.eventDate) { setError('La fecha es obligatoria.'); return false; }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            await registerMovement({
                id_user: session.id_user,
                id_ranch: session.id_ranch,
                movement_type: 'ranch_exit',
                event_date: new Date(formData.eventDate).toISOString(),
                counterpart_name: formData.destinationRanch.trim(),
                notes: formData.notes || undefined,
                animals: formData.animals.map((a) => ({ id_ranch_animal: a.id })),
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar la salida.');
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

    return { formData, updateField, addAnimals, removeAnimal, saveRecord, resetForm, loading, error, success };
}
