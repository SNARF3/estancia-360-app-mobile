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

// ─── Tipos de DB ──────────────────────────────────────────────────────────────

interface AnimalClassDbRow {
    id: number;
    name: string;
    sex: string | null;
    default_productive_status: number;
    is_active: number;
}

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
 * Busca una clase en el array de clases de la DB.
 * Acepta ID numérico, nombre exacto (case-insensitive) o coincidencia parcial.
 */
function findClassInDb(
    raw: string | null | undefined,
    dbClasses: AnimalClassDbRow[]
): AnimalClassDbRow | null {
    if (!raw || dbClasses.length === 0) return null;

    // Por número
    const num = parseInt(raw.toString().trim(), 10);
    if (!isNaN(num)) {
        const byId = dbClasses.find(c => c.id === num && c.is_active);
        if (byId) return byId;
    }

    const v = raw.toString().trim().toLowerCase();

    // Nombre exacto
    const exact = dbClasses.find(c => c.name.toLowerCase() === v);
    if (exact) return exact;

    // Coincidencia parcial (el raw contiene el nombre o viceversa)
    const partial = dbClasses.find(c => {
        const cn = c.name.toLowerCase();
        return v.includes(cn) || cn.includes(v);
    });
    return partial ?? null;
}

/** FECHA: acepta string "DD/MM/YYYY", ISO "YYYY-MM-DD", Date de JS, número serial Excel */
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

