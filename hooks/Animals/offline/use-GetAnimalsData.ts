// hooks/Animals/offline/use-GetAnimalsData.ts
// Provee razas y catálogos necesarios para el formulario de registro

import { useEffect, useState } from 'react';
import { ANIMAL_CLASSES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AnimalBreed {
    id: number;
    name: string;
}

export interface AnimalClassOption {
    id: number;
    name: string;
    sex: 'M' | 'F';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetAnimalsData() {
    const [breeds, setBreeds] = useState<AnimalBreed[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const db = await getDb();
                const rows = await db.getAllAsync<{ id: number; name: string }>(
                    `SELECT id, name FROM animal_breeds WHERE is_active = 1 ORDER BY name ASC`
                );
                setBreeds(rows);
            } catch (e) {
                console.error('useGetAnimalsData error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Las clases de animales vienen del catálogo en memoria (no necesitan DB)
    const animalClasses: AnimalClassOption[] = Object.entries(ANIMAL_CLASSES).map(
        ([id, data]) => ({ id: parseInt(id), name: data.name, sex: data.sex as 'M' | 'F' })
    );

    return { breeds, animalClasses, loading };
}