import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRequest, postRequest } from '../db.postre-connection/db.connection';
import { downloadFromServer } from '../db.sqlite/sync';
import { saveCredentials, saveSession } from './use-Auth';

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
    // Forma real del backend (RanchDto): un array de { idProductionType, productionType: {id,name} },
    // no { id, name } directo — el nombre de campo tampoco es "productionTypesDirectly".
    productionTypes: Array<{
      idProductionType: number;
      productionType: { id: number; name: string };
    }>;
    createdAt: string;
    updatedAt: string;
    ranchUsers: Array<{
      user: {
        id: number;
        roleId: number; // backend: UserDto.roleId, no "idRole"
        ci: string;
        fullname: string;
        paternalSurname: string;
        maternalSurname: string;
        email: string;
        celphone: string | null;
        isDeleted: boolean;
        createdAt: string;
        updatedAt: string;
        role: { id: number; name: string };
      };
      role: { id: number; name: string }; // Rol del usuario EN la estancia (RanchRoleDto)
      // "salary" no existe en RanchUserWithUserDto del backend — no usarlo.
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
        'auth/login',
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
        await saveCredentials(formData.email.trim(), formData.password);

        // Guardar el token YA en AsyncStorage antes de pedir los datos de la estancia —
        // el interceptor de axios (db.connection.ts) lo lee de ahí para el header
        // Authorization. Antes esto se guardaba recién en saveSession() más abajo,
        // así que el GET de ranches siguiente salía sin token y el backend
        // respondía 401 INVALID_TOKEN.
        await AsyncStorage.setItem('access_token', response.accessToken);

        let userDetails: UserRanchData | null = null;

        // El login ya me da el idRanch. Lo usamos para traer toda la metadata. Si no vino
        // (puede pasar igual que el usuario sí tenga una estancia), probamos el fallback por
        // idUser — en cualquiera de los dos casos, si el usuario realmente no tiene estancia
        // (ej. Colaborador recién registrado sin QR escaneado todavía), userDetails queda null.
        const fetchEndpoint = response.idRanch
          ? `ranches/${response.idRanch}`
          : `users/ranches/${response.idUser}`;

        try {
          const apiResponse = await getRequest<UserRanchData>(fetchEndpoint);
          if (apiResponse) {
             // Adaptamos si viene con campo data o directo
            userDetails = apiResponse.data || (apiResponse as any as UserRanchData);
          }
        } catch (fetchError) {
          console.error('No se pudieron obtener datos del ranch:', fetchError);
        }

        // ranchRole (RanchRolesEnum: OWNER=1, WORKER=2, ADMINISTRATOR=3) decide a qué
        // pantalla redirigir más abajo — NO usar response.idRole para eso (ese es el rol
        // de SISTEMA: ROOT=1, ADMIN=2, USUARIO=3, y prácticamente todo ganadero normal
        // tiene idRole=3 ahí. Comparar idRole===3 mandaba a CUALQUIER dueño de estancia
        // a la pantalla de Worker por error).
        let ranchRole: number | undefined;

        if (userDetails && userDetails.ranch) {
          const ranch = userDetails.ranch;
          // Buscamos al usuario actual dentro de los miembros de esa estancia para sacar el nombre y rol real
          const currentMember = ranch.ranchUsers.find(ru => ru.user.id === response.idUser);
          ranchRole = currentMember?.role.id;

          await saveSession({
            accessToken: response.accessToken,
            idUser: response.idUser,
            idRole: response.idRole,
            email: formData.email.trim(),
            fullname: currentMember?.user.fullname || 'Usuario',
            id_ranch: ranch.id,
            ranch_name: ranch.name,
            production_types: ranch.productionTypes.map(pt => pt.idProductionType),
            ranch_role: ranchRole || response.idRole,
          });

          // logout() ahora borra SQLite por completo (ver use-Auth.ts) — sin esto, cada
          // login real (login nunca se llama salvo primera vez / tras logout /
          // reinstalación) dejaría al usuario con Management vacío hasta que entre a Sync
          // a mano. No bloquea el login si falla (ej. sin conexión) — el usuario puede
          // sincronizar manualmente después.
          try {
            await downloadFromServer(ranch.id, { fullSync: true });
          } catch (downloadError) {
            console.error('No se pudo descargar los datos de la estancia tras el login:', downloadError);
          }
        } else {
          // Sin ranch todavía (ej. Colaborador recién registrado que aún no escaneó ningún
          // QR) → igual pasa por saveSession() para que user_data tenga siempre la forma
          // SessionParams (antes se guardaba un objeto crudo con la forma de LoginResponse,
          // sin ranch_role/id_ranch — AuthGate/BottomTabBar dependen de esa forma consistente
          // para decidir a dónde enrutar en el próximo arranque de la app).
          await saveSession({
            accessToken: response.accessToken,
            idUser: response.idUser,
            idRole: response.idRole,
            email: formData.email.trim(),
            fullname: 'Usuario',
          });
        }

        setSuccessMessage(response.message || 'Inicio de sesión exitoso');

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0.7, duration: 500, useNativeDriver: true }),
          Animated.timing(buttonSlideUp, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          // El criterio es "¿tiene una estancia asociada?", no el rol — un usuario sin
          // estancia (ej. Colaborador que todavía no escaneó ningún QR) va a
          // WorkerManagement (que hoy solo ofrece "Unirse a una Estancia"); cualquiera con
          // estancia (Owner, Administrator, o un Colaborador ya vinculado como Worker) va a
          // Management completo — ver bug real documentado en CLAUDE.md (esta rama antes
          // nunca seteaba ranch_role y por eso el chequeo `ranchRole === 2` mandaba
          // incorrectamente a Management a un usuario sin estancia).
          if (userDetails && userDetails.ranch) {
            router.replace('/views/(tabs)/admin/management/Management');
          } else {
            router.replace('/views/(tabs)/worker/WorkerManagement');
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