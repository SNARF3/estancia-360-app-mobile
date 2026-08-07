/**
 * config/api.ts
 * Fuente única de la URL base del backend — usada tanto por el cliente axios
 * (db.postre-connection/db.connection.ts) como por el motor de sync basado en
 * fetch (db.sqlite/sync.ts). Antes cada uno tenía su propio fallback divergente
 * (uno con /api, otro sin, apuntando a dominios distintos) — unificado acá.
 *
 * Se resuelve desde EXPO_PUBLIC_API_URL (definido en .env o por perfil de EAS).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://estancia-360-app.onrender.com/api';
