import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { router } from 'expo-router';

export interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmPassword: string;
  telefono: string;
}

export const useRegisterLogic = () => {
  // Estados del formulario
  const [formData, setFormData] = useState<RegisterFormData>({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
  });
  
  const [touched, setTouched] = useState({
    nombre: false,
    apellido: false,
    email: false,
    password: false,
    confirmPassword: false,
    telefono: false,
  });
  
  const [loading, setLoading] = useState(false);

  // Animaciones
  const headerSlideUp = useRef(new Animated.Value(50)).current;
  const formSlideUp = useRef(new Animated.Value(80)).current;
  const buttonSlideUp = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Efecto para animaciones
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
  };

  // Manejo de blur en los inputs
  const handleBlur = (field: keyof RegisterFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Manejo especial para teléfono (solo números)
  const handlePhoneChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    handleInputChange('telefono', numericValue);
  };

  // Validación del formulario
  const validateForm = () => {
    const errors = {
      email: !formData.email ? 'El email es requerido' : 
             !/\S+@\S+\.\S+/.test(formData.email) ? 'Email inválido' : '',
      password: formData.password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : '',
      confirmPassword: formData.password !== formData.confirmPassword ? 'Las contraseñas no coinciden' : '',
      telefono: !formData.telefono ? 'El teléfono es requerido' : 
               formData.telefono.length !== 8 ? 'El teléfono debe tener 8 dígitos' : '',
    };
    return errors;
  };

  const errors = validateForm();

  // Función de registro
  const handleRegister = async () => {
    setLoading(true);
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Registrando:', formData);
      
      // Redirigir al login después del registro exitoso
      router.replace('/views/auth/login');
    } catch (error) {
      console.error('Error en registro:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validar si el formulario es válido
  const isFormValid = 
    formData.email && 
    formData.password && 
    formData.confirmPassword &&
    formData.telefono &&
    !errors.email && 
    !errors.password && 
    !errors.confirmPassword &&
    !errors.telefono;

  // Retornar todo lo necesario
  return {
    // Estados
    formData,
    touched,
    errors,
    loading,
    
    // Animaciones
    animations: {
      headerSlideUp,
      formSlideUp,
      buttonSlideUp,
      fadeAnim,
    },
    
    // Funciones
    handleInputChange,
    handleBlur,
    handlePhoneChange,
    handleRegister,
    
    // Validaciones
    isFormValid,
  };
};