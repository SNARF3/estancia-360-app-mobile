import { useState } from 'react';
import { useAuth } from '../auth/use-Auth';
import { postRequest } from '../db.postre-connection/db.connection';

interface AnimalRegistrationData {
    idRanch: number;
    idBreed: number;
    idStatus: number;
    code: string;
    codeMother: string | null;
    codeFather: string | null;
    birthdate: string;
    weight: number;
    sex: 'M' | 'F';
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    createdAt?: string;
}

export const useAnimalRegister = () => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Obtener el idRanch de los datos del usuario en memoria
    // Basado en la estructura de UserRanchData guardada en use-UserLoginLogic.ts
    const idRanch = userData?.user?.ranchUsers?.[0]?.idRanch || null;

    const registerAnimal = async (animalData: Omit<AnimalRegistrationData, 'idRanch'>) => {
        if (!idRanch) {
            setError('No se pudo encontrar el ID de la estancia.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const payload: AnimalRegistrationData = {
                ...animalData,
                idRanch: idRanch,
                // Si no se proporciona createdAt, el backend debería manejarlo, 
                // pero lo incluimos si es necesario para el endpoint.
                createdAt: animalData.createdAt || new Date().toISOString(),
            };

            const response = await postRequest('estancia-360/ranch-animals', payload);

            if (response) {
                setSuccess(true);
                return response;
            }
        } catch (err: any) {
            console.error('Error registrando animal:', err);
            setError(err?.message || 'Error al registrar el animal');
        } finally {
            setLoading(false);
        }
    };

    return {
        registerAnimal,
        loading,
        error,
        success,
        idRanch,
        setError,
        setSuccess
    };
};
