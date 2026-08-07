import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { EVENT_TYPES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';
import { setAnimalObservation } from '../../db.sqlite/repositories/animals';

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

type IncidentType = 'illness_detected' | 'quarantine';

function mapIncidentType(raw: any): IncidentType | null {
    if (!raw) return null;
    const s = raw.toString().trim().toLowerCase();
    if (s.includes('cuarentena') || s === 'quarantine') return 'quarantine';
    if (s.includes('illness') || s.includes('enfermedad') || s.includes('detected')) return 'illness_detected';
    return null;
}

export interface ValidatedIncidentRow {
    rowIndex: number;
    animalCode: string;
    animal_id: string | null;
    eventDate: string;
    incident_type: IncidentType;
    description: string | null;
    resolved_at: string | null;
    notes: string | null;
    errors: string[];
    hasError: boolean;
}

export function useBulkImportIncidents() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedIncidentRow[]>([]);
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
            const sheetName = workbook.SheetNames.includes('Carga_Incidentes') ? 'Carga_Incidentes' : workbook.SheetNames[0];
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
            const validated: ValidatedIncidentRow[] = jsonRows.slice(1)
                .filter(r => r.some((c: any) => c !== null && c !== ''))
                .map((r, i) => {
                    const errors: string[] = [];
                    // ID_CARGA, FECHA, CODIGO_ANIMAL, LOTE_ACTUAL, TIPO_INCIDENTE, DESCRIPCION,
                    // FECHA_RESUELTO, RESPONSABLE, NOTAS, EFECTO_SISTEMA, VALIDACION (plantilla real)
                    const eventDate = mapDate(r[1]);
                    const animalCode = r[2]?.toString().trim().toUpperCase() ?? null;
                    const incident_type = mapIncidentType(r[4]);
                    const description = r[5] ? r[5].toString().trim() : null;
                    const resolved_at = mapDate(r[6]);
                    const notes = r[8] ? r[8].toString().trim() : null;
                    if (!animalCode) errors.push('Código de animal vacío');
                    if (!eventDate) errors.push('Fecha inválida');
                    if (!incident_type) errors.push('Tipo inválido (use: illness_detected o quarantine)');
                    const animal_id = animalCode ? (animalMap.get(animalCode) ?? null) : null;
                    if (animalCode && !animal_id) errors.push(`Animal "${animalCode}" no encontrado`);
                    return {
                        rowIndex: i + 2, animalCode: animalCode ?? `SIN_CODIGO_${i + 2}`, animal_id,
                        eventDate: eventDate ?? new Date().toISOString().split('T')[0],
                        incident_type: incident_type ?? 'illness_detected',
                        description, resolved_at, notes, errors, hasError: errors.length > 0,
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
                            [eventId, session.id_user, row.animal_id!, EVENT_TYPES.INCIDENTE, new Date(row.eventDate).toISOString(), row.notes ?? null, ts, ts]
                        );
                        await db.runAsync(
                            `INSERT INTO health_incidents (id, id_event, incident_type, description, resolved_at, notes, created_at, updated_at, is_synced, sync_action) VALUES (?,?,?,?,?,?,?,?,0,'INSERT')`,
                            [newId(), eventId, row.incident_type, row.description, row.resolved_at, row.notes, ts, ts]
                        );

                        // Cuarentena activa (sin resolver) → animal pasa a En Observación, mismo
                        // efecto que el registro individual (registerHealthIncident en events.ts).
                        // La carga masiva insertaba directo sin pasar por ahí y se lo saltaba.
                        if (row.incident_type === 'quarantine' && !row.resolved_at) {
                            await setAnimalObservation(row.animal_id!, true);
                        }
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
