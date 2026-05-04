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
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getDb } from './db-pool';

// ─── Context ──────────────────────────────────────────────────────────────────

interface DbContextValue {
    isReady: boolean;
}

const DbContext = createContext<DbContextValue>({ isReady: false });

export function useDb(): DbContextValue {
    return useContext(DbContext);
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
        getDb()
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