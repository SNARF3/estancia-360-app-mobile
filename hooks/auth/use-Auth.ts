import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getDb } from '../db.sqlite/db-pool';
import { wipeLocalRanchData } from '../db.sqlite/sync';

const SYNC_CREDENTIALS_KEY = 'sync_credentials';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SessionParams {
  accessToken: string;
  idUser: number;
  idRole: number;
  email: string;
  fullname: string;
  // Opcionales: un usuario recién registrado (ej. "Encargado"/Colaborador) puede no tener
  // estancia todavía — ver AuthGate/BottomTabBar, que ahora enrutan por "¿tiene id_ranch?"
  // en vez de por ranch_role.
  id_ranch?: number;
  ranch_name?: string;
  production_types?: number[];
  ranch_role?: number;
}

export interface LocalSession {
  id_ranch: string;
  id_user: string;
  id_role: number;
  ranch_name: string;
  user_fullname: string;
  production_types: string; // JSON array stringificado
}

// ─── saveSession ──────────────────────────────────────────────────────────────
// Llamar una sola vez al hacer login exitoso.
// Guarda en AsyncStorage (para persistencia de sesión) Y en SQLite (para los repositorios).

export async function saveSession(params: SessionParams): Promise<void> {
  console.log('--- Iniciando guardado de sesión ---');
  console.log('Parámetros recibidos:', { ...params, accessToken: 'HIDDEN' });

  // 1. AsyncStorage — para verificar sesión al arrancar la app
  // Bug real encontrado 2026-09-06: este catch solo logueaba y no relanzaba, así que
  // saveSession() resolvía normal aunque el guardado fallara — los 3 llamadores
  // (RegisterRanch.tsx, use-UserLoginLogic.ts, QrScannerRanch.tsx) tienen su propio
  // try/catch esperando que un fallo acá se propague para no navegar a la pantalla
  // siguiente, pero nunca se disparaba. Ahora si falla, se relanza.
  try {
    await AsyncStorage.multiSet([
      ['access_token', params.accessToken],
      ['user_id', params.idUser.toString()],
      ['user_role', params.idRole.toString()],
      ['user_data', JSON.stringify(params)],
    ]);
    console.log('✅ AsyncStorage: Datos guardados correctamente');
  } catch (err) {
    console.error('❌ AsyncStorage: Error al guardar datos', err);
    throw err;
  }

  // 2. SQLite local_session — para que los repositorios sepan el ranch activo.
  // Si todavía no hay estancia (ej. un Colaborador recién registrado que aún no escaneó
  // ningún QR), no hay nada que guardar acá — se saltea, no es un error.
  if (!params.id_ranch) {
    console.log('--- Fin del guardado de sesión (sin estancia todavía, se saltea local_session) ---');
    return;
  }

  try {
    const db = await getDb();
    console.log('SQLite: Conexión abierta. Intentando INSERT/REPLACE...');

    await db.runAsync(
      `INSERT OR REPLACE INTO local_session
         (id, id_ranch, id_user, id_role, ranch_name, user_fullname, production_types)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [
        params.id_ranch.toString(),
        params.idUser.toString(),
        params.ranch_role ?? 0,
        params.ranch_name ?? '',
        params.fullname,
        JSON.stringify(params.production_types ?? []),
      ]
    );

    // Verificación inmediata
    const verify = await db.getFirstAsync<LocalSession>('SELECT * FROM local_session WHERE id = 1');
    console.log('✅ SQLite: Registro de sesión confirmado:', verify);
    console.log('--- Fin del guardado de sesión ---');
  } catch (err) {
    console.error('❌ SQLite: Error crítico al guardar local_session', err);
    throw err;
  }
}

// ─── getSession ───────────────────────────────────────────────────────────────
// Usado por los repositorios para saber en qué ranch operar.

export async function getSession(): Promise<LocalSession | null> {
  try {
    const db = await getDb();
    const session = await db.getFirstAsync<LocalSession>('SELECT * FROM local_session WHERE id = 1');
    if (session) {
      console.log('📦 Lectura de sesión SQLite:', session);
    } else {
      console.log('⚠️ No se encontró sesión activa en SQLite');
    }
    return session;
  } catch (err) {
    console.error('❌ Error al leer sesión de SQLite:', err);
    return null;
  }
}

// ─── getUserRole ──────────────────────────────────────────────────────────────

export async function getUserRole(): Promise<number | null> {
  try {
    const role = await AsyncStorage.getItem('user_role');
    return role ? parseInt(role, 10) : null;
  } catch {
    return null;
  }
}

// ─── getToken ─────────────────────────────────────────────────────────────────
// Usado por sync.ts para autenticar las peticiones al servidor.

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('access_token');
}

// ─── saveCredentials / getCredentials ────────────────────────────────────────
// Guardan email+password para poder re-autenticar automáticamente antes de sync.
// Se llaman desde use-UserLoginLogic al hacer login exitoso. Usa SecureStore (Keychain/
// Keystore cifrado) en vez de AsyncStorage — antes la contraseña quedaba en texto plano.

export async function saveCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(SYNC_CREDENTIALS_KEY, JSON.stringify({ email, password }));
}

export async function getCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(SYNC_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── getUserData ──────────────────────────────────────────────────────────────
// Datos del usuario logueado (nombre, email, rol, etc.)

export async function getUserData(): Promise<SessionParams | null> {
  try {
    const raw = await AsyncStorage.getItem('user_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────
// Borra la sesión de AsyncStorage y las credenciales guardadas en SecureStore.
// Los datos del negocio en SQLite (animales, eventos, etc.) NO se borran.

// logout() ahora SÍ borra SQLite (ver wipeLocalRanchData en sync.ts) — antes los datos del
// negocio sobrevivían al logout, lo que dejaba un dispositivo compartido entre cuentas con
// datos de la sesión anterior. Esto solo es seguro porque los 3 puntos de "Cerrar Sesión"
// de la app (usuario.tsx, Management.tsx, SyncScreen.tsx) pasan por
// hooks/auth/use-LogoutWithSync.ts, que fuerza un syncAll() exitoso ANTES de llamar acá —
// no llamar logout() directo desde un flujo nuevo sin pasar primero por ese hook, o se
// pierden datos sin sincronizar.
export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role', 'user_data']);
  await SecureStore.deleteItemAsync(SYNC_CREDENTIALS_KEY).catch(() => {});
  try {
    await wipeLocalRanchData();
  } catch (err) {
    console.error('❌ Error al borrar datos locales en logout:', err);
  }
  router.replace('/views/auth/Inicio');
}

// ─── useAuth Hook ─────────────────────────────────────────────────────────────

export function useAuth() {
  const [userData, setUserData] = useState<any>(null);

  const checkAuthStatus = async () => {
    try {
      const data = await getUserData();
      setUserData(data);
      return data;
    } catch {
      setUserData(null);
      return null;
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    userData,
    getUserRole,
    checkAuthStatus,
    logout,
  };
}