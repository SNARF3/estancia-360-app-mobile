// hooks/breeding/use-GestationDiagnosis.ts

import { useState } from 'react';
import { registerGestationDiagnosis } from '../db.sqlite/repositories/events';
import {
    findAnimalByCode,
    findLastActiveService,
    getActiveUserId,
} from './breeding.helpers';
import { DiagnosisMethod, DiagnosisResult } from './breeding.types';

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export interface GestationDiagnosisFormData {
    animalCode: string;
    eventDate: string;
    method: DiagnosisMethod;
    result: DiagnosisResult;
    gestation_days?: number | null;
    estimated_birth?: string;
    veterinarian?: string;
    notes?: string;
}

const initialForm: GestationDiagnosisFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    method: 'palpation',
    result: 'pregnant',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGestationDiagnosis() {
    const [formData, setFormData] = useState<GestationDiagnosisFormData>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof GestationDiagnosisFormData>(
        field: K,
        value: GestationDiagnosisFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveDiagnosis = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        // ── Validaciones ──────────────────────────────────────────────────────────
        if (!formData.animalCode.trim()) {
            setError('El código del animal es obligatorio.');
            return false;
        }
        if (!formData.eventDate) {
            setError('La fecha del diagnóstico es obligatoria.');
            return false;
        }
        if (formData.result === 'pregnant' && !formData.gestation_days) {
            setError('Los días de gestación son obligatorios cuando el resultado es preñada.');
            return false;
        }

        setLoading(true);
        try {
            // ── Buscar animal ─────────────────────────────────────────────────────
            const animal = await findAnimalByCode(formData.animalCode);
            if (!animal) {
                setError(`No se encontró ningún animal con el código "${formData.animalCode}".`);
                return false;
            }
            if (animal.sex !== 'F') {
                setError('El diagnóstico de gestación solo aplica a hembras.');
                return false;
            }

            // ── Buscar el último servicio del animal ──────────────────────────────
            // El diagnóstico DEBE vincularse a un servicio previo (RF-04.5)
            const lastService = await findLastActiveService(animal.id);
            if (!lastService) {
                setError('No se encontró un servicio reproductivo previo para este animal. Registre primero el servicio.');
                return false;
            }

            const id_user = await getActiveUserId();

            await registerGestationDiagnosis({
                id_user,
                id_ranch_animal: animal.id,
                id_service: lastService.id,
                event_date: new Date(formData.eventDate).toISOString(),
                method: formData.method,
                result: formData.result,
                gestation_days: formData.gestation_days ?? undefined,
                estimated_birth: formData.estimated_birth,
                veterinarian: formData.veterinarian,
                notes: formData.notes,
            });

            setSuccess(true);
            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el diagnóstico.');
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

    return { formData, updateField, saveDiagnosis, resetForm, loading, error, success };
}