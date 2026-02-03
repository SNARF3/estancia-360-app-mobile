import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { RanchResponseData } from '../auth/use-RegisterRanch'; // Reutilizamos la interfaz

export const useRanchData = () => {
    const [ranch, setRanch] = useState<RanchResponseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para cargar datos desde AsyncStorage
    const loadRanchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const storedData = await AsyncStorage.getItem('ranchData');
            if (storedData) {
                const parsedData: RanchResponseData = JSON.parse(storedData);
                setRanch(parsedData);
            } else {
                setError('No se encontró información de la estancia.');
            }
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