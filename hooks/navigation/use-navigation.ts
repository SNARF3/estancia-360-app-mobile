import { useRouter } from 'expo-router';

export type AppRoute = 
  | '/views/(tabs)/management/Administracion'
  | '/views/(tabs)/management/Agregar'
  | '/views/(tabs)/users/usuario'
  | '/views/(tabs)/users/estanciaRegistro'
  | '/views/auth/login'
  | 'views/auth/inicio'
  | '/views/auth/Register';

export const useNavigation = () => {
  const router = useRouter();

  const navigate = (route: AppRoute) => {
    router.push(route as any);
  };

  const navigateToLogin = () => {
    router.push('/views/auth/Login');
  };

  const navigateToRegister = () => {
    router.push('/views/auth/Register');
  };

  const navigateToInicio = () => {
    router.push('/inicio' as any);
  };

  return {
    navigate,
    navigateToLogin,
    navigateToRegister,
    navigateToInicio,
  };
};