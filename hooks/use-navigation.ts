import { useRouter } from 'expo-router';

export type AppRoute = 
  | '/views/management/Administracion'
  | '/views/management/Agregar'
  | '/views/users/usuario'
  | '/views/login'
  | '/views/register';

export const useNavigation = () => {
  const router = useRouter();

  const navigateToTab = (route: AppRoute) => {
    router.push(route as any);
  };

  const navigateToLogin = () => {
    router.replace('/views/auth/login');
  };

  const navigateToRegister = () => {
    router.push('/views/auth/Register');
  };

  return {
    navigateToTab,
    navigateToLogin,
    navigateToRegister,
  };
};