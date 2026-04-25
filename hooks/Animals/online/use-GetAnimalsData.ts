import { useEffect, useState } from 'react';
import { getRequest } from '../../db.postre-connection/db.connection';

export interface AnimalBreed {
    id: number;
    name: string;
}

export interface BreedsResponse {
    breeds: AnimalBreed[];
}

export const useGetAnimalsData = () => {
    const [breeds, setBreeds] = useState<AnimalBreed[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBreeds = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest<any>('estancia-360/animal-breeds');
            console.log('Breeds API response:', JSON.stringify(response, null, 2));

            if (response) {
                // Handle different response structures
                const breedsData = response.breeds || response.data?.breeds || response.data;

                if (Array.isArray(breedsData)) {
                    setBreeds(breedsData);
                }
            }
        } catch (err: any) {
            console.error('Error fetching breeds:', err);
            setError(err?.message || 'Error al obtener las razas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBreeds();
    }, []);

    return {
        breeds,
        loading,
        error,
        refreshBreeds: fetchBreeds,
    };
};
