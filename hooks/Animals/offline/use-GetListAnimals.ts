// hooks/Animals/offline/use-GetListAnimals.ts

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getSession } from '../../auth/use-Auth';
import { constants } from '../../../constants/constants';
import { getDb } from '../../db.sqlite/db-pool';
import { devLog } from '../../devLogger';

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
                id_breed: number;
                breed_id: number | null;
                breed_name: string | null;
            }>(
                `SELECT
           a.id, a.server_id, a.code, a.sex, a.birthdate, a.weight,
           a.origin, a.id_lot, a.id_productive_status, a.id_animal_class,
           a.id_status, a.id_mother, a.id_father, a.id_breed,
           b.id   AS breed_id,
           b.name AS breed_name
         FROM ranch_animals a
         LEFT JOIN animal_breeds b ON b.id = a.id_breed
         WHERE a.id_ranch = ? AND a.id_status != 3
         ORDER BY a.code ASC`,
                [session.id_ranch]
            );

            devLog(`[animals] fetchAnimals: session.id_ranch=${JSON.stringify(session.id_ranch)} → ${rows.length} filas con el filtro completo (id_ranch + id_status!=3)`);
            if (rows.length === 0) {
                // Diagnóstico 2026-09-23: la descarga de sync reporta animales "updated" pero acá
                // no aparece ninguno — esto descompone el filtro para ver exactamente dónde se
                // pierden, en vez de seguir adivinando (ver docs/dev-logging.md).
                try {
                    const totalRaw = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ranch_animals');
                    const byRanch = await db.getAllAsync<{ id_ranch: string; t: string; count: number }>(
                        'SELECT id_ranch, typeof(id_ranch) as t, COUNT(*) as count FROM ranch_animals GROUP BY id_ranch, typeof(id_ranch)'
                    );
                    const matchingRanchNoStatusFilter = await db.getFirstAsync<{ count: number }>(
                        'SELECT COUNT(*) as count FROM ranch_animals WHERE id_ranch = ?', [session.id_ranch]
                    );
                    const statusBreakdown = await db.getAllAsync<{ id_status: number; count: number }>(
                        'SELECT id_status, COUNT(*) as count FROM ranch_animals WHERE id_ranch = ? GROUP BY id_status', [session.id_ranch]
                    );
                    devLog(
                        `[animals] DIAGNÓSTICO vacío → total en tabla (sin ningún filtro): ${totalRaw?.count}`,
                        `| agrupado por id_ranch real (valor + tipo SQLite):`, byRanch,
                        `| con id_ranch=session pero SIN filtro id_status: ${matchingRanchNoStatusFilter?.count}`,
                        `| desglose de id_status para ese id_ranch:`, statusBreakdown
                    );
                } catch (diagErr) {
                    devLog('[animals] DIAGNÓSTICO vacío → error corriendo las queries de diagnóstico:', diagErr);
                }
            }

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
                    // b.id/b.name pueden venir null si id_breed no matchea ningún catálogo
                    // local (ej. animal descargado del servidor con una raza fuera del
                    // catálogo sembrado localmente) — antes esto era un INNER JOIN y esos
                    // animales directamente desaparecían de la lista sin ningún aviso.
                    breed: { id: r.breed_id ?? r.id_breed, name: r.breed_name ?? 'Raza desconocida' },
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