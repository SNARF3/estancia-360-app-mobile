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

/** Calcula fecha de nacimiento aproximada desde edad en meses */
function ageToBirthdate(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - Math.round(months));
    return d.toISOString().split('T')[0];
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
    age_months_raw: any;
    lot_name_raw: string | null;
    weight_raw: any;
}

export interface UnresolvedLot {
    name: string;
    id: string | null;
}

export interface ValidatedAnimalRow {
    rowIndex: number;
    code: string;
    sex: 'M' | 'F';
    id_animal_class: number;
    id_breed: number;      // siempre 1 por ahora
    birthdate: string;      // ISO date
    id_lot: string | null;  // UUID del lote si se encontró por nombre
    lot_name: string | null; // nombre original del lote para mostrar
    weight: number | null;
    // Errores de validación
    errors: string[];
    hasError: boolean;
}

// ─── Hook de lectura/validación ───────────────────────────────────────────────

export function useBulkImportAnimals() {
    const [step, setStep] = useState<'idle' | 'reading' | 'lot_check' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedAnimalRow[]>([]);
    const [unresolvedLots, setUnresolvedLots] = useState<UnresolvedLot[]>([]);
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
                    age_months_raw: r[5],
                    lot_name_raw: r[6] ? r[6].toString().trim() : null,
                    weight_raw: r[7],
                }));

            setProgress(60);

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const db = await getDb();

            // Códigos ya existentes y lotes de la estancia
            const [existingCodesRows, lotRows] = await Promise.all([
                db.getAllAsync<{ code: string }>(
                    `SELECT code FROM ranch_animals WHERE id_ranch = ?`, [session.id_ranch]
                ),
                db.getAllAsync<{ id: string, name: string }>(
                    `SELECT id, name FROM ranch_lots WHERE id_ranch = ?`, [session.id_ranch]
                )
            ]);

            const existingCodes = new Set<string>(existingCodesRows.map(r => r.code));
            const lotMap = new Map<string, string>(); // name -> id
            lotRows.forEach(l => lotMap.set(l.name.toLowerCase().trim(), l.id));

            setProgress(75);

            // Extraer nombres de lote únicos no vacíos
            const uniqueLotNames = [...new Set(
                rawRows
                    .map(r => r.lot_name_raw ? r.lot_name_raw.trim() : null)
                    .filter(Boolean) as string[]
            )];

            // Validar cada fila
            const validated: ValidatedAnimalRow[] = rawRows.map(raw => {
                const errors: string[] = [];
                const sex = mapSex(raw.sex_raw);
                let birthdate = mapDate(raw.birthdate_raw);
                const weight = mapWeight(raw.weight_raw);
                const id_animal_class = mapCategory(raw.category_raw, sex);

                // Si no hay fecha pero hay edad en meses, calcularla
                const ageMonths = parseFloat(raw.age_months_raw);
                if (!birthdate && !isNaN(ageMonths) && ageMonths >= 0) {
                    birthdate = ageToBirthdate(ageMonths);
                }

                // Resolver lote por nombre
                let id_lot: string | null = null;
                if (raw.lot_name_raw) {
                    id_lot = lotMap.get(raw.lot_name_raw.toLowerCase().trim()) || null;
                    if (!id_lot && raw.lot_name_raw.trim() !== '') {
                        errors.push(`Lote "${raw.lot_name_raw}" no existe en el sistema`);
                    }
                }

                if (!raw.code) errors.push('Código vacío');
                else if (existingCodes.has(raw.code)) errors.push(`Código "${raw.code}" ya existe`);
                if (!sex) errors.push(`Sexo inválido: "${raw.sex_raw}"`);
                if (!birthdate) errors.push(`Fecha o Edad inválida`);

                return {
                    rowIndex: raw.rowIndex,
                    code: raw.code ?? `SIN_CODIGO_${raw.rowIndex}`,
                    sex: sex ?? 'F',
                    id_animal_class,
                    id_breed: 1,
                    birthdate: birthdate ?? new Date().toISOString().split('T')[0],
                    id_lot,
                    lot_name: raw.lot_name_raw,
                    weight,
                    errors,
                    hasError: errors.length > 0,
                };
            });

            setProgress(100);
            setRows(validated);

            const notFound = uniqueLotNames.filter(name => !lotMap.has(name.toLowerCase()));
            if (notFound.length > 0) {
                setUnresolvedLots(notFound.map(name => ({ name, id: null })));
                setStep('lot_check');
            } else {
                setStep('preview');
            }

        } catch (e: any) {
            console.error('BulkImport parse error:', e);
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    // ── 2. Resolver lote ──────────────────────────────────────────────────────

    const resolveLot = useCallback((name: string, id: string) => {
        setUnresolvedLots(prev => prev.map(l => l.name === name ? { ...l, id } : l));
        setRows(prev => prev.map(r => {
            if (!r.lot_name || r.lot_name.toLowerCase() !== name.toLowerCase()) return r;
            const errors = r.errors.filter(e => !e.toLowerCase().includes('lote'));
            return { ...r, id_lot: id, errors, hasError: errors.length > 0 };
        }));
    }, []);

    // ── 3. Confirmar lotes y avanzar a preview ────────────────────────────────

    const finalizeLotCheck = useCallback(() => {
        setStep('preview');
    }, []);

    // ── 4. Eliminar fila de la vista previa ───────────────────────────────────

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
                            row.id_lot,
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

    // ── 5. Reset ──────────────────────────────────────────────────────────────

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setRows([]);
        setUnresolvedLots([]);
        setErrorMsg(null);
        setLoadedCount(0);
        setSkippedCount(0);
    }, []);

    const validCount = rows.filter(r => !r.hasError).length;
    const invalidCount = rows.filter(r => r.hasError).length;

    return {
        step, progress, rows, unresolvedLots, errorMsg,
        loadedCount, skippedCount,
        validCount, invalidCount,
        pickAndParse, resolveLot, finalizeLotCheck, removeRow, loadToDatabase, reset,
    };
}