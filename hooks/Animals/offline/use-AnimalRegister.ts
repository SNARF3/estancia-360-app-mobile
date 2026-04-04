// hooks/Animals/offline/use-AnimalRegister.ts

import { useState } from 'react';
import { getSession } from '../../auth/use-Auth';
import { ANIMAL_STATUSES, PRODUCTIVE_STATUSES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

export interface RegisterAnimalInput {
    code: string;
    codeMother: string | null;  // código de la madre (se resuelve a ID internamente)
    codeFather: string | null;
    idBreed: number;
    idStatus: number;         // 1=Activo por defecto
    birthdate: string;         // ISO date
    weight: number;
    sex: 'M' | 'F';
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    id_animal_class?: number;     // si no se pasa, se inferirá del sexo
}

// ─── Mapeo de flags a id_animal_class ────────────────────────────────────────
// Regla simplificada: al registrar un animal nuevo se asigna la clase base
// según sexo y flags. El operador puede ajustarlo después.
// Ver catálogo animal_classes en database.ts

function inferAnimalClass(sex: 'M' | 'F', isCastrated: boolean, isSterilized: boolean): number {
    if (sex === 'F') {
        if (isSterilized) return 9;  // Hembra Esterilizada
        return 8;                    // Vaca (adulta por defecto al registrar manual)
    } else {
        if (isCastrated) return 11;  // Novillo
        return 10;                   // Toro
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnimalRegister() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerAnimal = async (input: RegisterAnimalInput): Promise<boolean> => {
        setError(null);
        setLoading(true);

        try {
            const session = await getSession();
            if (!session) {
                setError('No hay sesión activa.');
                return false;
            }

            const db = await getDb();

            // ── Verificar que el código no existe ya en este ranch ────────────────
            const existing = await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ?`,
                [session.id_ranch, input.code.trim().toUpperCase()]
            );
            if (existing) {
                setError(`Ya existe un animal con el código "${input.code}" en esta estancia.`);
                return false;
            }

            // ── Resolver código madre → id ────────────────────────────────────────
            let id_mother: string | null = null;
            if (input.codeMother?.trim()) {
                const mother = await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ? AND sex = 'F'`,
                    [session.id_ranch, input.codeMother.trim().toUpperCase()]
                );
                if (!mother) {
                    setError(`No se encontró la madre con código "${input.codeMother}".`);
                    return false;
                }
                id_mother = mother.id;
            }

            // ── Resolver código padre → id ────────────────────────────────────────
            let id_father: string | null = null;
            if (input.codeFather?.trim()) {
                const father = await db.getFirstAsync<{ id: string }>(
                    `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ? AND sex = 'M'`,
                    [session.id_ranch, input.codeFather.trim().toUpperCase()]
                );
                if (!father) {
                    setError(`No se encontró el padre con código "${input.codeFather}".`);
                    return false;
                }
                id_father = father.id;
            }

            // ── Clase del animal ──────────────────────────────────────────────────
            const id_animal_class = input.id_animal_class
                ?? inferAnimalClass(input.sex, input.isCastrated, input.isSterilized);

            const id = newId();
            const ts = now();

            await db.runAsync(
                `INSERT INTO ranch_animals (
           id, id_mother, id_father, id_ranch, id_breed, id_status,
           id_productive_status, id_animal_class,
           code, birthdate, weight, sex, origin,
           created_at, updated_at, is_synced, sync_action
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                [
                    id,
                    id_mother,
                    id_father,
                    session.id_ranch,
                    input.idBreed,
                    ANIMAL_STATUSES.ACTIVO,
                    PRODUCTIVE_STATUSES.CRIA,       // por defecto al crear
                    id_animal_class,
                    input.code.trim().toUpperCase(),
                    input.birthdate,
                    input.weight,
                    input.sex,
                    'manual',                        // origin = manual (no born, no purchased)
                    ts,
                    ts,
                ]
            );

            return true;

        } catch (e: any) {
            setError(e.message ?? 'Error al registrar el animal.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { registerAnimal, loading, error };
}