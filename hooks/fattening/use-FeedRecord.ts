// hooks/fattening/use-FeedRecord.ts
// Registro de alimentación por lote de engorde

import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerFeedRecord } from '../db.sqlite/repositories/events';

export interface FeedRecordFormData {
    lotName: string;
    lotId: string | null;
    feedDate: string;
    feedType: string;
    quantity: string;
    unit: string;
    cost: string;
    notes: string;
}

const initial: FeedRecordFormData = {
    lotName: '',
    lotId: null,
    feedDate: new Date().toISOString().split('T')[0],
    feedType: '',
    quantity: '',
    unit: 'kg',
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

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.feedType.trim()) {
            setError('El tipo de alimento es obligatorio.'); return false;
        }
        if (!formData.lotId && !formData.lotName.trim()) {
            setError('Selecciona un lote.'); return false;
        }

        setLoading(true);
        try {
            const { getDb } = await import('../db.sqlite/db-pool');
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            let lotId = formData.lotId;
            if (!lotId) {
                const lot = await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM ranch_lots
                     WHERE id_ranch = ? AND name = ? COLLATE NOCASE AND is_active = 1 LIMIT 1`,
                    [session.id_ranch, formData.lotName.trim()]
                );
                if (!lot) {
                    setError(`No se encontró el lote "${formData.lotName}".`); return false;
                }
                lotId = lot.id;
            }

            const qty = formData.quantity ? parseFloat(formData.quantity) : undefined;
            const cost = formData.cost ? parseFloat(formData.cost) : undefined;

            await registerFeedRecord({
                id_user: session.id_user,
                id_lot: lotId!,
                feed_date: new Date(formData.feedDate).toISOString(),
                feed_type: formData.feedType.trim(),
                quantity: qty && !isNaN(qty) ? qty : undefined,
                unit: formData.unit || undefined,
                cost: cost && !isNaN(cost) ? cost : undefined,
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
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

    return { formData, updateField, saveRecord, resetForm, loading, error, success };
}
