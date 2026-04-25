// hooks/Animals/offline/use-BulkImportWeights.ts
// Carga masiva de registros de peso desde Excel

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { EVENT_TYPES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

// ─── Helpers de parseo ────────────────────────────────────────────────────────

/** FECHA: acepta string "DD/MM/YYYY", ISO "YYYY-MM-DD", Date de JS, número serial Excel */
function mapDate(raw: any): string | null {
    if (!raw) return null;

    // 1. Si es número (serial Excel)
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }

    // 2. Si es objeto Date
    if (raw instanceof Date) {
        if (isNaN(raw.getTime())) return null;
        return raw.toISOString().split('T')[0];
    }

    if (typeof raw === 'string') {
        const str = raw.trim();
        // 3. Formato DD/MM/YYYY
        const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
        if (ddmmyyyy) {
            const [_, d, m, y] = ddmmyyyy;
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }

        // 4. Formato ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
    }

    // 5. Intento de parseo genérico
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

    return null;
}

function mapWeight(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseFloat(raw.toString().replace(',', '.'));
    return isNaN(n) || n <= 0 ? null : n;
}

function mapBodyCondition(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseInt(raw.toString());
    return isNaN(n) || n < 1 || n > 5 ? null : n;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ValidatedWeightRow {
    rowIndex: number;
    code: string;
    animal_id: string | null;   // UUID resuelto desde SQLite
    animal_lot_id: string | null;   // lote actual del animal
    event_date: string;
    weight: number;
    body_condition: number | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBulkImportWeights() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedWeightRow[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    // ── 1. Elegir y parsear ──────────────────────────────────────────────────

    const pickAndParse = useCallback(async () => {
        setStep('reading');
        setProgress(5);
        setErrorMsg(null);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) { setStep('idle'); return; }

            setProgress(15);
            const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            setProgress(30);

            const wb = xlsxRead(base64, { type: 'base64', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonRows = xlsxUtils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];

            setProgress(50);

            if (jsonRows.length < 2) {
                setErrorMsg('El archivo no tiene datos. Usá la plantilla correcta.');
                setStep('error'); return;
            }

            // Columnas esperadas (índices):
            // 0=CÓDIGO ANIMAL, 1=FECHA PESAJE, 2=PESO (KG), 3=CONDICIÓN CORPORAL, 4=OBSERVACIONES
            const dataRows = jsonRows.slice(1).filter(r => r.some(c => c !== null && c !== ''));

            setProgress(60);

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();

            // Traer todos los animales activos del ranch de una sola vez
            const animals = await db.getAllAsync<{ id: string; code: string; id_lot: string | null }>(
                `SELECT id, code, id_lot FROM ranch_animals WHERE id_ranch = ? AND id_status != 3`,
                [session.id_ranch]
            );
            const animalMap = new Map(animals.map(a => [a.code.toUpperCase(), a]));

            setProgress(75);

            const validated: ValidatedWeightRow[] = dataRows.map((r, i) => {
                const errors: string[] = [];
                const code = r[0] ? r[0].toString().trim().toUpperCase() : null;
                const eventDate = mapDate(r[1]);
                const weight = mapWeight(r[2]);
                const bc = mapBodyCondition(r[3]);
                const notes = r[4] ? r[4].toString().trim() : null;

                const animal = code ? animalMap.get(code) : null;

                if (!code) errors.push('Código de animal vacío');
                else if (!animal) errors.push(`Animal "${code}" no encontrado en la estancia`);
                if (!eventDate) errors.push(`Fecha inválida: "${r[1]}"`);
                if (weight === null) errors.push(`Peso inválido: "${r[2]}" (debe ser número > 0)`);

                return {
                    rowIndex: i + 2,
                    code: code ?? `SIN_CODIGO_${i + 2}`,
                    animal_id: animal?.id ?? null,
                    animal_lot_id: animal?.id_lot ?? null,
                    event_date: eventDate ?? new Date().toISOString().split('T')[0],
                    weight: weight ?? 0,
                    body_condition: bc,
                    notes,
                    errors,
                    hasError: errors.length > 0,
                };
            });

            setProgress(100);
            setRows(validated);
            setStep('preview');

        } catch (e: any) {
            console.error('BulkImportWeights:', e);
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    // ── 2. Eliminar fila ──────────────────────────────────────────────────────

    const removeRow = useCallback((rowIndex: number) => {
        setRows(prev => prev.filter(r => r.rowIndex !== rowIndex));
    }, []);

    // ── 3. Cargar a SQLite ────────────────────────────────────────────────────

    const loadToDatabase = useCallback(async () => {
        const validRows = rows.filter(r => !r.hasError);
        if (validRows.length === 0) {
            setErrorMsg('No hay filas válidas para cargar.');
            return;
        }

        setStep('loading');
        setProgress(0);
        setLoadedCount(0);
        setSkippedCount(0);

        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();
            const ts = now();

            let loaded = 0, skipped = 0;
            const total = validRows.length;

            for (let i = 0; i < total; i++) {
                const row = validRows[i];
                try {
                    // 1. Crear animal_event
                    const eventId = newId();
                    await db.runAsync(
                        `INSERT INTO animal_events
               (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [eventId, session.id_user, row.animal_id!, EVENT_TYPES.PESO,
                            row.notes, new Date(row.event_date).toISOString(), ts, ts]
                    );

                    // 2. Crear weight_record (id_lot puede ser null si el animal no tiene lote)
                    // Si no tiene lote, usamos un lote dummy vacío → lo manejamos con COALESCE en queries
                    const weightId = newId();
                    await db.runAsync(
                        `INSERT INTO weight_records
               (id, id_event, id_lot, weight, weight_type, body_condition, age_days, notes, created_at, updated_at, is_synced, sync_action)
             VALUES (?,?,?,?,'scale',?,NULL,?,?,?,0,'INSERT')`,
                        [weightId, eventId, row.animal_lot_id ?? 'no_lot',
                            row.weight, row.body_condition, row.notes, ts, ts]
                    );

                    // 3. Actualizar peso actual del animal
                    await db.runAsync(
                        `UPDATE ranch_animals SET weight = ?, updated_at = ?,
             is_synced = 0,
             sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
             WHERE id = ?`,
                        [row.weight, ts, row.animal_id!]
                    );

                    loaded++;
                } catch { skipped++; }

                const pct = Math.round(((i + 1) / total) * 100);
                setProgress(pct);
                setLoadedCount(loaded);
                setSkippedCount(skipped);
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
            }

            setStep('done');
        } catch (e: any) {
            setErrorMsg(e.message ?? 'Error durante la carga.');
            setStep('error');
        }
    }, [rows]);

    // ── 4. Reset ──────────────────────────────────────────────────────────────

    const reset = useCallback(() => {
        setStep('idle'); setProgress(0); setRows([]);
        setErrorMsg(null); setLoadedCount(0); setSkippedCount(0);
    }, []);

    return {
        step, progress, rows, errorMsg,
        loadedCount, skippedCount,
        validCount: rows.filter(r => !r.hasError).length,
        invalidCount: rows.filter(r => r.hasError).length,
        pickAndParse, removeRow, loadToDatabase, reset,
    };
}