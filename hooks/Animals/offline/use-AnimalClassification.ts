import { useMemo } from 'react';
import { constants } from '../../../constants/constants';
import { Animal } from './use-GetListAnimals';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AnimalClassification {
    label: string;
    category: 'Ternero' | 'Destetado' | 'Adulto';
    color: string;
    backgroundColor: string;
}

// ─── Mapeo de id_animal_class a categoría visual ──────────────────────────────

const CLASS_CATEGORY_MAP: Record<number, 'Ternero' | 'Destetado' | 'Adulto'> = {
    1: 'Ternero',   // Ternera
    2: 'Ternero',   // Ternero Macho Entero
    3: 'Ternero',   // Ternero Macho Castrado
    4: 'Destetado', // Hembra Destetada
    5: 'Destetado', // Macho Entero Destetado
    6: 'Destetado', // Macho Castrado Destetado
    7: 'Adulto',    // Vaquilla
    8: 'Adulto',    // Vaca
    9: 'Adulto',    // Hembra Esterilizada
    10: 'Adulto',    // Toro
    11: 'Adulto',    // Novillo
};

const CATEGORY_STYLE: Record<'Ternero' | 'Destetado' | 'Adulto', { color: string; backgroundColor: string }> = {
    Ternero: { color: '#92400E', backgroundColor: '#FEF3C7' },  // amarillo cálido
    Destetado: { color: '#1D4ED8', backgroundColor: '#DBEAFE' },  // azul
    Adulto: { color: '#065F46', backgroundColor: '#D1FAE5' },  // verde
};

// ─── Función pura (para uso en DetailAnimal sin hook) ─────────────────────────

export function classifyAnimal(animal: {
    sex: string;
    birthdate: string;
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    id_animal_class?: number;
}): AnimalClassification {
    // Si tenemos id_animal_class, usamos el catálogo directamente
    if (animal.id_animal_class) {
        const classData = constants.ANIMAL_CLASSIFICATION.find(c => c.id === animal.id_animal_class);
        if (classData) {
            const category = CLASS_CATEGORY_MAP[animal.id_animal_class] ?? 'Adulto';
            const style = CATEGORY_STYLE[category];
            return { label: classData.name, category, ...style };
        }
    }

    // Fallback: inferir por edad y flags (compatibilidad con datos viejos)
    const ageMonths = Math.floor(
        (Date.now() - new Date(animal.birthdate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (ageMonths < 11) {
        if (animal.sex === 'F') return { label: 'Ternera', category: 'Ternero', ...CATEGORY_STYLE.Ternero };
        if (animal.isCastrated) return { label: 'Ternero Macho Castrado', category: 'Ternero', ...CATEGORY_STYLE.Ternero };
        return { label: 'Ternero Macho Entero', category: 'Ternero', ...CATEGORY_STYLE.Ternero };
    }

    if (ageMonths < 12) {
        if (animal.sex === 'F') return { label: 'Hembra Destetada', category: 'Destetado', ...CATEGORY_STYLE.Destetado };
        if (animal.isCastrated) return { label: 'Macho Castrado Destetado', category: 'Destetado', ...CATEGORY_STYLE.Destetado };
        return { label: 'Macho Entero Destetado', category: 'Destetado', ...CATEGORY_STYLE.Destetado };
    }

    // Adulto
    if (animal.sex === 'F') {
        if (animal.isSterilized) return { label: 'Hembra Esterilizada', category: 'Adulto', ...CATEGORY_STYLE.Adulto };
        if (animal.hasCalved) return { label: 'Vaca', category: 'Adulto', ...CATEGORY_STYLE.Adulto };
        return { label: 'Vaquilla', category: 'Adulto', ...CATEGORY_STYLE.Adulto };
    }
    if (animal.isCastrated) return { label: 'Novillo', category: 'Adulto', ...CATEGORY_STYLE.Adulto };
    return { label: 'Toro', category: 'Adulto', ...CATEGORY_STYLE.Adulto };
}

// ─── Hook (para AnimalMenuScreen) ─────────────────────────────────────────────

export function useAnimalClassification(animals: Animal[]) {
    return useMemo(
        () => animals.map(a => ({
            ...a,
            classification: classifyAnimal({
                sex: a.sex,
                birthdate: a.birthdate,
                isCastrated: a.isCastrated,
                isSterilized: a.isSterilized,
                hasCalved: a.hasCalved,
                id_animal_class: a.id_animal_class,
            }),
        })),
        [animals]
    );
}