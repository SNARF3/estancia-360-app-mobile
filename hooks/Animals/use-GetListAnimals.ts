import { useEffect, useState } from 'react';
import { useAuth } from '../auth/use-Auth';
import { getRequest } from '../db.postre-connection/db.connection';

export interface Animal {
    id: number;
    code: string;
    idMother: string | null;
    idFather: string | null;
    birthdate: string;
    weight: number;
    sex: 'M' | 'F';
    isCastrated: boolean;
    isSterilized: boolean;
    hasCalved: boolean;
    createdAt: string;
    breed: {
        id: number;
        name: string;
    };
    status: {
        id: number;
        name: string;
    };
}

export interface ListAnimalsResponse {
    data: Animal[];
    meta: {
        page: number;
        limit: number;
        pages: number;
        total: number;
    };
}

export const useGetListAnimals = () => {
    const { userData } = useAuth();
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [meta, setMeta] = useState<ListAnimalsResponse['meta'] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Obtener el idRanch de los datos del usuario en memoria
    const idRanch = userData?.user?.ranchUsers?.[0]?.idRanch || null;

    const fetchAnimals = async () => {
        if (!idRanch) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await getRequest<ListAnimalsResponse>(`estancia-360/ranch-animals/${idRanch}`);
            if (response && response.data) {
                // Ensure data is mapped correctly based on the provided JSON structure
                const animalsData = Array.isArray(response.data) ? response.data : response.data.data;
                setAnimals(animalsData || []);
                setMeta(response.data.meta || null);
            }
        } catch (err: any) {
            console.error('Error fetching animals:', err);
            setError(err?.message || 'Error al obtener la lista de animales');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (idRanch) {
            fetchAnimals();
        }
    }, [idRanch]);

    return {
        animals,
        meta,
        loading,
        error,
        refreshAnimals: fetchAnimals,
    };
};
