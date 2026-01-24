import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { postRequest } from '../db.postre-connection/db.connection';

export interface RegisterFormData {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  password: string;
  confirmPassword: string;
  telefono: string;
  ci: string;
}

interface RegisterRequestData {
  idRole: number;
  ci: string;
  fullname: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  password: string;
  celphone: string;
}

// Interfaz para respuesta exitosa del backend (con user)
interface BackendRegisterSuccessResponse {
  user: {
    id: number;
    email: string;
    fullname: string;
    celphone: string;
    ci: string;
    idRole: number;
    paternalSurname: string;
    maternalSurname: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    role: {
      id: number;
      name: string;
    };
  };
}

// Interfaz para error del backend (con message)
interface BackendRegisterErrorResponse {
  message: string;
}

// Unión de tipos para manejar ambas respuestas
type BackendRegisterResponse = BackendRegisterSuccessResponse | BackendRegisterErrorResponse;

export const useUserRegisterLogic = (idRole: number = 2) => {
  // Estados del formulario
  const [formData, setFormData] = useState<RegisterFormData>({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    ci: '',
  });
  
  const [touched, setTouched] = useState({
    nombre: false,
    apellidoPaterno: false,
    apellidoMaterno: false,
    email: false,
    password: false,
    confirmPassword: false,
    telefono: false,
    ci: false,
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

  // Manejo de cambios en los inputs
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (apiError) setApiError(null);
  };

  const handleBlur = (field: keyof RegisterFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handlePhoneChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    handleInputChange('telefono', numericValue);
  };

  const handleCiChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    handleInputChange('ci', numericValue);
  };

  const validateForm = () => {
    const errors = {
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      email: '',
      password: '',
      confirmPassword: '',
      telefono: '',
      ci: '',
    };

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.apellidoPaterno.trim()) {
      errors.apellidoPaterno = 'El apellido paterno es requerido';
    }

    if (!formData.apellidoMaterno.trim()) {
      errors.apellidoMaterno = 'El apellido materno es requerido';
    }

    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Debe contener mayúsculas, minúsculas y números';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.telefono) {
      errors.telefono = 'El teléfono es requerido';
    } else if (formData.telefono.length !== 8) {
      errors.telefono = 'El teléfono debe tener 8 dígitos';
    }

    if (!formData.ci) {
      errors.ci = 'El CI es requerido';
    } else if (formData.ci.length < 5 || formData.ci.length > 10) {
      errors.ci = 'El CI debe tener entre 5 y 10 dígitos';
    }

    return errors;
  };

  const errors = validateForm();

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

  const prepareRegisterData = (): RegisterRequestData => {
    return {
      idRole: idRole,
      ci: formData.ci,
      fullname: formData.nombre,
      paternalSurname: formData.apellidoPaterno,
      maternalSurname: formData.apellidoMaterno,
      email: formData.email,
      password: formData.password,
      celphone: formData.telefono,
    };
  };

  const handleRegister = async (): Promise<void> => {
    const validationErrors = validateForm();
    const hasErrors = Object.values(validationErrors).some(error => error !== '');

    if (hasErrors) {
      setTouched({
        nombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        email: true,
        password: true,
        confirmPassword: true,
        telefono: true,
        ci: true,
      });
      triggerShakeAnimation();
      return;
    }

    setLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const registerData = prepareRegisterData();
      
      console.log('📤 Enviando datos de registro:', registerData);
      
      // Usar la unión de tipos
      const response = await postRequest<BackendRegisterResponse>(
        'estancia-360/auth/register',
        registerData
      );

      console.log('📥 Respuesta del backend:', response);

      // DETECCIÓN CLARA: Verificar si es éxito (tiene user) o error (tiene message)
      const isSuccess = 'user' in response;
      const isError = 'message' in response;

      if (isSuccess && response.user) {
        // ÉXITO: Hay objeto user en la respuesta
        console.log('✅ Registro exitoso. Usuario creado:', response.user.id);
        setSuccessMessage('¡Registro exitoso! Redirigiendo al login...');
        setApiError(null);
        
      } else if (isError && response.message) {
        // ERROR: Hay propiedad message en la respuesta
        console.log('❌ Error del backend:', response.message);
        setApiError(response.message);
        setSuccessMessage(null);
        triggerShakeAnimation();
        
      } else {
        // Respuesta inesperada
        console.log('⚠️ Respuesta inesperada del backend:', response);
        setApiError('Respuesta inesperada del servidor');
        setSuccessMessage(null);
        triggerShakeAnimation();
      }
      
    } catch (error: any) {
      console.log('❌ Error completo en registro:', error);
      
      // Manejo de errores de red o de petición
      let errorMessage = 'Error de conexión con el servidor';
      
      // Intentar extraer el mensaje de error de la respuesta axios
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        // El backend podría devolver { message: "..." } incluso en errores HTTP
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error')) {
          errorMessage = 'Error de red. Verifica tu conexión a internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'El servidor tardó demasiado en responder.';
        }
      }
      
      setApiError(errorMessage);
      setSuccessMessage(null);
      triggerShakeAnimation();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (): void => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFormData({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        email: '',
        password: '',
        confirmPassword: '',
        telefono: '',
        ci: '',
      });
      setTouched({
        nombre: false,
        apellidoPaterno: false,
        apellidoMaterno: false,
        email: false,
        password: false,
        confirmPassword: false,
        telefono: false,
        ci: false,
      });
      setApiError(null);
      setSuccessMessage(null);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

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

  const isFormValid = 
    formData.nombre && 
    formData.apellidoPaterno && 
    formData.apellidoMaterno && 
    formData.email && 
    formData.password && 
    formData.confirmPassword &&
    formData.telefono &&
    formData.ci &&
    !errors.nombre && 
    !errors.apellidoPaterno && 
    !errors.apellidoMaterno && 
    !errors.email && 
    !errors.password && 
    !errors.confirmPassword &&
    !errors.telefono &&
    !errors.ci;

  return {
    formData,
    touched,
    errors,
    loading,
    apiError,
    successMessage,
    animations: {
      headerSlideUp,
      formSlideUp,
      buttonSlideUp,
      fadeAnim,
      shakeAnimation,
      spinInterpolate,
    },
    handleInputChange,
    handleBlur,
    handlePhoneChange,
    handleCiChange,
    handleRegister,
    resetForm,
    isFormValid,
  };
};