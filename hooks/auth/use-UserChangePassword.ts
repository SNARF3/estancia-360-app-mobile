import { useState } from 'react';
import { postRequest } from '../db.postre-connection/db.connection';

interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

interface ResetPasswordResponse {
  message: string;
}

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

  // Recuperar contraseña — paso 2: manda email + código + nueva contraseña juntos.
  // El backend (POST /auth/reset-password) recién ahí verifica el código contra el
  // hash guardado y su vencimiento; si es válido, aplica la contraseña.
  const changePassword = async (email: string, code: string): Promise<boolean> => {
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
      const payload: ResetPasswordRequest = {
        email,
        code,
        password: newPassword,
      };

      await postRequest<ResetPasswordResponse>('auth/reset-password', payload);

      setSuccess(true);
      return true;
    } catch (err: any) {
      console.log('Error en petición:', err);
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
    changePassword,
  };
};
