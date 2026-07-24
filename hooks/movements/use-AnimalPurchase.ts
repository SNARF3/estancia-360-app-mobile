import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerPurchase } from '../db.sqlite/repositories/events';

export interface PurchaseFormData {
    animalCode: string;
    supplier: string;
    origin: string;
    purchasePrice: string;
    pricePerKg: string;
    eventDate: string;
    notes: string;
}

const INITIAL: PurchaseFormData = {
    animalCode: '',
    supplier: '',
    origin: '',
    purchasePrice: '',
    pricePerKg: '',
    eventDate: new Date().toISOString().split('T')[0],
    notes: '',
};

export function useAnimalPurchase() {
    const [formData, setFormData] = useState<PurchaseFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof PurchaseFormData>(field: K, value: PurchaseFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (!formData.animalCode.trim()) { setError('El código del animal es obligatorio.'); return false; }
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

            await registerPurchase({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                supplier: formData.supplier || undefined,
                origin: formData.origin || undefined,
                purchase_price: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
                price_per_kg: formData.pricePerKg ? parseFloat(formData.pricePerKg) : undefined,
                event_date: new Date(formData.eventDate).toISOString(),
                notes: formData.notes || undefined,
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar la compra.');
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
