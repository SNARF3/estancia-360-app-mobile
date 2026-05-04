// hooks/fattening/use-FatteningEntry.ts
// Ingreso de un animal desde Recría a Engorde

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerFatteningEntry } from '../db.sqlite/repositories/events';

export interface FatteningEntryFormData {
    animalCode: string;
    eventDate: string;
    systemType: 'field' | 'feedlot';
    initialWeight: string;
    lotDestName: string;
    lotDestId: string | null;
    notes: string;
}

const initial: FatteningEntryFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    systemType: 'field',
    initialWeight: '',
    lotDestName: '',
    lotDestId: null,
    notes: '',
};

export function useFatteningEntry() {
    const [formData, setFormData] = useState<FatteningEntryFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof FatteningEntryFormData>(
        field: K, value: FatteningEntryFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveEntry = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) {
            setError('El código del animal es obligatorio.'); return false;
        }
        if (!formData.lotDestId && !formData.lotDestName.trim()) {
            setError('Selecciona un lote de destino.'); return false;
        }

        setLoading(true);
        try {
            const { getDb } = await import('../db.sqlite/db-pool');
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const animal = await db.getFirstAsync<{ id: string; id_productive_status: number }>(
                `SELECT id, id_productive_status FROM ranch_animals
                 WHERE id_ranch = ? AND code = ? COLLATE NOCASE AND id_status = 1 LIMIT 1`,
                [session.id_ranch, formData.animalCode.trim()]
            );
            if (!animal) {
                setError(`No se encontró el animal "${formData.animalCode}".`); return false;
            }
            if (animal.id_productive_status !== 2) {
                setError('RN-09: El animal debe estar en Recría para ingresar a Engorde.'); return false;
            }

            let lotId = formData.lotDestId;
            if (!lotId) {
                const lot = await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM ranch_lots
                     WHERE id_ranch = ? AND name = ? COLLATE NOCASE AND lot_type = 'engorde' AND is_active = 1 LIMIT 1`,
                    [session.id_ranch, formData.lotDestName.trim()]
                );
                if (!lot) {
                    setError(`No se encontró el lote de engorde "${formData.lotDestName}".`); return false;
                }
                lotId = lot.id;
            }

            const w = formData.initialWeight ? parseFloat(formData.initialWeight) : undefined;

            await registerFatteningEntry({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                id_lot_dest: lotId!,
                event_date: new Date(formData.eventDate).toISOString(),
                system_type: formData.systemType,
                initial_weight: w && !isNaN(w) ? w : undefined,
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el ingreso a engorde.');
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

    return { formData, updateField, saveEntry, resetForm, loading, error, success };
}
