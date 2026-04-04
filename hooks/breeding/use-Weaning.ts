// hooks/breeding/use-Weaning.ts

import { useState } from 'react';
import { registerWeaning } from '../db.sqlite/repositories/events';
import { findAnimalByCode, findLotByName, getActiveUserId } from './breeding.helpers';

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export interface WeaningFormData {
    animalCode: string;   // código de la madre (para referencia visual)
    criaCode: string;   // código de la cría a destetar
    eventDate: string;
    weaning_weight?: number | null;
    weaning_age?: number | null;
    lotDestName: string;   // nombre del lote de destino
    notes?: string;
}

const initialForm: WeaningFormData = {
    animalCode: '',
    criaCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    lotDestName: '',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWeaning() {
    const [formData, setFormData] = useState<WeaningFormData>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof WeaningFormData>(
        field: K,
        value: WeaningFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveWeaning = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        // ── Validaciones ──────────────────────────────────────────────────────────
        if (!formData.criaCode.trim()) {
            setError('El código de la cría es obligatorio.');
            return false;
        }
        if (!formData.eventDate) {
            setError('La fecha del destete es obligatoria.');
            return false;
        }
        if (!formData.lotDestName.trim()) {
            setError('El lote de destino es obligatorio.');
            return false;
        }

        setLoading(true);
        try {
            // ── Buscar la cría ────────────────────────────────────────────────────
            const cria = await findAnimalByCode(formData.criaCode);
            if (!cria) {
                setError(`No se encontró ningún animal con el código "${formData.criaCode}".`);
                return false;
            }
            if (cria.id_productive_status !== 1) {
                setError('El animal debe estar en etapa Cría para ser destetado.');
                return false;
            }

            // ── Buscar lote de destino ────────────────────────────────────────────
            const lot = await findLotByName(formData.lotDestName);
            if (!lot) {
                setError(`No se encontró ningún lote activo con el nombre "${formData.lotDestName}".`);
                return false;
            }
            if (lot.lot_type !== 'recria' && lot.lot_type !== 'general') {
                setError(`El lote "${lot.name}" no es un lote de recría. Verifique el tipo de lote.`);
                return false;
            }

            const id_user = await getActiveUserId();

            await registerWeaning({
                id_user,
                id_cria: cria.id,
                id_lot_dest: lot.id,
                event_date: new Date(formData.eventDate).toISOString(),
                weaning_weight: formData.weaning_weight ?? undefined,
                weaning_age: formData.weaning_age ?? undefined,
                notes: formData.notes,
            });

            setSuccess(true);
            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el destete.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(initialForm);
        setError(null);
        setSuccess(false);
    };

    return { formData, updateField, saveWeaning, resetForm, loading, error, success };
}