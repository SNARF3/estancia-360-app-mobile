import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { getRequest, postRequest } from '../db.postre-connection/db.connection';
import { saveSession } from './use-Auth';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  accessToken: string;
  idUser: number;
  idRole: number;
  idRanch?: number; // Ahora el backend puede regresar idRanch
}

interface UserRanchData {
  ranch: {
    id: number;
    name: string;
    city: { id: number; name: string };
    productionTypesDirectly: Array<{
      id: number;
      name: string;
    }>;
    createdAt: string;
    updatedAt: string;
    ranchUsers: Array<{
      user: {
        id: number;
        idRole: number;
        ci: string;
        fullname: string;
        paternalSurname: string;
        maternalSurname: string;
        email: string;
        celphone: string;
        isDeleted: boolean;
        createdAt: string;
        updatedAt: string;
        role: { id: number; name: string };
      };
      role: { id: number; name: string }; // Rol del usuario EN la estancia
      salary?: number | null;
    }>;
  };
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useUserLoginLogic = () => {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Animaciones ────────────────────────────────────────────────────────────
  const headerSlideUp = useRef(new Animated.Value(50)).current;
  const formSlideUp = useRef(new Animated.Value(80)).current;
  const buttonSlideUp = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const buttonSpinAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(headerSlideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(formSlideUp, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(buttonSlideUp, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(buttonSpinAnimation, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    } else {
      buttonSpinAnimation.setValue(0);
    }
  }, [loading]);

  const spinInterpolate = buttonSpinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ─── Validación ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = { email: '', password: '' };
    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    return errors;
  };

  const errors = validateForm();

  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (apiError) setApiError(null);
  };

  const handleBlur = (field: keyof LoginFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // ─── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (): Promise<void> => {
    const validationErrors = validateForm();
    const hasErrors = Object.values(validationErrors).some(e => e !== '');

    if (hasErrors) {
      setTouched({ email: true, password: true });
      triggerShakeAnimation();
      return;
    }

    setLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await postRequest<LoginResponse | BackendErrorResponse>(
        'estancia-360/auth/login',
        { email: formData.email.trim(), password: formData.password }
      );

      // Es error del backend
      if ('statusCode' in response && (response.statusCode ?? 0) >= 400) {
        console.log('Error del backend:', response);
        const msg = Array.isArray(response.message)
          ? response.message[0]
          : response.message ?? response.error ?? 'Error en el inicio de sesión';
        setApiError(msg);
        triggerShakeAnimation();
        return;
      }

      // Login exitoso
      if ('accessToken' in response && response.accessToken) {
        let userDetails: UserRanchData | null = null;
        
        // El login ya me da el idRanch. Lo usamos para traer toda la metadata.
        const idToFetchMetadata = response.idRanch || response.idUser; 
        const fetchEndpoint = response.idRanch 
          ? `estancia-360/ranches/${response.idRanch}` 
          : `estancia-360/users/ranches/${response.idUser}`;

        try {
          const apiResponse = await getRequest<UserRanchData>(fetchEndpoint);
          if (apiResponse) {
             // Adaptamos si viene con campo data o directo
            userDetails = apiResponse.data || (apiResponse as any as UserRanchData);
          }
        } catch (fetchError) {
          console.error('No se pudieron obtener datos del ranch:', fetchError);
        }

        if (userDetails && userDetails.ranch) {
          const ranch = userDetails.ranch;
          // Buscamos al usuario actual dentro de los miembros de esa estancia para sacar el nombre y rol real
          const currentMember = ranch.ranchUsers.find(ru => ru.user.id === response.idUser);

          await saveSession({
            accessToken: response.accessToken,
            idUser: response.idUser,
            idRole: response.idRole,
            email: formData.email.trim(),
            fullname: currentMember?.user.fullname || 'Usuario',
            id_ranch: ranch.id,
            ranch_name: ranch.name,
            production_types: ranch.productionTypesDirectly.map(pt => pt.id),
            ranch_role: currentMember?.role.id || response.idRole,
          });
        } else {
          // Sin ranch o sin datos extra → guardar solo lo básico en AsyncStorage
          // (no se guarda en SQLite porque no hay ranch)
          const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
          await AsyncStorage.multiSet([
            ['access_token', response.accessToken],
            ['user_id', response.idUser.toString()],
            ['user_role', response.idRole.toString()],
            ['user_data', JSON.stringify({ ...response, email: formData.email.trim() })],
          ]);
        }

        setSuccessMessage(response.message || 'Inicio de sesión exitoso');

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0.7, duration: 500, useNativeDriver: true }),
          Animated.timing(buttonSlideUp, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          if (response.idRole === 3) {
            router.replace('/views/(tabs)/worker/WorkerManagement');
          } else {
            router.replace('/views/(tabs)/admin/management/Management');
          }
        }, 1000);

      } else {
        setApiError('Respuesta inesperada del servidor');
        triggerShakeAnimation();
      }

    } catch (error: any) {
      let errorMessage = 'Error de conexión con el servidor';
      console.error('Error de conexión con el servidor:', error);

      if (error?.response?.data) {
        const d = error.response.data;
        errorMessage = Array.isArray(d.message) ? d.message[0]
          : d.message ?? d.error ?? errorMessage;
      } else if (error?.message?.includes('Network Error')) {
        errorMessage = 'Error de red. Verifica tu conexión a internet.';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'El servidor tardó demasiado en responder.';
      }

      setApiError(errorMessage);
      triggerShakeAnimation();
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const resetForm = (): void => {
    Animated.timing(fadeAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }).start(() => {
      setFormData({ email: '', password: '' });
      setTouched({ email: false, password: false });
      setApiError(null);
      setSuccessMessage(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const isFormValid = formData.email && formData.password && !errors.email && !errors.password;

  return {
    formData,
    touched,
    errors,
    loading,
    apiError,
    successMessage,
    animations: { headerSlideUp, formSlideUp, buttonSlideUp, fadeAnim, shakeAnimation, spinInterpolate },
    handleInputChange,
    handleBlur,
    handleLogin,
    resetForm,
    isFormValid,
  };
};