/**
 * DbProvider.tsx
 * Estancia360 — Provider React Native para inicialización de la DB
 *
 * Uso en _layout.tsx (Expo Router) o App.tsx:
 *
 *   import { DbProvider } from '@/db/DbProvider';
 *
 *   export default function RootLayout() {
 *     return (
 *       <DbProvider>
 *         <Stack />
 *       </DbProvider>
 *     );
 *   }
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { getDb } from './db-pool';

// ─── Context ──────────────────────────────────────────────────────────────────

interface DbContextValue {
    isReady: boolean;
}

const DbContext = createContext<DbContextValue>({ isReady: false });

export function useDb(): DbContextValue {
    return useContext(DbContext);
}

// ─── Diagnóstico web — expo-sqlite web (alpha) se cuelga en silencio ──────────
//
// Investigación 2026-08-05: expo-sqlite en web usa un Worker + wa-sqlite (WASM) que
// necesita `SharedArrayBuffer` disponible, lo cual requiere que el DOCUMENTO RAÍZ
// (no solo el bundle JS/worker) se sirva con headers Cross-Origin-Opener-Policy +
// Cross-Origin-Embedder-Policy — confirmado con la spec (web.dev/articles/coop-coep:
// "COOP and COEP must be set on the HTML document response — not on sub-resources")
// y con reportes idénticos en el repo de Expo (github.com/expo/expo issues #36392,
// #38481, #39903 — mismo síntoma: `SharedArrayBuffer is not defined` o cuelgue
// silencioso, en varios casos con el reporte explícito de que el bundle/worker sí
// traía los headers pero la respuesta raíz `/` no). `metro.config.js` de este
// proyecto ya intenta setear esos headers vía `enhanceMiddleware`, pero no hay forma
// de confirmar sin testear en vivo si el dev server de Expo realmente los aplica a
// `/` — soporte web de expo-sqlite está marcado "alpha, may be unstable" en la doc
// oficial. Mientras no se confirme end-to-end, este chequeo convierte un cuelgue
// silencioso (spinner infinito, cero errores en consola) en un diagnóstico visible.
function checkWebCrossOriginIsolation(): string | null {
    if (Platform.OS !== 'web') return null;
    // globalThis en vez de window: este proyecto compila sin lib "DOM" (solo ESNext),
    // así que `window` no existe como tipo — globalThis sí, y en el navegador apunta
    // al mismo objeto global.
    const isolated = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
    if (isolated === false) {
        return (
            'crossOriginIsolated=false — el navegador no tiene SharedArrayBuffer disponible, ' +
            'necesario para expo-sqlite en web. El documento raíz no está recibiendo los headers ' +
            'Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy (ver metro.config.js). Esta es ' +
            'la causa más probable de un cuelgue silencioso en "Inicializando...".'
        );
    }
    return null;
}

const DB_INIT_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (err) => { clearTimeout(timer); reject(err); },
        );
    });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface DbProviderProps {
    children: React.ReactNode;
}

export function DbProvider({ children }: DbProviderProps) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const isolationWarning = checkWebCrossOriginIsolation();
        if (isolationWarning) console.warn('[DbProvider]', isolationWarning);

        const timeoutMessage = isolationWarning
            ? `La base de datos no respondió en ${DB_INIT_TIMEOUT_MS / 1000}s. ${isolationWarning}`
            : `La base de datos no respondió en ${DB_INIT_TIMEOUT_MS / 1000}s (posible cuelgue de expo-sqlite en web — ver DbProvider.tsx).`;

        withTimeout(getDb(), DB_INIT_TIMEOUT_MS, timeoutMessage)
            .then(() => { if (mounted) setIsReady(true); })
            .catch(e => { if (mounted) setError(e instanceof Error ? e.message : 'Error inicializando DB'); });

        return () => { mounted = false; };
    }, []);

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>Error al inicializar base de datos:{'\n'}{error}</Text>
            </View>
        );
    }

    if (!isReady) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={styles.loading}>Inicializando...</Text>
            </View>
        );
    }

    return (
        <DbContext.Provider value={{ isReady }}>
            {children}
        </DbContext.Provider>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    error: { color: '#c0392b', textAlign: 'center', fontSize: 14 },
    loading: { marginTop: 12, color: '#666' },
});
