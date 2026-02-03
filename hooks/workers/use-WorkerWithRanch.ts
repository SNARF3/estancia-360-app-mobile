import { useState } from 'react';
import { postRequest } from '../db.postre-connection/db.connection';

interface LinkWorkerResponse {
    message: string;
}

interface LinkWorkerPayload {
    idUser: number;
    idRanch: number;
}

export const useWorkerWithRanch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const linkWorkerToRanch = async (idUser: number, idRanch: number): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const payload: LinkWorkerPayload = {
                idUser,
                idRanch
            };

            console.log('🔗 Vinculando trabajador...', payload);

            // Usamos tu conexión existente
            await postRequest<LinkWorkerResponse>('estancia-360/ranch-users', payload);

            return true; // Éxito
        } catch (err: any) {
            console.error('❌ Error al vincular estancia:', err);
            const msg = err.response?.data?.message || 'Error al conectar con la estancia.';
            setError(msg);
            return false; // Fallo
        } finally {
            setLoading(false);
        }
    };

    return {
        linkWorkerToRanch,
        loading,
        error
    };
};