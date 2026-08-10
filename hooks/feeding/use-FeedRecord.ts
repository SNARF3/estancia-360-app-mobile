// hooks/feeding/use-FeedRecord.ts
// Registro de alimentación por lote — feed_records no tiene id_ranch_animal en
// ningún lado (ni local ni backend), así que no hay lookup de animal acá.

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerFeedRecord } from '../db.sqlite/repositories/events';

export interface FeedRecordFormData {
    lotId: string;
    lotName: string;
    feedDate: string;
    feedType: string;
    quantity: string;
    unit: string;
    cost: string;
    notes: string;
}

const initial: FeedRecordFormData = {
    lotId: '',
    lotName: '',
    feedDate: new Date().toISOString().split('T')[0],
    feedType: '',
    quantity: '',
    unit: '',
    cost: '',
    notes: '',
};

export function useFeedRecord() {
    const [formData, setFormData] = useState<FeedRecordFormData>(initial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof FeedRecordFormData>(
        field: K, value: FeedRecordFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const selectLot = (lotId: string, lotName: string) => {
        setFormData(prev => ({ ...prev, lotId, lotName }));
        setError(null);
        setSuccess(false);
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.lotId) {
            setError('Seleccioná un lote.'); return false;
        }
        if (!formData.feedDate) {
            setError('La fecha es obligatoria.'); return false;
        }
        if (!formData.feedType.trim()) {
            setError('El tipo de alimento es obligatorio.'); return false;
        }

        let quantity: number | undefined;
        if (formData.quantity.trim()) {
            quantity = parseFloat(formData.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                setError('La cantidad debe ser un número mayor a 0.'); return false;
            }
        }

        let cost: number | undefined;
        if (formData.cost.trim()) {
            cost = parseFloat(formData.cost);
            if (isNaN(cost) || cost < 0) {
                setError('El costo debe ser un número válido.'); return false;
            }
        }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            await registerFeedRecord({
                id_user: session.id_user,
                id_lot: formData.lotId,
                feed_date: new Date(formData.feedDate).toISOString(),
                feed_type: formData.feedType.trim(),
                quantity,
                unit: formData.unit.trim() || undefined,
                cost,
                notes: formData.notes.trim() || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            console.error('[useFeedRecord] saveRecord falló:', e);
            setError(e.message ?? 'Error al guardar el registro de alimentación.');
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

    return { formData, updateField, selectLot, saveRecord, resetForm, loading, error, success };
}
