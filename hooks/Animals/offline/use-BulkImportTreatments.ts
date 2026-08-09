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

export interface ValidatedTreatmentRow {
    rowIndex: number;
    animalCode: string;
    animal_id: string | null;
    eventDate: string;
    illness: string | null;
    medication: string;
    dose: string | null;
    duration_days: number | null;
    withdrawal_days: number | null;
    responsible: string | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

export function useBulkImportTreatments() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedTreatmentRow[]>([]);
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
            const sheetName = workbook.SheetNames.includes('Carga_Tratamientos') ? 'Carga_Tratamientos' : workbook.SheetNames[0];
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
            setProgress(70);
            const validated: ValidatedTreatmentRow[] = jsonRows.slice(1)
                .filter(r => r.some((c: any) => c !== null && c !== ''))
                .map((r, i) => {
                    const errors: string[] = [];
                    // ID_CARGA, FECHA, CODIGO_ANIMAL, LOTE_ACTUAL, ENFERMEDAD_DIAGNOSTICO,
                    // MEDICAMENTO, DOSIS, DURACION_DIAS, DIAS_RETIRO, FIN_RETIRO, RESPONSABLE,
                    // NOTAS, VALIDACION (plantilla real) — FIN_RETIRO se ignora, el móvil lo
                    // recalcula igual que el backend (eventDate + withdrawal_days).
                    const eventDate = mapDate(r[1]);
                    const animalCode = r[2]?.toString().trim().toUpperCase() ?? null;
                    const illness = r[4] ? r[4].toString().trim() : null;
                    const medication = r[5] ? r[5].toString().trim() : null;
                    const dose = r[6] ? r[6].toString().trim() : null;
                    const duration_days = r[7] ? (parseInt(r[7]) || null) : null;
                    const withdrawal_days = r[8] ? (parseInt(r[8]) || null) : null;
                    const responsible = r[10] ? r[10].toString().trim() : null;
                    const notes = r[11] ? r[11].toString().trim() : null;
                    if (!animalCode) errors.push('Código de animal vacío');
                    if (!eventDate) errors.push('Fecha inválida');
                    if (!medication) errors.push('Medicamento requerido');
                    const animal_id = animalCode ? (animalMap.get(animalCode) ?? null) : null;
                    if (animalCode && !animal_id) errors.push(`Animal "${animalCode}" no encontrado`);
                    return {
                        rowIndex: i + 2, animalCode: animalCode ?? `SIN_CODIGO_${i + 2}`, animal_id,
                        eventDate: eventDate ?? new Date().toISOString().split('T')[0],
                        illness, medication: medication ?? '', dose, duration_days, withdrawal_days,
                        responsible, notes, errors, hasError: errors.length > 0,
                    };
                });
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
                            [eventId, session.id_user, row.animal_id!, EVENT_TYPES.TRATAMIENTO, new Date(row.eventDate).toISOString(), row.notes ?? null, ts, ts]
                        );
                        let withdrawal_end_date: string | null = null;
                        if (row.withdrawal_days) {
                            const d = new Date(row.eventDate);
                            d.setDate(d.getDate() + row.withdrawal_days);
                            withdrawal_end_date = d.toISOString().split('T')[0];
                        }
                        await db.runAsync(
                            `INSERT INTO treatments (id, id_event, illness, medication, dose, duration_days, withdrawal_days, withdrawal_end_date, responsible, notes, created_at, updated_at, is_synced, sync_action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [newId(), eventId, row.illness, row.medication, row.dose, row.duration_days, row.withdrawal_days, withdrawal_end_date, row.responsible, row.notes, ts, ts]
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
