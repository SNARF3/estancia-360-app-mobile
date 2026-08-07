import { useState } from 'react';
import { postRequest } from '../db.postre-connection/db.connection';

interface ForgotPasswordRequestBody {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

export const useUserVerificationCode = () => {
  const [userCode, setUserCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: pedir al backend que mande el código por email (POST /auth/forgot-password).
  // El backend nunca devuelve el código en la respuesta — solo confirma que lo envió.
  const requestVerificationCode = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const body: ForgotPasswordRequestBody = { email };
      await postRequest<ForgotPasswordResponse>('auth/forgot-password', body);
      return true;
    } catch (err) {
      console.log('Error al solicitar código:', err);
      setError('No se pudo enviar el código. Intenta nuevamente.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: solo valida el FORMATO del código (6 dígitos) antes de avanzar a la
  // pantalla de nueva contraseña. La verificación real contra el código que mandó
  // el servidor ocurre recién en POST /auth/reset-password (junto con la nueva
  // contraseña) — no existe un endpoint separado para "solo verificar".
  const validateVerificationCode = (): boolean => {
    if (!/^\d{6}$/.test(userCode)) {
      setError('El código debe tener 6 dígitos');
      return false;
    }
    setError(null);
    return true;
  };

  const resetVerification = () => {
    setUserCode('');
    setError(null);
  };

  return {
    userCode,
    setUserCode,
    loading,
    error,
    requestVerificationCode,
    validateVerificationCode,
    resetVerification,
  };
};
