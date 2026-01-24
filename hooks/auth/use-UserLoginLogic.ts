import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { postRequest } from '../db.postre-connection/db.connection';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  accessToken: string;
  idUser: number;
  idRole: number;
  user?: {
    email?: string;
    name?: string;
  };
}

// Interfaz para errores del backend
interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

// Claves para AsyncStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  USER_EMAIL: 'user_email',
  USER_DATA: 'user_data',
  IS_LOGGED_IN: 'is_logged_in',
};

export const useUserLoginLogic = () => {
  // Estados del formulario
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Animaciones
  const headerSlideUp = useRef(new Animated.Value(50)).current;
  const formSlideUp = useRef(new Animated.Value(80)).current;
  const buttonSlideUp = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Efecto para animaciones de entrada
  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideUp, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(formSlideUp, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(buttonSlideUp, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Efecto para animar mensajes de error/success
  useEffect(() => {
    if (apiError || successMessage) {
      const messageAnim = new Animated.Value(0);
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [apiError, successMessage]);

  // Validación del formulario
  const validateForm = () => {
    const errors = {
      email: '',
      password: '',
    };

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

  // Animación de shake para errores
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Función para guardar datos de sesión en AsyncStorage
  const saveSessionData = async (response: LoginResponse): Promise<void> => {
    try {
      // Guardar datos individualmente
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, response.idUser.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, response.idRole.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, formData.email);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');

      // También guardar el objeto completo como JSON
      const userData = {
        idUser: response.idUser,
        idRole: response.idRole,
        email: formData.email,
        accessToken: response.accessToken,
        message: response.message,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      
      console.log('Datos de sesión guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar datos de sesión:', error);
    }
  };

  // Función para verificar si hay sesión activa
  const checkExistingSession = async (): Promise<boolean> => {
    try {
      const isLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      return isLoggedIn === 'true';
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      return false;
    }
  };

  // Función para obtener datos del usuario actual
  const getCurrentUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      return null;
    }
  };

  // Función para cerrar sesión
  const logout = async (): Promise<void> => {
    try {
      // Eliminar todos los datos de sesión
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.IS_LOGGED_IN,
      ]);
      console.log('Sesión cerrada exitosamente');
      // Redirigir al login después de cerrar sesión
      router.replace('/views/auth/Login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Manejo de cambios en los inputs
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar errores de API cuando el usuario empieza a escribir
    if (apiError) setApiError(null);
  };

  // Manejo de blur en los inputs
  const handleBlur = (field: keyof LoginFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Función de login mejorada con manejo de errores
  const handleLogin = async (): Promise<void> => {
    // Validar antes de enviar
    const validationErrors = validateForm();
    const hasErrors = Object.values(validationErrors).some(error => error !== '');

    if (hasErrors) {
      // Marcar todos los campos como tocados para mostrar errores
      setTouched({
        email: true,
        password: true,
      });
      // Animar shake para indicar error
      triggerShakeAnimation();
      return;
    }

    setLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      // Preparar datos para enviar
      const loginData = {
        email: formData.email.trim(),
        password: formData.password,
      };

      console.warn('📤 Enviando a API:', loginData);

      // Llamar al endpoint de login - Usamos la unión de tipos para manejar ambos casos
      const response = await postRequest<LoginResponse | BackendErrorResponse>(
        'estancia-360/auth/login',
        loginData
      );

      console.warn('📥 Respuesta completa:', response);
      
      // VERIFICACIÓN: Primero, verifica si es un error del backend
      if ('statusCode' in response && (response.statusCode ?? 0) >= 400) {
        // Es un error del backend
        let errorMessage = 'Error en el inicio de sesión';
        
        if (response.message) {
          if (Array.isArray(response.message)) {
            errorMessage = response.message[0];
          } else {
            errorMessage = response.message;
          }
        } else if (response.error) {
          errorMessage = response.error;
        }
        
        setApiError(errorMessage);
        triggerShakeAnimation();
        console.warn('❌ Error del backend:', errorMessage);
        return;
      }
      
      // Si no es error, verifica si es una respuesta exitosa
      if ('accessToken' in response && response.accessToken) {
        console.warn('✅ LOGIN EXITOSO - Token recibido');
        
        // Guardar datos en AsyncStorage
        await saveSessionData(response as LoginResponse);
        
        // Mostrar mensaje de éxito
        setSuccessMessage(response.message || 'Inicio de sesión exitoso');
        setApiError(null); // Asegurar que no haya error
        
        console.warn('Datos del usuario:', {
          idUser: response.idUser,
          idRole: response.idRole,
          token: response.accessToken.substring(0, 20) + '...'
        });
        
        // Animar éxito
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonSlideUp, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Redirigir basado en el rol
        setTimeout(() => {
          console.warn('Redirigiendo según rol...');
          const roleId = response.idRole;
          
          if (roleId === 2) { // Administrador
            router.replace('/views/(tabs)/management/Administracion');
          } else if (roleId === 3) { // Trabajador
            router.replace('/views/(tabs)/management/Administracion');
          } else {
            // Rol desconocido, ir a pantalla genérica
            router.replace('/views/auth/Inicio');
          }
        }, 1000);
        
      } else {
        // Respuesta inesperada
        console.warn('⚠️ Respuesta inesperada:', response);
        setApiError('Respuesta inesperada del servidor');
        triggerShakeAnimation();
      }
      
    } catch (error: any) {
      // Manejo de errores de red o de la petición
      console.warn('❌ Error en la petición:', error);
      
      let errorMessage = 'Error de conexión con el servidor';
      
      // Intentar extraer mensaje de error de la respuesta axios
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message[0] || errorMessage;
          } else {
            errorMessage = errorData.message;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error')) {
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'El servidor tardó demasiado en responder.';
        }
      }
      
      setApiError(errorMessage);
      triggerShakeAnimation();
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar el formulario con animación
  const resetForm = (): void => {
    // Animación de fade out
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Resetear valores
      setFormData({
        email: '',
        password: '',
      });
      setTouched({
        email: false,
        password: false,
      });
      setApiError(null);
      setSuccessMessage(null);
      
      // Animación de fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  // Animación de carga para el botón
  const buttonSpinAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(buttonSpinAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      buttonSpinAnimation.setValue(0);
    }
  }, [loading]);

  const spinInterpolate = buttonSpinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Validar si el formulario es válido
  const isFormValid = 
    formData.email && 
    formData.password &&
    !errors.email && 
    !errors.password;

  // Retornar todo lo necesario
  return {
    // Estados
    formData,
    touched,
    errors,
    loading,
    apiError,
    successMessage,
    
    // Animaciones
    animations: {
      headerSlideUp,
      formSlideUp,
      buttonSlideUp,
      fadeAnim,
      shakeAnimation,
      spinInterpolate,
    },
    
    // Funciones
    handleInputChange,
    handleBlur,
    handleLogin,
    resetForm,
    logout,
    checkExistingSession,
    getCurrentUserData,
    
    // Validaciones
    isFormValid,
  };
};