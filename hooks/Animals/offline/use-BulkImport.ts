// hooks/Animals/offline/use-BulkImport.ts
// Lógica de validación, transformación y carga masiva desde Excel

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { ANIMAL_STATUSES, PRODUCTIVE_STATUSES } from '../../db.sqlite/database';
import { getDb } from '../../db.sqlite/db-pool';
import { newId, now } from '../../db.sqlite/db-utils';

// ─── Mapeadores de valores del Excel → DB ─────────────────────────────────────

/** SEXO: "Hembra" → "F", "Macho" → "M" */
function mapSex(raw: string | null | undefined): 'M' | 'F' | null {
    if (!raw) return null;
    const v = raw.toString().trim().toLowerCase();
    if (v === 'hembra' || v === 'f') return 'F';
    if (v === 'macho' || v === 'm') return 'M';
    return null;
}

/**
 * CATEGORÍA → id_animal_class
 * Catálogo animal_classes (database.ts):
 *  1=Ternera, 2=Ternero M Entero, 3=Ternero M Castrado,
 *  4=Hembra Destetada, 5=Macho Entero Destetado, 6=Macho Castrado Destetado,
 *  7=Vaquilla, 8=Vaca, 9=Hembra Esterilizada, 10=Toro, 11=Novillo
 */
function mapCategory(raw: string | null | undefined, sex: 'M' | 'F' | null): number {
    if (!raw || !sex) return sex === 'F' ? 8 : 10; // fallback: Vaca / Toro
    const v = raw.toString().trim().toLowerCase();

    if (v.includes('ternero') || v.includes('ternera')) return sex === 'F' ? 1 : 2;
    if (v.includes('novillo')) return 11;
    if (v.includes('toro')) return sex === 'F' ? 8 : 10; // "Toro" en hembra → Vaca
    if (v.includes('vaquilla')) return 7;
    if (v.includes('vaca')) return 8;
    if (v.includes('esteriliza')) return 9;
    if (v.includes('destetada') || v.includes('destetado')) return sex === 'F' ? 4 : 5;
    return sex === 'F' ? 8 : 10;
}

/** FECHA: acepta string ISO "YYYY-MM-DD", Date de JS, número serial Excel */
function mapDate(raw: any): string | null {
    if (!raw) return null;
    // Ya es string ISO
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.split('T')[0];
    // Es objeto Date (xlsx lo parsea así cuando detecta fecha)
    if (raw instanceof Date) return raw.toISOString().split('T')[0];
    // Número serial Excel (días desde 1/1/1900)
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    // Intento de parseo genérico
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

/** PESO: acepta número o string con coma/punto */
function mapWeight(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = parseFloat(raw.toString().replace(',', '.'));
    return isNaN(n) ? null : n;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RawAnimalRow {
    /** Fila original del Excel (base 2, header=1) */
    rowIndex: number;
    code: string | null;
    sex_raw: string | null;
    category_raw: string | null;
    breed_raw: string | null;
    birthdate_raw: any;
    weight_raw: any;
}

export interface ValidatedAnimalRow {
    rowIndex: number;
    code: string;
    sex: 'M' | 'F';
    id_animal_class: number;
    id_breed: number;      // siempre 1 por ahora
    birthdate: string;      // ISO date
    weight: number | null;
    // Errores de validación
    errors: string[];
    hasError: boolean;
}

// ─── Hook de lectura/validación ───────────────────────────────────────────────

export function useBulkImportAnimals() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);   // 0–100
    const [rows, setRows] = useState<ValidatedAnimalRow[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    // ── 1. Elegir archivo y parsear ──────────────────────────────────────────

    const pickAndParse = useCallback(async () => {
        setStep('reading');
        setProgress(5);
        setErrorMsg(null);

        try {
            // Seleccionar archivo xlsx
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) {
                setStep('idle');
                return;
            }

            setProgress(15);

            const asset = result.assets[0];
            // Leer el archivo como base64
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            setProgress(30);

            // Parsear con SheetJS
            const workbook = xlsxRead(base64, { type: 'base64', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonRows = xlsxUtils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

            setProgress(50);

            if (jsonRows.length < 2) {
                setErrorMsg('El archivo no contiene datos. Asegúrate de usar la plantilla correcta.');
                setStep('error');
                return;
            }

            // Mapear filas (saltar header = fila 0)
            const rawRows: RawAnimalRow[] = jsonRows.slice(1)
                .filter(r => r.some(cell => cell !== null && cell !== ''))
                .map((r, i) => ({
                    rowIndex: i + 2,
                    code: r[0] ? r[0].toString().trim().toUpperCase() : null,
                    sex_raw: r[1] ? r[1].toString().trim() : null,
                    category_raw: r[2] ? r[2].toString().trim() : null,
                    breed_raw: r[3] ? r[3].toString().trim() : null,
                    birthdate_raw: r[4],
                    weight_raw: r[7],
                }));

            setProgress(60);

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();

            // Códigos ya existentes en la estancia (para detectar duplicados)
            const existingCodes = new Set<string>(
                (await db.getAllAsync<{ code: string }>(
                    `SELECT code FROM ranch_animals WHERE id_ranch = ?`, [session.id_ranch]
                )).map(r => r.code)
            );

            setProgress(75);

            // Validar cada fila
            const validated: ValidatedAnimalRow[] = rawRows.map(raw => {
                const errors: string[] = [];
                const sex = mapSex(raw.sex_raw);
                const birthdate = mapDate(raw.birthdate_raw);
                const weight = mapWeight(raw.weight_raw);
                const id_animal_class = mapCategory(raw.category_raw, sex);

                if (!raw.code) errors.push('Código vacío');
                else if (existingCodes.has(raw.code)) errors.push(`Código "${raw.code}" ya existe`);
                if (!sex) errors.push(`Sexo inválido: "${raw.sex_raw}"`);
                if (!birthdate) errors.push(`Fecha inválida: "${raw.birthdate_raw}"`);

                return {
                    rowIndex: raw.rowIndex,
                    code: raw.code ?? `SIN_CODIGO_${raw.rowIndex}`,
                    sex: sex ?? 'F',
                    id_animal_class,
                    id_breed: 1,
                    birthdate: birthdate ?? new Date().toISOString().split('T')[0],
                    weight,
                    errors,
                    hasError: errors.length > 0,
                };
            });

            setProgress(100);
            setRows(validated);
            setStep('preview');

        } catch (e: any) {
            console.error('BulkImport parse error:', e);
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
                    const id = newId();
                    await db.runAsync(
                        `INSERT OR IGNORE INTO ranch_animals (
               id, id_ranch, id_breed, id_status, id_productive_status,
               id_animal_class, id_lot, code, birthdate, weight, sex,
               origin, created_at, updated_at, is_synced, sync_action
             ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [
                            id,
                            session.id_ranch,
                            row.id_breed,
                            ANIMAL_STATUSES.ACTIVO,
                            PRODUCTIVE_STATUSES.CRIA,
                            row.id_animal_class,
                            null, // id_lot
                            row.code,
                            row.birthdate,
                            row.weight,
                            row.sex,
                            'bulk_import',
                            ts, ts,
                        ]
                    );
                    loaded++;
                } catch {
                    skipped++;
                }

                const pct = Math.round(((i + 1) / total) * 100);
                setProgress(pct);
                setLoadedCount(loaded);
                setSkippedCount(skipped);

                // Pequeña pausa para que React Native actualice la UI
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
        loadedCount, skippedCount,
        validCount, invalidCount,
        pickAndParse, removeRow, loadToDatabase, reset,
    };
}