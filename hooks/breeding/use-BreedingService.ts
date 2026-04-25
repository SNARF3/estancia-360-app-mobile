// hooks/breeding/use-BreedingService.ts

import { useState } from 'react';
import { registerBreedingService } from '../db.sqlite/repositories/events';
import {
    findAnimalByCode,
    findAnimalByCode as findMaleByCode,
    getActiveUserId,
} from './breeding.helpers';
import { ServiceType } from './breeding.types';

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export interface BreedingServiceFormData {
    animalCode: string;        // código de la hembra
    eventDate: string;        // ISO date
    service_type: ServiceType;
    maleAnimalCode?: string;        // solo para 'natural'
    semen_breed?: string;        // IA o embrión
    technician?: string;
    reproductive_lot?: string;
    notes?: string;
}

const initialForm: BreedingServiceFormData = {
    animalCode: '',
    eventDate: new Date().toISOString().split('T')[0],
    service_type: 'natural',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBreedingService() {
    const [formData, setFormData] = useState<BreedingServiceFormData>(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const updateField = <K extends keyof BreedingServiceFormData>(
        field: K,
        value: BreedingServiceFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(false);
    };

    const saveService = async (): Promise<boolean> => {
        setError(null);
        setSuccess(false);

        // ── Validaciones ──────────────────────────────────────────────────────────
        if (!formData.animalCode.trim()) {
            setError('El código de la hembra es obligatorio.');
            return false;
        }
        if (!formData.eventDate) {
            setError('La fecha del servicio es obligatoria.');
            return false;
        }
        if (formData.service_type === 'natural' && !formData.maleAnimalCode?.trim()) {
            setError('El código del macho es obligatorio para monta natural.');
            return false;
        }
        if (formData.service_type === 'artificial_insemination' && !formData.semen_breed?.trim()) {
            setError('La raza del semen es obligatoria para inseminación artificial.');
            return false;
        }

        setLoading(true);
        try {
            // ── Buscar la hembra en SQLite ─────────────────────────────────────────
            const female = await findAnimalByCode(formData.animalCode);
            if (!female) {
                setError(`No se encontró ningún animal con el código "${formData.animalCode}".`);
                return false;
            }
            if (female.sex !== 'F') {
                setError('El animal debe ser hembra para registrar un servicio.');
                return false;
            }
            if (female.id_productive_status !== 1) {
                setError('El animal debe estar en etapa Cría para registrar un servicio.');
                return false;
            }

            // ── Buscar el macho si es monta natural ───────────────────────────────
            let id_animal_male: string | undefined;
            if (formData.service_type === 'natural' && formData.maleAnimalCode?.trim()) {
                const male = await findMaleByCode(formData.maleAnimalCode);
                if (!male) {
                    setError(`No se encontró ningún animal con el código "${formData.maleAnimalCode}".`);
                    return false;
                }
                if (male.sex !== 'M') {
                    setError('El animal macho debe ser de sexo Macho.');
                    return false;
                }
                id_animal_male = male.id;
            }

            const id_user = await getActiveUserId();

            // ── Guardar en SQLite ─────────────────────────────────────────────────
            await registerBreedingService({
                id_user,
                id_ranch_animal: female.id,
                event_date: new Date(formData.eventDate).toISOString(),
                service_type: formData.service_type,
                id_animal_male,
                semen_breed: formData.semen_breed,
                technician: formData.technician,
                reproductive_lot: formData.reproductive_lot,
                notes: formData.notes,
            });

            setSuccess(true);
            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al guardar el servicio.');
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

    return { formData, updateField, saveService, resetForm, loading, error, success };
}