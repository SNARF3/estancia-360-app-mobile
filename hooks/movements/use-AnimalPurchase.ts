import { useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { registerMovement } from '../db.sqlite/repositories/events';
import { assertCapacityAvailable } from '../subscriptions/use-CapacityGuard';

export interface NewPurchaseAnimalRow {
    code: string;
    sex: 'M' | 'F';
    idBreed: number;
    breedName: string;
    idAnimalClass: number;
    className: string;
    birthdate: string;
    weight: string;
    idLot: string;
    lotName: string;
    idProductiveStatus?: number;
}

export interface PurchaseFormData {
    animals: NewPurchaseAnimalRow[];
    supplier: string;
    totalPrice: string;
    pricePerKg: string;
    eventDate: string;
    notes: string;
}

const INITIAL: PurchaseFormData = {
    animals: [],
    supplier: '',
    totalPrice: '',
    pricePerKg: '',
    eventDate: new Date().toISOString().split('T')[0],
    notes: '',
};

/** Compra: cada animal es NUEVO (el servidor lo crea con origin=purchased, igual que este hook localmente). */
export function useAnimalPurchase() {
    const [formData, setFormData] = useState<PurchaseFormData>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof PurchaseFormData>(field: K, value: PurchaseFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const addAnimal = (animal: NewPurchaseAnimalRow) => {
        setFormData((prev) => ({ ...prev, animals: [...prev.animals, animal] }));
    };

    const removeAnimal = (index: number) => {
        setFormData((prev) => ({ ...prev, animals: prev.animals.filter((_, i) => i !== index) }));
    };

    const saveRecord = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        if (formData.animals.length === 0) { setError('Agregá al menos un animal.'); return false; }
        if (!formData.eventDate) { setError('La fecha es obligatoria.'); return false; }
        const codes = formData.animals.map((a) => a.code.trim().toUpperCase());
        if (new Set(codes).size !== codes.length) { setError('Hay códigos de animal repetidos en esta compra.'); return false; }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            const { getDb } = await import('../db.sqlite/db-pool');
            const db = await getDb();
            for (const code of codes) {
                const existing = await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ? COLLATE NOCASE LIMIT 1`,
                    [session.id_ranch, code]
                );
                if (existing) { setError(`Ya existe un animal con código "${code}" en esta estancia.`); return false; }
            }

            // Todo-o-nada, igual que el backend: si el lote completo de animales
            // comprados supera el límite, se rechaza entero, no se procesan algunos.
            const capacityCheck = await assertCapacityAvailable(session.id_ranch, formData.animals.length);
            if (!capacityCheck.allowed) {
                setError(capacityCheck.message);
                return false;
            }

            await registerMovement({
                id_user: session.id_user,
                id_ranch: session.id_ranch,
                movement_type: 'purchase',
                event_date: new Date(formData.eventDate).toISOString(),
                origin_name: formData.supplier || undefined,
                total_price: formData.totalPrice ? parseFloat(formData.totalPrice) : undefined,
                price_per_kg: formData.pricePerKg ? parseFloat(formData.pricePerKg) : undefined,
                notes: formData.notes || undefined,
                animals: formData.animals.map((a) => ({
                    newAnimal: {
                        code: a.code.trim().toUpperCase(),
                        sex: a.sex,
                        id_breed: a.idBreed,
                        id_animal_class: a.idAnimalClass,
                        birthdate: a.birthdate,
                        weight: a.weight ? parseFloat(a.weight) : undefined,
                        id_lot: a.idLot || undefined,
                        id_productive_status: a.idProductiveStatus,
                    },
                })),
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

    return { formData, updateField, addAnimal, removeAnimal, saveRecord, resetForm, loading, error, success };
}
