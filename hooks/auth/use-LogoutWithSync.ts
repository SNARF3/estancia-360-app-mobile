// hooks/auth/use-LogoutWithSync.ts
//
// Cierre de sesión con sync forzado: antes de poder salir, se sincroniza todo lo
// pendiente (syncAll()). Si falla (sin conexión, error de servidor, límite de plan, etc.)
// NO se cierra sesión — se queda logueado y se muestra el motivo real. Solo si syncAll()
// confirma éxito se llama logout(), que además de limpiar AsyncStorage/SecureStore ahora
// también borra toda la base SQLite local (wipeLocalRanchData() en sync.ts) — así un
// dispositivo compartido entre varias cuentas/estancias nunca queda con datos de la
// sesión anterior.
//
// Usado por los 3 puntos de "Cerrar Sesión" de la app (usuario.tsx, Management.tsx,
// SyncScreen.tsx) para no triplicar esta lógica ni el manejo de errores.

import { useState } from 'react';
import { Alert } from 'react-native';
import { logout } from './use-Auth';
import { syncAll } from '../db.sqlite/sync';

export function useLogoutWithSync() {
    const [loggingOut, setLoggingOut] = useState(false);
    const [syncPhase, setSyncPhase] = useState('');
    const [syncProgress, setSyncProgress] = useState(0);

    const performLogout = async () => {
        setLoggingOut(true);
        setSyncPhase('Sincronizando antes de salir...');
        setSyncProgress(0);

        try {
            const result = await syncAll((msg, pct) => {
                setSyncPhase(msg);
                setSyncProgress(pct);
            });

            if (result.success) {
                await logout(); // logout() ya navega a Inicio, no hace falta nada más acá.
                return;
            }

            // Mismo criterio que SyncScreen.tsx para distinguir "sin conexión" de un
            // rechazo real (ej. límite de animales del plan superado).
            const isNetworkIssue = result.errors.length > 0 && result.errors.every((e) => e.table === 'network');
            const distinctMessages = Array.from(new Set(result.errors.map((e) => e.error))).slice(0, 2);
            const description = isNetworkIssue
                ? 'Necesitás conexión a internet para cerrar sesión — todavía hay datos sin sincronizar.'
                : `${distinctMessages.join(' — ') || 'No se pudo sincronizar todo.'}\n\nNo podés cerrar sesión hasta que todo esté sincronizado, para no perder datos.`;

            Alert.alert('No se pudo cerrar sesión', description);
        } catch {
            Alert.alert('No se pudo cerrar sesión', 'Ocurrió un error inesperado al sincronizar. Intentá de nuevo.');
        } finally {
            setLoggingOut(false);
            setSyncPhase('');
            setSyncProgress(0);
        }
    };

    const confirmLogout = () => {
        Alert.alert(
            'Cerrar sesión',
            'Antes de salir se va a sincronizar todo lo pendiente. ¿Querés continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar sesión', style: 'destructive', onPress: performLogout },
            ]
        );
    };

    return { confirmLogout, loggingOut, syncPhase, syncProgress };
}
