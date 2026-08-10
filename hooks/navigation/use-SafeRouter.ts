import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

// Ignora una segunda navegación disparada dentro de este margen desde la última —
// evita que un doble-tap apile una pantalla duplicada en el Stack (revelada después
// por el swipe-back nativo, que hace pops reales uno por uno).
const NAV_GUARD_MS = 600;

type Href = Parameters<ReturnType<typeof useRouter>['push']>[0];

export function useSafeRouter() {
    const router = useRouter();
    const lastNavRef = useRef(0);

    const guard = useCallback((action: () => void) => {
        const now = Date.now();
        if (now - lastNavRef.current < NAV_GUARD_MS) return;
        lastNavRef.current = now;
        action();
    }, []);

    const push = useCallback((href: Href) => guard(() => router.push(href)), [guard, router]);
    const replace = useCallback((href: Href) => guard(() => router.replace(href)), [guard, router]);

    return { push, replace };
}
