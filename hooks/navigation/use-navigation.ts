import { useRouter } from 'expo-router';

export type AppRoute =
  | '/views/(tabs)/admin/management/Administracion'
  | '/views/(tabs)/admin/management/Agregar'
  | '/views/(tabs)/users/usuario'
  | '/views/(tabs)/users/estanciaRegistro'
  | '/views/auth/login'
  | 'views/auth/inicio'
  | '/views/auth/Register'
  | '/views/(tabs)/worker/WorkerManagement'
  | '/views/(tabs)/worker/QrScannerRanch';

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