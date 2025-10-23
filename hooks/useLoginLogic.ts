import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { router } from 'expo-router';

export const useLoginLogic = () => {
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
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

  // Validación del formulario
  const validateForm = () => {
    const errors = {
      email: !formData.email ? 'El email es requerido' : 
             !/\S+@\S+\.\S+/.test(formData.email) ? 'Email inválido' : '',
      password: !formData.password ? 'La contraseña es requerida' : '',
    };
    return errors;
  };

  const errors = validateForm();

  // Manejo de cambios en los inputs
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejo de blur en los inputs
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Función de login
  const handleLogin = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Iniciando sesión:', formData);
      // Redirigir a la pantalla de administración
      router.replace('/views/management/Administracion');
    } catch (error) {
      console.error('Error en login:', error);
    } finally {
      setLoading(false);
    }
  };

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
    handleLogin,
    
    // Validaciones
    isFormValid,
  };
};