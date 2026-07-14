// hooks/Animals/offline/use-BulkImportVaccinations.ts
// Carga masiva de vacunaciones desde Excel

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { EVENT_TYPES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ValidatedVaccinationRow {
    rowIndex: number;
    animalCode: string;
    animal_id: string | null;
    eventDate: string;
    vaccineName: string;
    dose: string | null;
    responsible: string | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBulkImportVaccinations() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedVaccinationRow[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    // ── 1. Elegir archivo y parsear ──────────────────────────────────────────

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

            if (result.canceled || !result.assets?.[0]) {
                setStep('idle');
                return;
            }

            setProgress(20);

            const asset = result.assets[0];
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            setProgress(35);

            const workbook = xlsxRead(base64, { type: 'base64', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonRows = xlsxUtils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

            setProgress(50);

            if (jsonRows.length < 2) {
                setErrorMsg('El archivo no contiene datos.');
                setStep('error');
                return;
            }

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();

            // Cargar mapa de animales (code → id)
            const animalRows = await db.getAllAsync<{ id: string; code: string }>(
                `SELECT id, code FROM ranch_animals WHERE id_ranch = ? AND id_status = 1`,
                [session.id_ranch]
            );
            const animalMap = new Map<string, string>();
            animalRows.forEach(a => animalMap.set(a.code.toUpperCase(), a.id));

            setProgress(70);

            const validated: ValidatedVaccinationRow[] = jsonRows.slice(1)
                .filter(r => r.some((cell: any) => cell !== null && cell !== ''))
                .map((r, i) => {
                    const errors: string[] = [];
                    const animalCode = r[0] ? r[0].toString().trim().toUpperCase() : null;
                    const eventDate = mapDate(r[1]);
                    const vaccineName = r[2] ? r[2].toString().trim() : null;
                    const dose = r[3] ? r[3].toString().trim() : null;
                    const responsible = r[4] ? r[4].toString().trim() : null;
                    const notes = r[5] ? r[5].toString().trim() : null;

                    if (!animalCode) errors.push('Código de animal vacío');
                    if (!eventDate) errors.push('Fecha inválida');
                    if (!vaccineName) errors.push('Nombre de vacuna vacío');

                    const animal_id = animalCode ? (animalMap.get(animalCode) ?? null) : null;
                    if (animalCode && !animal_id) errors.push(`Animal "${animalCode}" no encontrado`);

                    return {
                        rowIndex: i + 2,
                        animalCode: animalCode ?? `SIN_CODIGO_${i + 2}`,
                        animal_id,
                        eventDate: eventDate ?? new Date().toISOString().split('T')[0],
                        vaccineName: vaccineName ?? '',
                        dose,
                        responsible,
                        notes,
                        errors,
                        hasError: errors.length > 0,
                    };
                });

            setProgress(100);
            setRows(validated);
            setStep('preview');

        } catch (e: any) {
            console.error('BulkImportVaccinations parse error:', e);
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    // ── 2. Eliminar fila de la vista previa ───────────────────────────────────

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

            let loaded = 0;
            let skipped = 0;
            const total = validRows.length;

            for (let i = 0; i < total; i++) {
                const row = validRows[i];
                try {
                    await db.withTransactionAsync(async () => {
                        // Crear animal_event
                        const eventId = newId();
                        await db.runAsync(
                            `INSERT INTO animal_events
                             (id, id_user, id_ranch_animal, id_event_type, event_date, notes,
                              created_at, updated_at, is_synced, sync_action)
                             VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [eventId, session.id_user, row.animal_id!,
                                EVENT_TYPES.VACUNACION,
                                new Date(row.eventDate).toISOString(),
                                row.notes ?? null, ts, ts]
                        );

                        // Crear registro de vacunación
                        const vaccId = newId();
                        await db.runAsync(
                            `INSERT INTO vaccinations
                             (id, id_event, vaccine_name, dose, responsible, notes,
                              created_at, updated_at, is_synced, sync_action)
                             VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [vaccId, eventId, row.vaccineName, row.dose ?? null,
                                row.responsible ?? null, row.notes ?? null, ts, ts]
                        );
                    });
                    loaded++;
                } catch {
                    skipped++;
                }

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
        setStep('idle');
        setProgress(0);
        setRows([]);
        setErrorMsg(null);
        setLoadedCount(0);
        setSkippedCount(0);
    }, []);

    const validCount = rows.filter(r => !r.hasError).length;
    const invalidCount = rows.filter(r => r.hasError).length;

    return {
        step, progress, rows, errorMsg,
        loadedCount, skippedCount, validCount, invalidCount,
        pickAndParse, removeRow, loadToDatabase, reset,
    };
}
