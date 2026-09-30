// hooks/devLogger.ts
//
// Logger de diagnóstico SOLO para desarrollo — gateado por `__DEV__` (global que React Native
// define automáticamente: true en Expo Go/dev client/`expo start`, false en cualquier build de
// release/producción). Metro reemplaza `__DEV__` como constante en build time, así que el código
// detrás de este `if` ni siquiera queda en el bundle de producción tras minificación (dead-code
// elimination) — no es un toggle en runtime que alguien pueda olvidar apagar.
//
// No reemplaza console.error/console.warn de errores reales (esos deben seguir viéndose siempre)
// — es exclusivamente para los logs de diagnóstico de navegación/sync agregados para rastrear el
// bug de pantalla en blanco. Ver docs/dev-logging.md para el listado completo de dónde se usa.

export const devLog = (...args: unknown[]): void => {
  if (__DEV__) {
    console.log(...args);
  }
};

import { useEffect } from 'react';

// Log de mount/unmount para las pantallas señaladas como afectadas por el bug de pantalla en
// blanco (Reproducción, Sanidad, Registro de Nuevo Animal, listado de animales) — para
// correlacionar el instante exacto en que cada una monta (o no llega a hacerlo) contra el log de
// navegación de app/_layout.tsx. Ver docs/dev-logging.md.
export function useScreenLifecycleLog(screenName: string): void {
  useEffect(() => {
    devLog(`[screen] MOUNT ${screenName} @ ${new Date().toISOString()}`);
    return () => {
      devLog(`[screen] UNMOUNT ${screenName} @ ${new Date().toISOString()}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Captura de excepciones no manejadas ───────────────────────────────────────
//
// Hasta acá, todos los logs de este archivo asumen que el JS sigue corriendo con normalidad.
// Pero la hipótesis principal del bug de pantalla en blanco es justo lo contrario: una excepción
// no capturada (ej. un módulo nativo como el date picker que no se encuentra bajo New
// Architecture) puede tirar la app a blanco SIN dejar ningún rastro en los logs de navegación o
// de mount — porque el componente nunca termina de renderizar, el `useEffect` del mount nunca
// llega a correr. Esto instala el manejador global de excepciones de React Native
// (`ErrorUtils`, ya lo usa React Native internamente para reportar errores fatales) para que
// CUALQUIER excepción no capturada por ningún try/catch quede logueada, con nombre y stack
// completo, antes de que la pantalla se quede en blanco. Se llama una sola vez, al arrancar
// la app (ver app/_layout.tsx).
export function installGlobalErrorLogger(): void {
  if (!__DEV__) return;
  // @ts-expect-error — ErrorUtils es un global de React Native, no tiene tipos oficiales
  const ErrorUtils = global.ErrorUtils;
  if (!ErrorUtils || typeof ErrorUtils.setGlobalHandler !== 'function') {
    devLog('[error-logger] ErrorUtils no disponible en este runtime — no se pudo instalar');
    return;
  }
  const previousHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      `[error-logger] EXCEPCIÓN NO CAPTURADA (isFatal=${!!isFatal}): ${err.message}\n${err.stack ?? '(sin stack)'}`
    );
    previousHandler?.(error, isFatal);
  });
  devLog('[error-logger] instalado — cualquier excepción no capturada va a quedar logueada');
}
