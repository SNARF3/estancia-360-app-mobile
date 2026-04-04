import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getDb } from '../db.sqlite/db-pool';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SessionParams {
  accessToken: string;
  idUser: number;
  idRole: number;
  email: string;
  fullname: string;
  id_ranch: number;
  ranch_name: string;
  production_types: number[];
  ranch_role: number;
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
  }

  // 2. SQLite local_session — para que los repositorios sepan el ranch activo
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
        params.ranch_role,
        params.idRole ? params.ranch_role : params.idRole, // Mapeo de rol
        params.ranch_name,
        params.fullname,
        JSON.stringify(params.production_types),
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
// Solo borra la sesión de AsyncStorage.
// Los datos del negocio en SQLite (animales, eventos, etc.) NO se borran.

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role', 'user_data']);
  // NO tocamos SQLite — los datos del negocio sobreviven al logout
  router.replace('/views/auth/Login');
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