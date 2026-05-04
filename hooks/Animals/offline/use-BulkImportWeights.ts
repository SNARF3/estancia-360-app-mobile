// hooks/Animals/offline/use-BulkImportWeights.ts

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { EVENT_TYPES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

// ─── Helpers de parseo ────────────────────────────────────────────────────────

function mapDate(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    if (raw instanceof Date) {
        if (isNaN(raw.getTime())) return null;
        return raw.toISOString().split('T')[0];
    }
    if (typeof raw === 'string') {
        const str = raw.trim();
        const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
        if (ddmmyyyy) {
            const [_, d, m, y] = ddmmyyyy;
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
    }
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
    lot_name: string;
    animal_id: string | null;
    lot_id: string | null;
    event_date: string;
    weight: number;
    body_condition: number | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

export interface UnresolvedLot {
    name: string;
    id: string | null;  // null = pendiente de resolución
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBulkImportWeights() {
    const [step, setStep] = useState<'idle' | 'reading' | 'lot_check' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedWeightRow[]>([]);
    const [unresolvedLots, setUnresolvedLots] = useState<UnresolvedLot[]>([]);
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

            // Columnas esperadas:
            // 0=CÓDIGO ANIMAL, 1=NOMBRE LOTE, 2=FECHA PESAJE, 3=PESO (KG), 4=CONDICIÓN CORPORAL, 5=OBSERVACIONES
            const dataRows = jsonRows.slice(1).filter(r => r.some(c => c !== null && c !== ''));

            setProgress(60);

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();

            // Resolver animales (una sola consulta)
            const animals = await db.getAllAsync<{ id: string; code: string }>(
                `SELECT id, code FROM ranch_animals WHERE id_ranch = ? AND id_status != 3`,
                [session.id_ranch]
            );
            const animalMap = new Map(animals.map(a => [a.code.toUpperCase(), a.id]));

            setProgress(70);

            // Extraer nombres de lote únicos y resolverlos desde la DB
            const uniqueLotNames = [...new Set(
                dataRows
                    .map(r => r[1] ? r[1].toString().trim() : null)
                    .filter(Boolean) as string[]
            )];

            const existingLots = await db.getAllAsync<{ id: string; name: string }>(
                `SELECT id, name FROM ranch_lots WHERE id_ranch = ?`,
                [session.id_ranch]
            );
            // Mapa nombre (normalizado) → id
            const lotMap = new Map(existingLots.map(l => [l.name.trim().toLowerCase(), l.id]));

            setProgress(80);

            // Validar filas
            const validated: ValidatedWeightRow[] = dataRows.map((r, i) => {
                const errors: string[] = [];
                const code = r[0] ? r[0].toString().trim().toUpperCase() : null;
                const lotNameRaw = r[1] ? r[1].toString().trim() : null;
                const eventDate = mapDate(r[2]);
                const weight = mapWeight(r[3]);
                const bc = mapBodyCondition(r[4]);
                const notes = r[5] ? r[5].toString().trim() : null;

                const animalId = code ? (animalMap.get(code) ?? null) : null;
                const lotId = lotNameRaw ? (lotMap.get(lotNameRaw.toLowerCase()) ?? null) : null;

                if (!code) errors.push('Código de animal vacío');
                else if (!animalId) errors.push(`Animal "${code}" no encontrado en la estancia`);
                if (!lotNameRaw) errors.push('Nombre de lote vacío');
                else if (!lotId) errors.push(`Lote "${lotNameRaw}" no encontrado localmente`);
                if (!eventDate) errors.push(`Fecha inválida: "${r[2]}"`);
                if (weight === null) errors.push(`Peso inválido: "${r[3]}" (debe ser número > 0)`);

                return {
                    rowIndex: i + 2,
                    code: code ?? `SIN_CODIGO_${i + 2}`,
                    lot_name: lotNameRaw ?? '',
                    animal_id: animalId,
                    lot_id: lotId,
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

            // Detectar lotes no resueltos
            const notFound = uniqueLotNames.filter(name => !lotMap.has(name.toLowerCase()));
            if (notFound.length > 0) {
                setUnresolvedLots(notFound.map(name => ({ name, id: null })));
                setStep('lot_check');
            } else {
                setStep('preview');
            }

        } catch (e: any) {
            console.error('BulkImportWeights:', e);
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    // ── 2. Resolver lote (llamado desde UI tras crear o confirmar un lote) ────

    const resolveLot = useCallback((name: string, id: string) => {
        setUnresolvedLots(prev => prev.map(l => l.name === name ? { ...l, id } : l));
        // Actualizar rows: asignar lot_id y limpiar el error de lote
        setRows(prev => prev.map(r => {
            if (r.lot_name.toLowerCase() !== name.toLowerCase()) return r;
            const errors = r.errors.filter(e => !e.includes('Lote') && !e.toLowerCase().includes('lote'));
            return { ...r, lot_id: id, errors, hasError: errors.length > 0 };
        }));
    }, []);

    // ── 3. Confirmar resolución de lotes y avanzar a preview ─────────────────

    const finalizeLotCheck = useCallback(() => {
        setStep('preview');
    }, []);

    // ── 4. Eliminar fila ──────────────────────────────────────────────────────

    const removeRow = useCallback((rowIndex: number) => {
        setRows(prev => prev.filter(r => r.rowIndex !== rowIndex));
    }, []);

    // ── 5. Cargar a SQLite ────────────────────────────────────────────────────

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
                if (!row.animal_id || !row.lot_id) { skipped++; continue; }

                try {
                    const eventId = newId();
                    await db.runAsync(
                        `INSERT INTO animal_events
                         (id, id_user, id_ranch_animal, id_event_type, notes, event_date, created_at, updated_at, is_synced, sync_action)
                         VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [eventId, session.id_user, row.animal_id, EVENT_TYPES.PESO,
                            row.notes, new Date(row.event_date).toISOString(), ts, ts]
                    );

                    const weightId = newId();
                    await db.runAsync(
                        `INSERT INTO weight_records
                         (id, id_event, id_lot, weight, weight_type, body_condition, age_days, created_at, updated_at, is_synced, sync_action)
                         VALUES (?,?,?,?,'scale',?,NULL,?,?,0,'INSERT')`,
                        [weightId, eventId, row.lot_id, row.weight, row.body_condition, ts, ts]
                    );

                    await db.runAsync(
                        `UPDATE ranch_animals SET weight = ?, updated_at = ?,
                         is_synced = 0,
                         sync_action = CASE WHEN sync_action = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END
                         WHERE id = ?`,
                        [row.weight, ts, row.animal_id]
                    );

                    loaded++;
                } catch (e: any) { console.error('[BulkWeights row]', e?.message ?? e); skipped++; }

                setProgress(Math.round(((i + 1) / total) * 100));
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

    // ── 6. Reset ──────────────────────────────────────────────────────────────

    const reset = useCallback(() => {
        setStep('idle'); setProgress(0); setRows([]);
        setUnresolvedLots([]); setErrorMsg(null);
        setLoadedCount(0); setSkippedCount(0);
    }, []);

    return {
        step, progress, rows, unresolvedLots, errorMsg,
        loadedCount, skippedCount,
        validCount: rows.filter(r => !r.hasError).length,
        invalidCount: rows.filter(r => r.hasError).length,
        pickAndParse, resolveLot, finalizeLotCheck, removeRow, loadToDatabase, reset,
    };
}
