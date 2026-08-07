import { useCallback, useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { getDb } from '../db.sqlite/db-pool';
import { cancelMovement, confirmMovementAnimal } from '../db.sqlite/repositories/events';

export interface PendingSaleAnimal {
    id_movement_animal: string;
    code: string;
}

export interface PendingSale {
    id_movement: string;
    counterpart_name: string | null;
    movement_date: string;
    total_price: number | null;
    animals: PendingSaleAnimal[];
}

/** Ventas registradas localmente que todavía tienen animales sin confirmar/rechazar. */
export function usePendingSales() {
    const [sales, setSales] = useState<PendingSale[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const rows = await db.getAllAsync<{
                id_movement: string;
                counterpart_name: string | null;
                movement_date: string;
                total_price: number | null;
                id_movement_animal: string;
                animal_code: string;
            }>(
                `SELECT m.id AS id_movement, m.counterpart_name, m.movement_date, m.total_price,
                ma.id AS id_movement_animal, ra.code AS animal_code
           FROM movement_animals ma
           JOIN movements m ON m.id = ma.id_movement
           JOIN ranch_animals ra ON ra.id = ma.id_ranch_animal
          WHERE m.id_ranch = ? AND m.movement_type = 'sale' AND ma.status = 'pending'
          ORDER BY m.movement_date DESC`,
                [session.id_ranch]
            );

            const byMovement = new Map<string, PendingSale>();
            for (const row of rows) {
                if (!byMovement.has(row.id_movement)) {
                    byMovement.set(row.id_movement, {
                        id_movement: row.id_movement,
                        counterpart_name: row.counterpart_name,
                        movement_date: row.movement_date,
                        total_price: row.total_price,
                        animals: [],
                    });
                }
                byMovement.get(row.id_movement)!.animals.push({ id_movement_animal: row.id_movement_animal, code: row.animal_code });
            }

            setSales(Array.from(byMovement.values()));
        } catch (e: any) {
            setError(e.message ?? 'Error al cargar las ventas pendientes.');
        } finally {
            setLoading(false);
        }
    }, []);

    const decide = useCallback(async (idMovementAnimal: string, status: 'accepted' | 'rejected'): Promise<boolean> => {
        setError(null);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            await confirmMovementAnimal(idMovementAnimal, session.id_user, status);
            await load();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al procesar la decisión.');
            return false;
        }
    }, [load]);

    // Cancela la venta completa (todos los animales todavía pending revierten a su
    // estado anterior) — equivalente a PATCH /movements/:id/cancel. Los animales que
    // ya se hayan aceptado individualmente no se ven afectados (irreversible).
    const cancel = useCallback(async (idMovement: string): Promise<boolean> => {
        setError(null);
        try {
            await cancelMovement(idMovement);
            await load();
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Error al cancelar la venta.');
            return false;
        }
    }, [load]);

    return { sales, loading, error, load, decide, cancel };
}
