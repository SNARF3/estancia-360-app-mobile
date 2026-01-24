import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Configuración base de la API
const API_BASE_URL = 'http://localhost:3000/api';

// Interfaz para la respuesta estándar de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Configuración de axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error('Error de servidor:', error.response.data);
    } else if (error.request) {
      console.error('Error de red: No se recibió respuesta del servidor');
    } else {
      console.error('Error de configuración:', error.message);
    }
    return Promise.reject(error);
  }
);

// Función para realizar peticiones POST
export const postRequest = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {  
  try {
    const response = await axiosInstance.post(endpoint, data);
    return response.data as T;
  } catch (error: any) {
    throw error;
  }
};

// --- NUEVA FUNCIÓN PUT ---
// Función para realizar peticiones PUT
export const putRequest = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {  
  try {
    // Usamos .put aquí
    const response = await axiosInstance.put(endpoint, data);
    return response.data as T;
  } catch (error: any) {
    throw error;
  }
};
// -------------------------

// Función para realizar peticiones GET
export const getRequest = async <T = any>(
  endpoint: string
): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await axiosInstance.get(
      endpoint
    );
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error desconocido en la petición',
    };
  }
};

export default axiosInstance;