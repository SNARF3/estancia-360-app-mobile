// hooks/Animals/offline/use-BulkImportGestation.ts
// Carga masiva de diagnósticos de gestación / tactos (Planilla_Gestación.xlsx → hoja "Registro Tactos")
//
// La plantilla real es un registro de TACTOS (palpación de preñez), no de servicios
// reproductivos — reescrito para cargar gestation_diagnoses, vinculado al último servicio
// reproductivo activo de cada animal (misma regla que el formulario individual,
// hooks/breeding/use-GestationDiagnosis.ts / RN-12).

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { EVENT_TYPES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

function mapDate(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.toISOString().split('T')[0];
    if (typeof raw === 'string') {
        const str = raw.trim();
        const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
        if (m) {
            const date = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

type DiagnosisResult = 'pregnant' | 'empty';

// La columna real dice "DIAGNÓSTICO" en texto libre (Preñada/Vacía, Positivo/Negativo, etc.)
function mapDiagnosisResult(raw: any): DiagnosisResult | null {
    if (!raw) return null;
    const s = raw.toString().trim().toLowerCase();
    if (s.includes('preñ') || s.includes('prenad') || s.includes('positiv')) return 'pregnant';
    if (s.includes('vac') || s.includes('negativ')) return 'empty';
    return null;
}

export interface ValidatedGestationRow {
    rowIndex: number;
    animalCode: string;
    animal_id: string | null;
    service_id: string | null;
    eventDate: string;
    result: DiagnosisResult;
    gestationDays: number | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

export function useBulkImportGestation() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedGestationRow[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    const pickAndParse = useCallback(async () => {
        setStep('reading'); setProgress(5); setErrorMsg(null);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) { setStep('idle'); return; }
            setProgress(20);
            const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            setProgress(35);
            const workbook = xlsxRead(base64, { type: 'base64', cellDates: true });
            // Planilla_Gestación.xlsx trae "Guía de Uso" como primera hoja (vacía) y los datos
            // en "Registro Tactos" — leer por índice 0 a ciegas hacía que cualquier carga con
            // el archivo real fallara siempre con "el archivo no contiene datos".
            const sheetName = workbook.SheetNames.includes('Registro Tactos') ? 'Registro Tactos' : workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonRows = xlsxUtils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
            setProgress(50);
            if (jsonRows.length < 2) { setErrorMsg('El archivo no contiene datos.'); setStep('error'); return; }
            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();
            const animalRows = await db.getAllAsync<{ id: string; code: string }>(
                `SELECT id, code FROM ranch_animals WHERE id_ranch = ? AND id_status = 1`, [session.id_ranch]
            );
            const animalMap = new Map(animalRows.map(a => [a.code.toUpperCase(), a.id]));
            setProgress(65);

            // Columnas reales (Planilla_Gestación.xlsx → "Registro Tactos"):
            // 0=CÓDIGO DEL ANIMAL, 1=FECHA DE TACTO, 2=TIPO DE SERVICIO (informativo, no se
            // guarda), 3=DIAGNÓSTICO, 4=MESES DE GESTACIÓN, 5=PESO (OPCIONAL, sin campo destino
            // en gestation_diagnoses), 6=CONDICIÓN CORPORAL (ídem), 7=OBSERVACIONES.
            // method siempre 'palpation' — la plantilla entera es de tactos (palpación manual),
            // no trae columna para elegir método.
            const dataRowsRaw = jsonRows.slice(1).filter(r => r.some((c: any) => c !== null && c !== ''));

            const validated: ValidatedGestationRow[] = [];
            for (let i = 0; i < dataRowsRaw.length; i++) {
                const r = dataRowsRaw[i];
                const errors: string[] = [];
                const animalCode = r[0]?.toString().trim().toUpperCase() ?? null;
                const eventDate = mapDate(r[1]);
                const result = mapDiagnosisResult(r[3]);
                const monthsRaw = r[4];
                const months = monthsRaw !== null && monthsRaw !== undefined && monthsRaw !== ''
                    ? parseFloat(monthsRaw.toString().replace(',', '.')) : null;
                const gestationDays = months !== null && !isNaN(months) ? Math.round(months * 30) : null;
                const notes = r[7] ? r[7].toString().trim() : null;

                if (!animalCode) errors.push('Código de animal vacío');
                if (!eventDate) errors.push('Fecha de tacto inválida');
                if (!result) errors.push(`Diagnóstico "${r[3] ?? ''}" no reconocido (usar Preñada/Vacía)`);
                if (result === 'pregnant' && gestationDays === null) errors.push('Meses de gestación obligatorio cuando el diagnóstico es Preñada');

                const animal_id = animalCode ? (animalMap.get(animalCode) ?? null) : null;
                if (animalCode && !animal_id) errors.push(`Animal "${animalCode}" no encontrado o no está activo`);

                let service_id: string | null = null;
                if (animal_id) {
                    const service = await db.getFirstAsync<{ id: string }>(
                        `SELECT bs.id FROM breeding_services bs
                         JOIN animal_events ae ON ae.id = bs.id_event
                         WHERE ae.id_ranch_animal = ?
                         ORDER BY ae.event_date DESC LIMIT 1`,
                        [animal_id]
                    );
                    service_id = service?.id ?? null;
                    if (!service_id) errors.push(`No se encontró un servicio reproductivo previo para "${animalCode}"`);
                }

                validated.push({
                    rowIndex: i + 2,
                    animalCode: animalCode ?? `SIN_CODIGO_${i + 2}`,
                    animal_id,
                    service_id,
                    eventDate: eventDate ?? new Date().toISOString().split('T')[0],
                    result: result ?? 'empty',
                    gestationDays,
                    notes,
                    errors,
                    hasError: errors.length > 0,
                });

                if (i % 20 === 0) setProgress(65 + Math.round((i / dataRowsRaw.length) * 30));
            }

            setProgress(100);
            setRows(validated);
            setStep('preview');
        } catch (e: any) {
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    const removeRow = useCallback((rowIndex: number) => {
        setRows(prev => prev.filter(r => r.rowIndex !== rowIndex));
    }, []);

    const loadToDatabase = useCallback(async () => {
        const validRows = rows.filter(r => !r.hasError);
        if (!validRows.length) return;
        setStep('loading'); setProgress(0); setLoadedCount(0); setSkippedCount(0);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();
            const ts = now();
            let loaded = 0, skipped = 0;
            for (let i = 0; i < validRows.length; i++) {
                const row = validRows[i];
                try {
                    await db.withTransactionAsync(async () => {
                        const eventId = newId();
                        await db.runAsync(
                            `INSERT INTO animal_events (id, id_user, id_ranch_animal, id_event_type, event_date, notes, created_at, updated_at, is_synced, sync_action) VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [eventId, session.id_user, row.animal_id!, EVENT_TYPES.DIAGNOSTICO, new Date(row.eventDate).toISOString(), row.notes ?? null, ts, ts]
                        );
                        await db.runAsync(
                            `INSERT INTO gestation_diagnoses (id, id_event, id_service, method, result, gestation_days, created_at, updated_at, is_synced, sync_action) VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [newId(), eventId, row.service_id!, 'palpation', row.result, row.gestationDays, ts, ts]
                        );
                    });
                    loaded++;
                } catch { skipped++; }
                setProgress(Math.round(((i + 1) / validRows.length) * 100));
                setLoadedCount(loaded); setSkippedCount(skipped);
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
            }
            setStep('done');
        } catch (e: any) {
            setErrorMsg(e.message ?? 'Error durante la carga.');
            setStep('error');
        }
    }, [rows]);

    const reset = useCallback(() => {
        setStep('idle'); setProgress(0); setRows([]); setErrorMsg(null);
        setLoadedCount(0); setSkippedCount(0);
    }, []);

    return {
        step, progress, rows, errorMsg, loadedCount, skippedCount,
        validCount: rows.filter(r => !r.hasError).length,
        invalidCount: rows.filter(r => r.hasError).length,
        pickAndParse, removeRow, loadToDatabase, reset,
    };
}
