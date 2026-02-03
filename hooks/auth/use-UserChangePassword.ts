import { useState } from 'react';
// Cambiamos el import de postRequest a putRequest
import { putRequest } from '../db.postre-connection/db.connection';

// Interfaces basadas en tu documentación
interface ChangePasswordRequest {
  email: string;
  password: string;
}

interface ChangePasswordSuccessResponse {
  message: string;
}

interface ChangePasswordErrorResponse {
  message: string | string[]; 
  error?: string;
  statusCode?: number;
}

// Unión de tipos
type ChangePasswordResponse = ChangePasswordSuccessResponse | ChangePasswordErrorResponse;

export const useUserChangePassword = () => {
  // Estados del formulario
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Expresión regular
  const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}/;

  const changePassword = async (email: string): Promise<boolean> => {
    setError(null);
    setSuccess(false);

    // 1. Validaciones Locales
    if (!newPassword || !confirmPassword) {
      setError('Por favor completa todos los campos.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return false;
    }

    if (!passwordRegex.test(newPassword)) {
      setError('La contraseña debe tener al menos una mayúscula, una minúscula y un número.');
      return false;
    }

    setLoading(true);

    try {
      const payload: ChangePasswordRequest = {
        email: email,
        password: newPassword
      };

      console.log('📤 Enviando cambio de contraseña (PUT):', payload);

      // AQUÍ ESTÁ EL CAMBIO: Usamos putRequest
      const response = await putRequest<ChangePasswordResponse>(
        'estancia-360/auth/change-password',
        payload
      );

      console.log('📥 Respuesta cambio contraseña:', response);

      // Verificamos si es un error
      const isError = 'error' in response || 'statusCode' in response;

      if (isError) {
        const errorResponse = response as ChangePasswordErrorResponse;
        const msg = Array.isArray(errorResponse.message) 
          ? errorResponse.message[0] 
          : errorResponse.message;
        
        setError(msg || 'Error al cambiar la contraseña');
        return false;
      }

      // Éxito
      setSuccess(true);
      return true;

    } catch (err: any) {
      console.log('❌ Error en petición:', err);
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg) ? msg[0] : (msg || 'Ocurrió un error inesperado');
      
      setError(finalMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    changePassword
  };
};