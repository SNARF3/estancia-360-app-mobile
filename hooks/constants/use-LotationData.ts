import { useCallback, useState } from 'react';
import { getRequest } from '../db.postre-connection/db.connection';

export interface LocationItem {
    id: number;
    name: string;
}

export const useLocationData = () => {
    const [countries, setCountries] = useState<LocationItem[]>([]);
    const [regions, setRegions] = useState<LocationItem[]>([]);
    const [cities, setCities] = useState<LocationItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Obtener Países
    const fetchCountries = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // TRUCO: Usamos 'as any' para decirle a TypeScript "confía en mí, voy a revisar qué viene"
            const response = await getRequest('estancia-360/countries') as any;

            console.log('📦 Respuesta Países:', response); // Console log para verificar estructura

            // Verificamos si existe la propiedad .countries y si es un array
            if (response && response.countries && Array.isArray(response.countries)) {
                setCountries(response.countries);
            }
            // Caso de seguridad: a veces las APIs devuelven el array directo sin la propiedad 'countries'
            else if (Array.isArray(response)) {
                setCountries(response);
            } else {
                console.warn('⚠️ Estructura inesperada en Países:', response);
                setCountries([]);
            }
        } catch (err) {
            console.error('❌ Error cargando países:', err);
            setError('Error al cargar la lista de países');
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Obtener Regiones
    const fetchRegions = useCallback(async (idCountry: number) => {
        setRegions([]);
        setCities([]);
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`estancia-360/regions/${idCountry}`) as any;

            console.log('📦 Respuesta Regiones:', response);

            // Verificamos si viene dentro de { regions: [...] } o directo [...]
            if (response && response.regions && Array.isArray(response.regions)) {
                setRegions(response.regions);
            } else if (Array.isArray(response)) {
                setRegions(response);
            } else {
                setRegions([]);
            }
        } catch (err) {
            console.error('❌ Error cargando regiones:', err);
            setError('Error al cargar las regiones');
        } finally {
            setLoading(false);
        }
    }, []);

    // 3. Obtener Ciudades
    const fetchCities = useCallback(async (idRegion: number) => {
        setCities([]);
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`estancia-360/cities/${idRegion}`) as any;

            console.log('📦 Respuesta Ciudades:', response);

            // Verificamos si viene dentro de { cities: [...] } o directo [...]
            if (response && response.cities && Array.isArray(response.cities)) {
                setCities(response.cities);
            } else if (Array.isArray(response)) {
                setCities(response);
            } else {
                setCities([]);
            }
        } catch (err) {
            console.error('❌ Error cargando ciudades:', err);
            setError('Error al cargar las ciudades');
        } finally {
            setLoading(false);
        }
    }, []);

    const resetLocationData = () => {
        setCountries([]);
        setRegions([]);
        setCities([]);
        setError(null);
    };

    return {
        countries,
        regions,
        cities,
        loading,
        error,
        fetchCountries,
        fetchRegions,
        fetchCities,
        resetLocationData
    };
};