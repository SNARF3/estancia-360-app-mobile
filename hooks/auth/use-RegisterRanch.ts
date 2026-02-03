import AsyncStorage from '@react-native-async-storage/async-storage'; // Importamos AsyncStorage
import { useCallback, useState } from 'react';
import { postRequest } from '../db.postre-connection/db.connection';

// 1. Interfaz de los datos que ENVÍAS al backend
export interface RegisterRanchPayload {
    idUser: number;
    idCity: number;
    idProductionType: number;
    name: string;
}

// 2. Interfaces de la RESPUESTA del backend
export interface RanchResponseData { // Exportamos esta interfaz para reusarla
    id: number;
    name: string;
    city: {
        id: number;
        name: string;
    };
    productionType: {
        id: number;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

interface RegisterRanchResponse {
    message: string;
    ranch: RanchResponseData;
}

export const useRegisterRanch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<RegisterRanchResponse | null>(null);

    const registerRanch = useCallback(async (payload: RegisterRanchPayload) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            // Endpoint: /api/estancia-360/ranches
            const response = await postRequest<RegisterRanchResponse>(
                'estancia-360/ranches',
                payload
            );

            setData(response);

            // --- NUEVO: GUARDAR EN MEMORIA (AsyncStorage) ---
            if (response && response.ranch) {
                await AsyncStorage.setItem('ranchData', JSON.stringify(response.ranch));
                console.log('💾 Datos del rancho guardados en memoria:', response.ranch.name);
            }
            // -----------------------------------------------

            return response;
        } catch (err: any) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                'Error al registrar la estancia';

            setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        registerRanch,
        loading,
        error,
        data,
    };
};