import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';


const API_BASE_URL = 'https://estancia-360-app-test.onrender.com/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

// Configuración de axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Función para realizar peticiones PUT
export const putRequest = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  try {
    const response = await axiosInstance.put(endpoint, data);
    return response.data as T;
  } catch (error: any) {
    throw error;
  }
};

// Función para realizar peticiones GET
// Ahora devuelve Promesa de ApiResponse<T> sin dar error en el catch
export const getRequest = async <T = any>(
  endpoint: string
): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await axiosInstance.get(
      endpoint
    );
    return response.data;
  } catch (error: any) {
    // Este objeto ahora sí cumple con la interfaz ApiResponse
    return {
      success: false,
      error: error.message || 'Error desconocido en la petición',
    };
  }
};

export default axiosInstance;