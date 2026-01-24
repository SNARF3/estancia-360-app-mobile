// hooks/auth/useAuth.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  USER_EMAIL: 'user_email',
  USER_DATA: 'user_data',
  IS_LOGGED_IN: 'is_logged_in',
};

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (token && userDataStr) {
        setIsAuthenticated(true);
        setUserData(JSON.parse(userDataStr));
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setIsAuthenticated(false);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      setIsAuthenticated(false);
      setUserData(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  };

  const getUserRole = async (): Promise<number | null> => {
    try {
      const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
      return role ? parseInt(role, 10) : null;
    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return null;
    }
  };

  return {
    isAuthenticated,
    userData,
    loading,
    checkAuthStatus,
    logout,
    getToken,
    getUserRole,
  };
};