import { useMemo } from 'react';
import { Colors } from '../../../constants/theme';
import { Animal } from './use-GetListAnimals';

export type AnimalCategory = 'Ternero' | 'Destetado' | 'Adulto';

export interface AnimalClassification {
    category: AnimalCategory;
    label: string;
    color: string;
    backgroundColor: string;
}

/**
 * Calcula la edad en meses a partir de la fecha de nacimiento.
 */
function getAgeInMonths(birthdate: string): number {
    const birth = new Date(birthdate);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

/**
 * Clasifica un animal según sus datos.
 * Esta clasificación es solo visual y no se persiste en base de datos.
 */
export function classifyAnimal(animal: {
    sex: string;
    birthdate: string;
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    weaned?: boolean; // si el campo no existe, se infiere por edad
}): AnimalClassification {
    const ageMonths = getAgeInMonths(animal.birthdate);

    // Para determinar "destetado" usamos el campo si existe, o bien si tiene >= 6 meses como estimación
    const isWeaned = animal.weaned !== undefined ? animal.weaned : ageMonths >= 6;

    // ─── TERNEROS: no destetados y menores de 11 meses ───────────────────────
    if (!isWeaned && ageMonths < 11) {
        if (animal.sex === 'F') {
            return {
                category: 'Ternero',
                label: 'Ternera',
                color: Colors.primary,
                backgroundColor: Colors.primary + '18',
            };
        }
        if (animal.sex === 'M' && !animal.isCastrated) {
            return {
                category: 'Ternero',
                label: 'Ternero Macho Entero',
                color: Colors.primary,
                backgroundColor: Colors.primary + '18',
            };
        }
        if (animal.sex === 'M' && animal.isCastrated) {
            return {
                category: 'Ternero',
                label: 'Ternero Macho Castrado',
                color: Colors.primary,
                backgroundColor: Colors.primary + '18',
            };
        }
    }

    // ─── DESTETADOS: destetados y hasta 11 meses ─────────────────────────────
    if (isWeaned && ageMonths < 12) {
        if (animal.sex === 'F') {
            return {
                category: 'Destetado',
                label: 'Hembra Destetada',
                color: Colors.warning ?? '#F59E0B',
                backgroundColor: (Colors.warning ?? '#F59E0B') + '18',
            };
        }
        if (animal.sex === 'M' && !animal.isCastrated) {
            return {
                category: 'Destetado',
                label: 'Macho Entero Destetado',
                color: Colors.warning ?? '#F59E0B',
                backgroundColor: (Colors.warning ?? '#F59E0B') + '18',
            };
        }
        if (animal.sex === 'M' && animal.isCastrated) {
            return {
                category: 'Destetado',
                label: 'Macho Castrado Destetado',
                color: Colors.warning ?? '#F59E0B',
                backgroundColor: (Colors.warning ?? '#F59E0B') + '18',
            };
        }
    }

    // ─── ADULTOS: 12 meses o más ──────────────────────────────────────────────
    if (ageMonths >= 12) {
        // Hembra esterilizada (puede o no haber parido)
        if (animal.sex === 'F' && animal.isSterilized) {
            return {
                category: 'Adulto',
                label: 'Hembra Esterilizada',
                color: Colors.success,
                backgroundColor: Colors.successLight,
            };
        }
        // Vaca: hembra que ya parió
        if (animal.sex === 'F' && animal.hasCalved) {
            return {
                category: 'Adulto',
                label: 'Vaca',
                color: Colors.success,
                backgroundColor: Colors.successLight,
            };
        }
        // Vaquilla: hembra que no ha parido y no está esterilizada
        if (animal.sex === 'F' && !animal.hasCalved && !animal.isSterilized) {
            return {
                category: 'Adulto',
                label: 'Vaquilla',
                color: Colors.success,
                backgroundColor: Colors.successLight,
            };
        }
        // Toro: macho no castrado
        if (animal.sex === 'M' && !animal.isCastrated) {
            return {
                category: 'Adulto',
                label: 'Toro',
                color: Colors.success,
                backgroundColor: Colors.successLight,
            };
        }
        // Novillo: macho castrado
        if (animal.sex === 'M' && animal.isCastrated) {
            return {
                category: 'Adulto',
                label: 'Novillo',
                color: Colors.success,
                backgroundColor: Colors.successLight,
            };
        }
    }

    // Fallback para casos no contemplados
    return {
        category: 'Adulto',
        label: 'Sin clasificar',
        color: Colors.textSecondary,
        backgroundColor: Colors.textSecondary + '18',
    };
}

/**
 * Hook que recibe la lista de animales y devuelve cada animal
 * con su clasificación visual adjunta.
 */
export function useAnimalClassification<T extends Animal>(animals: T[]) {
    return useMemo(() =>
        animals.map(animal => ({
            ...animal,
            classification: classifyAnimal({
                sex: animal.sex,
                birthdate: animal.birthdate,
                isCastrated: animal.isCastrated,
                isSterilized: animal.isSterilized,
                hasCalved: animal.hasCalved,
            }),
        })),
        [animals]
    );
}