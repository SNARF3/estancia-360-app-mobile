import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerMovement } from '../db.sqlite/repositories/events';

export interface SaleAnimalRow {
    id: string;
    code: string;
}

export interface SaleFormData {
    animals: SaleAnimalRow[];
    buyer: string;
    totalPrice: string;
    pricePerKg: string;
    eventDate: string;
    notes: string;
}

const INITIAL: SaleFormData = {
    animals: [],
    buyer: '',
    totalPrice: '',
    pricePerKg: '',
    eventDate: new Date().toISOString().split('T')[0],
    notes: '',
};

/** Venta: queda pending hasta confirmar/rechazar cada animal (ver use-PendingSales.ts). */
export function useAnimalSale() {
    const [formData, setFormData] = useState<SaleFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof SaleFormData>(field: K, value: SaleFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const addAnimals = (animals: SaleAnimalRow[]) => {
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
        if (!formData.buyer.trim()) { setError('El comprador es obligatorio.'); return false; }
        if (!formData.eventDate) { setError('La fecha es obligatoria.'); return false; }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            await registerMovement({
                id_user: session.id_user,
                id_ranch: session.id_ranch,
                movement_type: 'sale',
                event_date: new Date(formData.eventDate).toISOString(),
                counterpart_name: formData.buyer.trim(),
                total_price: formData.totalPrice ? parseFloat(formData.totalPrice) : undefined,
                price_per_kg: formData.pricePerKg ? parseFloat(formData.pricePerKg) : undefined,
                notes: formData.notes || undefined,
                animals: formData.animals.map((a) => ({ id_ranch_animal: a.id })),
            });

            setSuccess(true);
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar la venta.');
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
