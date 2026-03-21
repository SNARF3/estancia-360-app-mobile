// hooks/auth/useAuthRedirect.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

const STORAGE_KEYS = {
  IS_LOGGED_IN: 'is_logged_in',
  ACCESS_TOKEN: 'access_token',
  USER_ROLE: 'user_role', // Key usada en Login
};

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  '/views/auth/login',
  '/views/auth/register',
  '/views/auth/forgot-password',
  '/views/auth/welcome',
  // '/', // REMOVED: pantalla de inicio si la tienes (causes infinite loop with startsWith)
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
        ) || pathname === '/';
        const isProtectedRoute = PROTECTED_ROUTES.some(route =>
          pathname.startsWith(route)
        );

        // Caso 1: Está autenticado pero está en ruta pública (login/register)
        if (isAuthenticated && isPublicRoute) {
          const roleIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE); // Asegúrate que esta key exista en STORAGE_KEYS del archivo, si no, usa 'user_role' literal o ajusta
          const roleId = roleIdStr ? parseInt(roleIdStr) : null;

          console.log(`Usuario autenticado (Rol: ${roleId}) en ruta pública, redirigiendo...`);

          if (roleId === 3) {
            router.replace('/views/(tabs)/worker/WorkerManagement');
          } else {
            // Por defecto admin o owner
            router.replace('/views/(tabs)/admin/management/Management');
          }
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