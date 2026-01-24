import { useState } from 'react';
import { postRequest } from '../db.postre-connection/db.connection';

// Interfaz para el cuerpo de la petición (lo que enviamos)
interface VerificationRequestBody {
  email: string;
}

interface VerificationResponseSuccess {
  code: number;
}

interface VerificationResponseError {
  message?: string;
  error?: string;
}

type VerificationResponse = VerificationResponseSuccess | VerificationResponseError;

export const useUserVerificationCode = () => {
  const [userCode, setUserCode] = useState('');
  
  const [serverCode, setServerCode] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Función para solicitar el código al backend (Paso 1)
  const requestVerificationCode = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setServerCode(null);

    try {
      const requestBody: VerificationRequestBody = { email };
      

      // Llamada al endpoint especificado
      const response = await postRequest<VerificationResponse>(
        'estancia-360/auth/2AF', 
        requestBody
      );


      // Verificamos si la respuesta tiene la propiedad "code"
      if (response && 'code' in response && typeof response.code === 'number') {
        setServerCode(response.code); // Guardamos el código correcto "en secreto"
        return true; // Retornamos true para indicar que el correo se envió/procesó
      } else {
        // Si la respuesta no trae "code", asumimos fallo
        setError('Código incorrecto'); 
        return false;
      }

    } catch (err) {
      console.log('Error al solicitar código:', err);
      // Según tus instrucciones: en caso de error, mensaje genérico
      setError('Código incorrecto'); 
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para validar si lo que escribió el usuario coincide con el server (Paso 2)
  const validateVerificationCode = (): boolean => {
    // 1. Validar que tengamos un código del servidor contra el cual comparar
    if (serverCode === null ) {
      setError('Código incorrecto');
      return false;
    }

    // 2. Convertir el input del usuario a número y comparar
    const inputNum = parseInt(userCode, 10);

    if (isNaN(inputNum) || inputNum !== serverCode) {
      setError('Código incorrecto'); // Mensaje solicitado
      setSuccess(false);
      return false;
    }

    // 3. Si coincide
    setError(null);
    setSuccess(true);
    return true;
  };

  // Helper para limpiar estados (por si cierran el modal)
  const resetVerification = () => {
    setUserCode('');
    setServerCode(null);
    setError(null);
    setSuccess(false);
  };

  return {
    userCode, 
    setUserCode, // Conectar esto al onChangeText del InputField
    loading,
    error,
    success,
    requestVerificationCode,  // Llamar esto al enviar el email
    validateVerificationCode, // Llamar esto al dar click en "Verificar" en el popup
    resetVerification
  };
};