// hooks/breeding/use-Parturition.ts

import { useState } from 'react';
import { registerParturition } from '../db.sqlite/repositories/events';
import {
    findActivePregnantDiagnosis,
    findAnimalByCode,
    getActiveRanchId,
    getActiveUserId,
} from './breeding.helpers';
import { BirthType, CriaStatus, MotherCondition } from './breeding.types';

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export interface ParturitionFormData {
    animalCode: string;        // código de la madre
    eventDate: string;
    birth_type: BirthType;
    mother_condition?: MotherCondition;
    cria_status: CriaStatus;
    criaCode: string;        // código de la cría (requerido si alive)
    cria_sex?: 'M' | 'F';
    cria_weight?: number | null;
    notes?: string;
}

const initialForm: ParturitionFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    birth_type: 'normal',
    cria_status: 'alive',
    criaCode: '',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useParturition() {
    const [formData, setFormData] = useState<ParturitionFormData>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof ParturitionFormData>(
        field: K,
        value: ParturitionFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveParturition = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        // ── Validaciones ──────────────────────────────────────────────────────────
        if (!formData.animalCode.trim()) {
            setError('El código de la madre es obligatorio.');
            return false;
        }
        if (!formData.eventDate) {
            setError('La fecha del parto es obligatoria.');
            return false;
        }
        if (formData.cria_status === 'alive') {
            if (!formData.criaCode.trim()) {
                setError('El código de la cría es obligatorio cuando nació viva.');
                return false;
            }
            if (!formData.cria_sex) {
                setError('El sexo de la cría es obligatorio.');
                return false;
            }
        }

        setLoading(true);
        try {
            // ── Buscar la madre ───────────────────────────────────────────────────
            const mother = await findAnimalByCode(formData.animalCode);
            if (!mother) {
                setError(`No se encontró ningún animal con el código "${formData.animalCode}".`);
                return false;
            }
            if (mother.sex !== 'F') {
                setError('El animal debe ser hembra para registrar un parto.');
                return false;
            }

            // ── Buscar diagnóstico preñada activo (RF-04.5 / RN-12) ───────────────
            const diagnosis = await findActivePregnantDiagnosis(mother.id);
            if (!diagnosis) {
                setError('No se encontró un diagnóstico de gestación "preñada" para esta vaca. Registre primero el diagnóstico.');
                return false;
            }

            const id_user = await getActiveUserId();
            const id_ranch = await getActiveRanchId();

            // ── Determinar clase de la cría según sexo ────────────────────────────
            // Ternera=1, Ternero Macho Entero=2 (valores del catálogo animal_classes)
            const id_animal_class = formData.cria_sex === 'F' ? 1 : 2;

            await registerParturition({
                id_user,
                id_ranch,
                id_ranch_animal: mother.id,
                id_diagnosis: diagnosis.id,
                event_date: new Date(formData.eventDate).toISOString(),
                birth_type: formData.birth_type,
                cria_status: formData.cria_status,
                cria_weight: formData.cria_weight
                    ? Math.round(formData.cria_weight * 1000) // kg → gramos
                    : undefined,
                mother_condition: formData.mother_condition,
                notes: formData.notes,
                cria: formData.cria_status === 'alive' ? {
                    code: formData.criaCode.trim().toUpperCase(),
                    sex: formData.cria_sex!,
                    id_animal_class,
                    id_lot: mother.id_lot ?? undefined,
                } : undefined,
            });

            setSuccess(true);
            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el parto.');
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

    return { formData, updateField, saveParturition, resetForm, loading, error, success };
}