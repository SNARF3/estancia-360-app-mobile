// hooks/auth/useAuthRedirect.ts
import { useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  IS_LOGGED_IN: 'is_logged_in',
  ACCESS_TOKEN: 'access_token',
};

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  '/views/auth/login',
  '/views/auth/register',
  '/views/auth/forgot-password',
  '/views/auth/welcome',
  '/', // pantalla de inicio si la tienes
];

// Rutas protegidas (requieren autenticación)
const PROTECTED_ROUTES = [
  '/views/(tabs)/',
  '/views/admin/',
  '/views/management/',
  '/views/profile',
  // Agrega más según tu app
];

export const useAuthRedirect = () => {
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
        const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        const isAuthenticated = !!(isLoggedIn === 'true' && accessToken);
        const isPublicRoute = PUBLIC_ROUTES.some(route => 
          pathname.startsWith(route)
        );
        const isProtectedRoute = PROTECTED_ROUTES.some(route => 
          pathname.startsWith(route)
        );

        // Caso 1: Está autenticado pero está en ruta pública (login/register)
        if (isAuthenticated && isPublicRoute) {
          console.log('Usuario autenticado en ruta pública, redirigiendo...');
          router.replace('/views/(tabs)/management/Administracion');
          return;
        }

        // Caso 2: NO está autenticado pero está en ruta protegida
        if (!isAuthenticated && isProtectedRoute) {
          console.log('Usuario no autenticado en ruta protegida, redirigiendo a login...');
          router.replace('/views/auth/Login');
          return;
        }

      } catch (error) {
        console.error('Error verificando autenticación:', error);
        // En caso de error, redirigir a login por seguridad
        if (!pathname.startsWith('/views/auth/')) {
          router.replace('/views/auth/Login');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthStatus();
  }, [pathname]);

  return { isChecking };
};