/**
 * db-utils.ts
 * Estancia360 — Helpers de uso general para la capa de datos
 */

import 'react-native-get-random-values'; // necesario antes de uuid
import { v4 as uuidv4 } from 'uuid';

// ─── IDs ──────────────────────────────────────────────────────────────────────

/** Genera un UUID v4 para usar como PK local */
export function newId(): string {
    return uuidv4();
}

// ─── Timestamps ───────────────────────────────────────────────────────────────

/** ISO timestamp actual: "2025-04-02T14:30:00.000Z" */
export function now(): string {
    return new Date().toISOString();
}

/** ISO date actual: "2025-04-02" */
export function today(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Calcula fecha fin de período de retiro sanitario.
 * @param eventDate  ISO date/timestamp del evento
 * @param days       días de retiro
 */
export function calcWithdrawalEnd(eventDate: string, days: number): string {
    const d = new Date(eventDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

/**
 * Verifica si un animal tiene retiro sanitario activo (no puede venderse).
 * Recibe el withdrawal_end_date almacenado, retorna true si aún está en retiro.
 */
export function isUnderWithdrawal(withdrawalEndDate: string | null | undefined): boolean {
    if (!withdrawalEndDate) return false;
    return new Date(withdrawalEndDate) >= new Date();
}

// ─── Serialización ────────────────────────────────────────────────────────────

/** Convierte booleano JS a INTEGER SQLite (0/1) */
export function boolToInt(v: boolean): number {
    return v ? 1 : 0;
}

/** Convierte INTEGER SQLite (0/1) a booleano JS */
export function intToBool(v: number | null | undefined): boolean {
    return v === 1;
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export interface PaginationParams {
    page: number;    // base 1
    pageSize: number;
}

export function paginationToSQL(p: PaginationParams): { limit: number; offset: number } {
    return {
        limit: p.pageSize,
        offset: (p.page - 1) * p.pageSize,
    };
}