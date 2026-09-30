import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

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

// La mayoría de los endpoints del backend requieren JWT (@UserUp() global salvo @Public()).
// Sin esto, cualquier llamada autenticada por este cliente fallaba con 401 siempre —
// nunca se adjuntaba el token (a diferencia de sync.ts, que sí lo hacía por fetch).
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

// Función para realizar peticiones DELETE
export const deleteRequest = async <T = any>(
  endpoint: string
): Promise<T> => {
  try {
    const response = await axiosInstance.delete(endpoint);
    return response.data as T;
  } catch (error: any) {
    throw error;
  }
};

export default axiosInstance;