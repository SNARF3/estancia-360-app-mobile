import { useCallback, useEffect, useState } from 'react';
import { getSession } from '../auth/use-Auth';
import { getRequest } from '../db.postre-connection/db.connection';
import { RanchResponseData } from '../auth/use-RegisterRanch'; // Reutilizamos la interfaz

export const useRanchData = () => {
    const [ranch, setRanch] = useState<RanchResponseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Nada en la app escribe nunca AsyncStorage['ranchData'] (solo 'user_data', con otra
    // forma) — esta pantalla (usada para generar el QR de invitación a trabajadores) fallaba
    // con "No se encontró información de la estancia" el 100% de las veces. Se reemplaza por
    // un fetch real de /ranches/:id usando el id_ranch de la sesión activa, mismo patrón que
    // use-UserLoginLogic.ts.
    const loadRanchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const session = await getSession();
            if (!session) {
                setError('No hay sesión activa.');
                return;
            }
            const response = await getRequest<RanchResponseData>(`ranches/${session.id_ranch}`);
            const ranchData = (response?.data ?? response) as RanchResponseData;
            if (!ranchData?.id) {
                setError('No se encontró información de la estancia.');
                return;
            }
            setRanch(ranchData);
        } catch (err) {
            console.error('Error leyendo datos de la estancia:', err);
            setError('Error al cargar la información de la estancia.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar automáticamente al montar
    useEffect(() => {
        loadRanchData();
    }, [loadRanchData]);

    return {
        ranch,
        loading,
        error,
        refreshRanchData: loadRanchData // Exponemos la función por si queremos recargar manual
    };
};