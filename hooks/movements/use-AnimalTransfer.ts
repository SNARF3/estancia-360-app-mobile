import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerTransfer } from '../db.sqlite/repositories/events';

export interface TransferFormData {
    animalCode: string;
    animalId: string;
    currentLotId: string;
    destLotId: string;
    destLotName: string;
    reason: 'management' | 'breeding' | 'rearing' | 'fattening' | 'health' | '';
    eventDate: string;
    notes: string;
}

const INITIAL: TransferFormData = {
    animalCode: '',
    animalId: '',
    currentLotId: '',
    destLotId: '',
    destLotName: '',
    reason: '',
    eventDate: new Date().toISOString().split('T')[0],
    notes: '',
};

export function useAnimalTransfer() {
    const [formData, setFormData] = useState<TransferFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof TransferFormData>(field: K, value: TransferFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) { setError('El código del animal es obligatorio.'); return false; }
        if (!formData.destLotId) { setError('Seleccioná el lote de destino.'); return false; }
        if (!formData.eventDate) { setError('La fecha es obligatoria.'); return false; }
        if (formData.currentLotId === formData.destLotId) {
            setError('El lote de destino debe ser diferente al lote actual.'); return false;
        }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            let animalId = formData.animalId;
            if (!animalId) {
                const { getDb } = await import('../db.sqlite/db-pool');
                const db = await getDb();
                const animal = await db.getFirstAsync<{ id: string; id_lot: string | null }>(
                    `SELECT id, id_lot FROM ranch_animals WHERE id_ranch = ? AND code = ? COLLATE NOCASE LIMIT 1`,
                    [session.id_ranch, formData.animalCode.trim()]
                );
                if (!animal) { setError(`No se encontró el animal "${formData.animalCode}".`); return false; }
                animalId = animal.id;
                if (!formData.currentLotId && animal.id_lot) {
                    updateField('currentLotId', animal.id_lot);
                }
            }

            await registerTransfer({
                id_user: session.id_user,
                id_ranch_animal: animalId,
                id_lot_origin: formData.currentLotId || '',
                id_lot_dest: formData.destLotId,
                reason: formData.reason || undefined,
                event_date: new Date(formData.eventDate).toISOString(),
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar el traslado.');
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
