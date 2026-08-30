// hooks/subscriptions/use-CapacityGuard.ts
// Guard local de capacidad — se llama ANTES de las 3 escrituras offline que dan
// de alta animales (alta directa, parto con cría viva, compra vía Movimientos).
// Decisión de producto (confirmada 2026-08-20): si el cache sugiere que se
// llegaría/pasaría del límite, BLOQUEA hasta poder refrescar el estado real
// desde el servidor — no es un aviso blando que deja continuar con datos
// potencialmente desactualizados. Si claramente hay margen, no toca la red.

import { countActiveAnimals } from '../db.sqlite/repositories/animals';
import { fetchAndCacheSubscription, getCachedSubscription, getEffectiveCapacity } from './use-Subscription';

export type CapacityCheckResult = { allowed: true } | { allowed: false; message: string };

export async function assertCapacityAvailable(
    id_ranch: string,
    newAnimalsCount: number
): Promise<CapacityCheckResult> {
    const headcount = await countActiveAnimals(id_ranch);
    let sub = await getCachedSubscription(id_ranch);
    let capacity = getEffectiveCapacity(sub);

    // Sin cache (nunca se consultó el plan) o claramente dentro del límite: no hace
    // falta red para decidir.
    if (capacity == null || headcount + newAnimalsCount <= capacity) {
        return { allowed: true };
    }

    // El cache sugiere que se llegaría/pasaría del límite — puede estar desactualizado
    // (ej. el admin amplió el plan y este dispositivo no se enteró todavía), así que
    // hay que refrescar contra el servidor antes de bloquear en serio.
    try {
        sub = await fetchAndCacheSubscription(id_ranch);
    } catch {
        return {
            allowed: false,
            message: 'No se pudo verificar el límite de tu plan (sin conexión). Conectate a internet e intentá de nuevo.',
        };
    }

    capacity = getEffectiveCapacity(sub);
    if (capacity != null && headcount + newAnimalsCount > capacity) {
        return {
            allowed: false,
            message: `Tu plan (${sub.plan.name}) permite hasta ${capacity} animales y ya tenés ${headcount}. Contactá a Estancia360 para ampliar tu plan.`,
        };
    }
    return { allowed: true };
}
