// hooks/Animals/offline/use-GetListAnimals.ts

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { getSession } from '../../auth/use-Auth';
import { constants } from '../../../constants/constants';
import { getDb } from '../../db.sqlite/db-pool';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AnimalBreedLocal {
    id: number;
    name: string;
}

export interface AnimalStatusLocal {
    id: number;
    name: string;
}

export interface Animal {
    id: string;   // UUID local
    server_id?: string;
    code: string;
    sex: 'M' | 'F';
    birthdate: string;
    weight: number | null;
    origin?: string;
    id_lot?: string;
    id_productive_status: number;
    id_animal_class: number;
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    breed: AnimalBreedLocal;
    status: AnimalStatusLocal;
    idMother?: string;
    idFather?: string;
}

export interface AnimalMeta {
    total: number;
    pages: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetListAnimals(autoFetch: boolean = true) {
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState<AnimalMeta>({ total: 0, pages: 1 });

    const fetchAnimals = useCallback(async () => {
        setLoading(true);
        try {
            const session = await getSession();
            if (!session) return;

            const db = await getDb();

            const rows = await db.getAllAsync<{
                id: string;
                server_id: string | null;
                code: string;
                sex: 'M' | 'F';
                birthdate: string;
                weight: number | null;
                origin: string | null;
                id_lot: string | null;
                id_productive_status: number;
                id_animal_class: number;
                id_status: number;
                id_mother: string | null;
                id_father: string | null;
                breed_id: number;
                breed_name: string;
            }>(
                `SELECT
           a.id, a.server_id, a.code, a.sex, a.birthdate, a.weight,
           a.origin, a.id_lot, a.id_productive_status, a.id_animal_class,
           a.id_status, a.id_mother, a.id_father,
           b.id   AS breed_id,
           b.name AS breed_name
         FROM ranch_animals a
         JOIN animal_breeds  b  ON b.id = a.id_breed
         WHERE a.id_ranch = ? AND a.id_status != 3
         ORDER BY a.code ASC`,
                [session.id_ranch]
            );

            const mapped: Animal[] = rows.map(r => {
                // Encontrar el nombre de la clase desde las constantes lokales
                const animalClass = constants.ANIMAL_CLASSIFICATION.find(c => c.id === r.id_animal_class);
                const className = animalClass?.name || '';

                return {
                    id: r.id,
                    server_id: r.server_id ?? undefined,
                    code: r.code,
                    sex: r.sex,
                    birthdate: r.birthdate,
                    weight: r.weight,
                    origin: r.origin ?? undefined,
                    id_lot: r.id_lot ?? undefined,
                    id_productive_status: r.id_productive_status,
                    id_animal_class: r.id_animal_class,
                    // isCastrated → clase "Macho Castrado" o "Ternero Macho Castrado"
                    isCastrated: className.toLowerCase().includes('castrado'),
                    // isSterilized → clase "Hembra Esterilizada"
                    isSterilized: className.toLowerCase().includes('esterilizada'),
                    // hasCalved → calculado dinámicamente más adelante si se necesita
                    hasCalved: false,
                    breed: { id: r.breed_id, name: r.breed_name },
                    status: {
                        id: r.id_status,
                        name: r.id_status === 1 ? 'OK' : r.id_status === 2 ? 'Observación' : 'Inactivo',
                    },
                    idMother: r.id_mother ?? undefined,
                    idFather: r.id_father ?? undefined,
                };
            });

            // Enriquecer hasCalved para hembras (tiene al menos 1 parto registrado)
            if (mapped.filter(a => a.sex === 'F').length > 0) {
                const femaleIds = mapped.filter(a => a.sex === 'F').map(a => `'${a.id}'`).join(',');
                if (femaleIds) {
                    const calvedRows = await db.getAllAsync<{ id_ranch_animal: string }>(
                        `SELECT DISTINCT ae.id_ranch_animal
             FROM parturitions p
             JOIN animal_events ae ON ae.id = p.id_event
             WHERE ae.id_ranch_animal IN (${femaleIds})
               AND p.cria_status = 'alive'`
                    );
                    const calvedSet = new Set(calvedRows.map(r => r.id_ranch_animal));
                    mapped.forEach(a => { if (calvedSet.has(a.id)) a.hasCalved = true; });
                }
            }

            setAnimals(mapped);
            setMeta({ total: mapped.length, pages: 1 });

        } catch (e) {
            console.error('useGetListAnimals error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refrescar automáticamente al enfocar la pantalla si autoFetch es true
    useFocusEffect(
        useCallback(() => {
            if (autoFetch) {
                fetchAnimals();
            }
        }, [fetchAnimals, autoFetch])
    );

    return {
        animals,
        loading,
        meta,
        refreshAnimals: fetchAnimals,
    };
}