/** RAZA: coincidencia parcial sobre razas de la DB; null si no hay match */
function resolveBreedId(raw: string | null | undefined, breeds: { id: number; name: string }[]): number | null {
    if (!raw || breeds.length === 0) return null;
    const v = raw.toString().trim().toLowerCase();
    const match = breeds.find(b => b.name.toLowerCase().includes(v) || v.includes(b.name.toLowerCase()));
    return match?.id ?? null;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RawAnimalRow {
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

export interface UnresolvedClass {
    name: string;            // nombre tal como viene del Excel
    id: number | null;       // null=sin resolver, -1=saltado por el usuario
    productive_status: number; // elegido por el usuario al crear (default 1=CRIA)
}

export interface UnresolvedBreed {
    name: string;
    id: number | null;
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
    id_productive_status: number;
    id_breed: number | null;
    breed_raw: string | null;
    class_raw: string | null;   // nombre original del Excel para resolución posterior
    birthdate: string;
    id_lot: string | null;
    lot_name: string | null;
    weight: number | null;
    errors: string[];
    hasError: boolean;
}

// ─── Hook de lectura/validación ───────────────────────────────────────────────

export function useBulkImportAnimals() {
    const [step, setStep] = useState<'idle' | 'reading' | 'class_check' | 'breed_check' | 'lot_check' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [rows, setRows] = useState<ValidatedAnimalRow[]>([]);
    const [unresolvedClasses, setUnresolvedClasses] = useState<UnresolvedClass[]>([]);
    const [unresolvedBreeds, setUnresolvedBreeds] = useState<UnresolvedBreed[]>([]);
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
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            setProgress(30);

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

            const [existingCodesRows, lotRows, breedRows, classRows] = await Promise.all([
                db.getAllAsync<{ code: string }>(
                    `SELECT code FROM ranch_animals WHERE id_ranch = ?`, [session.id_ranch]
                ),
                db.getAllAsync<{ id: string, name: string }>(
                    `SELECT id, name FROM ranch_lots WHERE id_ranch = ?`, [session.id_ranch]
                ),
                db.getAllAsync<{ id: number, name: string }>(
                    `SELECT id, name FROM animal_breeds WHERE is_active = 1`
                ),
                db.getAllAsync<AnimalClassDbRow>(
                    `SELECT id, name, sex, default_productive_status, is_active FROM animal_classes WHERE is_active = 1`
                ),
            ]);

            const activeClasses = classRows;

            const existingCodes = new Set<string>(existingCodesRows.map(r => r.code));
            const lotMap = new Map<string, string>();
            lotRows.forEach(l => lotMap.set(l.name.toLowerCase().trim(), l.id));

            setProgress(75);

            const uniqueLotNames = [...new Set(
                rawRows
                    .map(r => r.lot_name_raw ? r.lot_name_raw.trim() : null)
                    .filter(Boolean) as string[]
            )];

            const validated: ValidatedAnimalRow[] = rawRows.map(raw => {
                const errors: string[] = [];
                const sex = mapSex(raw.sex_raw);
                let birthdate = mapDate(raw.birthdate_raw);
                const weight = mapWeight(raw.weight_raw);

                // Clase: buscar en DB, si no hay match se deja pendiente (class_check)
                const classMatch = findClassInDb(raw.category_raw, activeClasses);
                const id_animal_class = classMatch?.id ?? (sex === 'F' ? 8 : 10); // fallback Vaca/Toro
                const id_productive_status = classMatch?.default_productive_status ?? PRODUCTIVE_STATUSES.CRIA;

                const id_breed = resolveBreedId(raw.breed_raw, breedRows);

                const ageMonths = parseFloat(raw.age_months_raw);
                if (!birthdate && !isNaN(ageMonths) && ageMonths >= 0) {
                    birthdate = ageToBirthdate(ageMonths);
                }

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
                    id_productive_status,
                    id_breed,
                    breed_raw: raw.breed_raw,
                    class_raw: raw.category_raw,
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

            // Clases no resueltas: nombres del Excel sin match en la DB
            const unresolvedClassNames = [...new Set(
                rawRows
                    .map(r => r.category_raw ? r.category_raw.trim() : null)
                    .filter(Boolean) as string[]
            )].filter(name => findClassInDb(name, activeClasses) === null);

            // Razas no resueltas
            const unresolvedBreedNames = [...new Set(
                rawRows
                    .map(r => r.breed_raw ? r.breed_raw.trim() : null)
                    .filter(Boolean) as string[]
            )].filter(name => resolveBreedId(name, breedRows) === null);

            const notFoundLots = uniqueLotNames.filter(name => !lotMap.has(name.toLowerCase()));

            setUnresolvedClasses(unresolvedClassNames.map(name => ({ name, id: null, productive_status: PRODUCTIVE_STATUSES.CRIA })));
            setUnresolvedBreeds(unresolvedBreedNames.map(name => ({ name, id: null })));
            setUnresolvedLots(notFoundLots.map(name => ({ name, id: null })));

            if (unresolvedClassNames.length > 0) {
                setStep('class_check');
            } else if (unresolvedBreedNames.length > 0) {
                setStep('breed_check');
            } else if (notFoundLots.length > 0) {
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

    // ── 2a. Resolver / saltear clase ─────────────────────────────────────────

    const resolveClass = useCallback((name: string, id: number, productive_status: number) => {
        setUnresolvedClasses(prev => prev.map(c =>
            c.name.toLowerCase() === name.toLowerCase() ? { ...c, id, productive_status } : c
        ));
    }, []);

    const skipClass = useCallback((name: string) => {
        setUnresolvedClasses(prev => prev.map(c =>
            c.name.toLowerCase() === name.toLowerCase() ? { ...c, id: -1 } : c
        ));
    }, []);

    // ── 2b. Confirmar clases → aplica ids/productive_status a filas y avanza ──

    const finalizeClassCheck = useCallback((resolved: UnresolvedClass[]) => {
        const classMap = new Map<string, { id: number; productive_status: number }>();
        resolved.forEach(c => {
            if (c.id !== null && c.id !== -1) {
                classMap.set(c.name.toLowerCase(), { id: c.id, productive_status: c.productive_status });
            }
        });

        setRows(prev => prev.map(r => {
            if (!r.class_raw) return r;
            const match = classMap.get(r.class_raw.toLowerCase());
            if (!match) return r; // saltado → mantiene fallback
            return { ...r, id_animal_class: match.id, id_productive_status: match.productive_status };
        }));

        if (unresolvedBreeds.length > 0) {
            setStep('breed_check');
        } else if (unresolvedLots.length > 0) {
            setStep('lot_check');
        } else {
            setStep('preview');
        }
    }, [unresolvedBreeds, unresolvedLots]);

    // ── 3a. Resolver / saltear raza ──────────────────────────────────────────

    const resolveBreed = useCallback((name: string, id: number) => {
        setUnresolvedBreeds(prev => prev.map(b =>
            b.name.toLowerCase() === name.toLowerCase() ? { ...b, id } : b
        ));
    }, []);

    const skipBreed = useCallback((name: string) => {
        setUnresolvedBreeds(prev => prev.map(b =>
            b.name.toLowerCase() === name.toLowerCase() ? { ...b, id: -1 } : b
        ));
    }, []);

    // ── 3b. Confirmar razas → aplica ids a filas y avanza ────────────────────

    const finalizeBreedCheck = useCallback((resolved: UnresolvedBreed[]) => {
        const breedMap = new Map<string, number | null>();
        resolved.forEach(b => breedMap.set(b.name.toLowerCase(), b.id === -1 ? null : b.id));

        setRows(prev => prev.map(r => {
            if (r.id_breed !== null) return r;
            if (!r.breed_raw) return r;
            const resolvedId = breedMap.get(r.breed_raw.toLowerCase()) ?? null;
            return { ...r, id_breed: resolvedId };
        }));

        if (unresolvedLots.length > 0) {
            setStep('lot_check');
        } else {
            setStep('preview');
        }
    }, [unresolvedLots]);

    // ── 4. Resolver lote ──────────────────────────────────────────────────────

    const resolveLot = useCallback((name: string, id: string) => {
        setUnresolvedLots(prev => prev.map(l => l.name === name ? { ...l, id } : l));
        setRows(prev => prev.map(r => {
            if (!r.lot_name || r.lot_name.toLowerCase() !== name.toLowerCase()) return r;
            const errors = r.errors.filter(e => !e.toLowerCase().includes('lote'));
            return { ...r, id_lot: id, errors, hasError: errors.length > 0 };
        }));
    }, []);

    const finalizeLotCheck = useCallback(() => {
        setStep('preview');
    }, []);

    // ── 5. Eliminar fila de la vista previa ───────────────────────────────────

    const removeRow = useCallback((rowIndex: number) => {
        setRows(prev => prev.filter(r => r.rowIndex !== rowIndex));
    }, []);

    // ── 6. Cargar a SQLite ────────────────────────────────────────────────────

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
             ) VALUES (?,?,COALESCE(?,1),?,?,?,?,?,?,?,?,?,?,?,0,'INSERT')`,
                        [
                            id,
                            session.id_ranch,
                            row.id_breed,
                            ANIMAL_STATUSES.ACTIVO,
                            row.id_productive_status,
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

                if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
            }

            setStep('done');
        } catch (e: any) {
            setErrorMsg(e.message ?? 'Error durante la carga.');
            setStep('error');
        }
    }, [rows]);

    // ── 7. Reset ──────────────────────────────────────────────────────────────

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setRows([]);
        setUnresolvedClasses([]);
        setUnresolvedBreeds([]);
        setUnresolvedLots([]);
        setErrorMsg(null);
        setLoadedCount(0);
        setSkippedCount(0);
    }, []);

    const validCount = rows.filter(r => !r.hasError).length;
    const invalidCount = rows.filter(r => r.hasError).length;

    return {
        step, progress, rows, unresolvedClasses, unresolvedBreeds, unresolvedLots, errorMsg,
        loadedCount, skippedCount, validCount, invalidCount,
        pickAndParse,
        resolveClass, skipClass, finalizeClassCheck,
        resolveBreed, skipBreed, finalizeBreedCheck,
        resolveLot, finalizeLotCheck,
        removeRow, loadToDatabase, reset,
    };
}
