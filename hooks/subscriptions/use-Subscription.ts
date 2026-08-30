// hooks/subscriptions/use-Subscription.ts
// Lectura del estado de suscripción de la estancia — módulo administrativo, no
// una pasarela de pago (ver docs/pagos-suscripciones.md). El móvil SOLO lee:
// no hay pantalla de elegir/activar plan ni de pagar, eso vive en el panel web.
// Sin sync offline — se cachea en AsyncStorage (mismo patrón que use-Auth.ts)
// para tener el último estado conocido disponible sin conexión.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { getRequest } from '../db.postre-connection/db.connection';

export interface SubscriptionPlan {
    id: number;
    name: string;
    capacityMin: number;
    capacityMax: number | null; // null = sin límite (Ganadero Plus)
    priceMonthly: number;
    priceAnnual: number;
    trialDays: number;
    isActive: boolean;
}

export interface Subscription {
    id: number;
    idRanch: number;
    idPlan: number;
    billingCycle: 'monthly' | 'annual' | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    effectiveStatus: 'trial' | 'active' | 'expired' | 'cancelled';
    plan: SubscriptionPlan;
}

const cacheKey = (idRanch: string) => `subscription_cache_${idRanch}`;

export async function getCachedSubscription(idRanch: string): Promise<Subscription | null> {
    try {
        const raw = await AsyncStorage.getItem(cacheKey(idRanch));
        return raw ? (JSON.parse(raw) as Subscription) : null;
    } catch {
        return null;
    }
}

async function cacheSubscription(idRanch: string, sub: Subscription): Promise<void> {
    try {
        await AsyncStorage.setItem(cacheKey(idRanch), JSON.stringify(sub));
    } catch (err) {
        console.error('[use-Subscription] no se pudo cachear la suscripción:', err);
    }
}

/** Pide el estado real al backend y actualiza el cache. Tira si falla (sin red, 403, etc.). */
export async function fetchAndCacheSubscription(idRanch: string): Promise<Subscription> {
    const res = await getRequest<{ subscription: Subscription }>(`subscriptions/my-ranch/${idRanch}`);
    if (res.success === false) {
        throw new Error(res.error ?? 'No se pudo consultar el estado de tu plan.');
    }
    const sub = (res as any).subscription ?? (res.data as any)?.subscription;
    if (!sub) throw new Error('Respuesta inválida del servidor al consultar el plan.');
    await cacheSubscription(idRanch, sub);
    return sub as Subscription;
}

/**
 * Capacidad efectiva — replica la regla del backend
 * (RanchSubscriptionsService.getEffectiveCapacity): si el plan venció o se
 * canceló, la capacidad cae a la del plan Free (30) sin importar el plan
 * asignado; si no, es la del plan actual (null = sin límite).
 */
export function getEffectiveCapacity(sub: Subscription | null): number | null {
    if (!sub) return null; // sin cache = desconocido, no evaluable localmente
    if (sub.effectiveStatus === 'expired' || sub.effectiveStatus === 'cancelled') return 30;
    return sub.plan.capacityMax;
}

export function useSubscription(idRanch: string | undefined) {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!idRanch) { setIsLoading(false); return; }
        try {
            const sub = await fetchAndCacheSubscription(idRanch);
            setSubscription(sub);
            setError(null);
        } catch (e: any) {
            setError(e.message ?? 'No se pudo actualizar el estado del plan.');
        } finally {
            setIsLoading(false);
        }
    }, [idRanch]);

    useEffect(() => {
        if (!idRanch) { setIsLoading(false); return; }
        let cancelled = false;
        (async () => {
            // 1. Mostrar de inmediato el último estado conocido (funciona offline).
            const cached = await getCachedSubscription(idRanch);
            if (!cancelled && cached) {
                setSubscription(cached);
                setIsLoading(false);
            }
            // 2. Refrescar en segundo plano — si falla (sin red), nos quedamos con el cache.
            try {
                const fresh = await fetchAndCacheSubscription(idRanch);
                if (!cancelled) { setSubscription(fresh); setError(null); }
            } catch (e: any) {
                if (!cancelled && !cached) setError(e.message ?? 'No se pudo consultar el estado del plan.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [idRanch]);

    return { subscription, isLoading, error, refresh };
}
