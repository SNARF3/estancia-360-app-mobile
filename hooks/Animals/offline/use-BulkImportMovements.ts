// hooks/Animals/offline/use-BulkImportMovements.ts
// Carga masiva de Movimientos desde Excel (Plantilla_Carga_Masiva_Movimientos_Estancia360.xlsx)
//
// La plantilla tiene 5 hojas: Carga_Compras, Carga_Ventas, Carga_Traslados,
// Carga_Salidas_Estancia, Carga_Bajas. En las primeras 4, ID_CARGA agrupa filas de
// una misma operación (comprador/precio/fecha compartidos) — un grupo = un movimiento
// con N animales. En Bajas, ID_CARGA es solo una etiqueta: cada fila es una baja
// independiente (matchea 1:1 con animal_exits, que no es batch).

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSession } from '../../auth/use-Auth';
import { getDb } from '../../db.sqlite/db-pool';
import { confirmMovementAnimal, registerExit, registerMovement, type MovementAnimalInput } from '../../db.sqlite/repositories/events';

export type BulkMovementType = 'purchase' | 'sale' | 'pasture_transfer' | 'ranch_exit' | 'exit';

const SHEET_BY_TYPE: Record<BulkMovementType, string> = {
    purchase: 'Carga_Compras',
    sale: 'Carga_Ventas',
    pasture_transfer: 'Carga_Traslados',
    ranch_exit: 'Carga_Salidas_Estancia',
    exit: 'Carga_Bajas',
};

const LABEL_BY_TYPE: Record<BulkMovementType, string> = {
    purchase: 'Compras',
    sale: 'Ventas',
    pasture_transfer: 'Traslados',
    ranch_exit: 'Salidas a otra estancia',
    exit: 'Bajas',
};

function mapDate(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'number') return new Date(Math.round((raw - 25569) * 86400 * 1000)).toISOString().split('T')[0];
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw.toISOString().split('T')[0];
    if (typeof raw === 'string') {
        const str = raw.trim();
        const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
        if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function str(v: any): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function num(v: any): number | undefined {
    const s = str(v);
    if (s === null) return undefined;
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? undefined : n;
}

function normalizeSex(v: any): 'M' | 'F' | null {
    const s = str(v)?.toUpperCase();
    if (!s) return null;
    if (s === 'M' || s.startsWith('MACHO')) return 'M';
    if (s === 'F' || s.startsWith('HEMBRA')) return 'F';
    return null;
}

const PRODUCTIVE_STATUS_BY_LABEL: Record<string, number> = {
    'CRÍA': 1, 'CRIA': 1, 'RECRÍA': 2, 'RECRIA': 2, 'ENGORDE': 3,
};

const EXIT_REASONS = new Set(['death', 'discard', 'loss', 'other']);

export interface BulkMovementGroup {
    key: string;
    type: BulkMovementType;
    rowIndexes: number[];
    fecha: string | null;
    counterpartOrOrigin: string | null; // proveedor/comprador/estancia destino
    totalPrice?: number;
    pricePerKg?: number;
    notes?: string | null;
    destLotName?: string | null;
    reason?: string | null; // solo bajas
    animals: {
        code: string;
        idRanchAnimal: string | null; // null si es compra (animal nuevo) o si no se encontró
        currentLotName?: string | null;
        decision?: 'accepted' | 'rejected' | null; // solo ventas
        notes?: string | null;
        // Solo compras — animal nuevo:
        newAnimal?: {
            sex: 'M' | 'F';
            breedName: string;
            idBreed: number | null;
            className: string;
            idAnimalClass: number | null;
            birthdate: string | null;
            weight?: number;
            idProductiveStatus?: number;
        };
    }[];
    errors: string[];
    hasError: boolean;
}

async function loadLocalCatalogs(idRanch: string) {
    const db = await getDb();
    const [animalRows, lotRows, breedRows, classRows] = await Promise.all([
        db.getAllAsync<{ id: string; code: string; id_lot: string | null }>(
            `SELECT id, code, id_lot FROM ranch_animals WHERE id_ranch = ? AND id_status != 3`, [idRanch]
        ),
        db.getAllAsync<{ id: string; name: string }>(`SELECT id, name FROM ranch_lots WHERE id_ranch = ?`, [idRanch]),
        db.getAllAsync<{ id: number; name: string }>(`SELECT id, name FROM animal_breeds WHERE is_active = 1`),
        db.getAllAsync<{ id: number; name: string }>(`SELECT id, name FROM animal_classes WHERE is_active = 1`),
    ]);
    const animalMap = new Map<string, { id: string; id_lot: string | null }>();
    animalRows.forEach(a => animalMap.set(a.code.toUpperCase(), { id: a.id, id_lot: a.id_lot }));
    const lotMap = new Map<string, string>();
    lotRows.forEach(l => lotMap.set(l.name.toUpperCase(), l.id));
    const breedMap = new Map<string, number>();
    breedRows.forEach(b => breedMap.set(b.name.toUpperCase(), b.id));
    const classMap = new Map<string, number>();
    classRows.forEach(c => classMap.set(c.name.toUpperCase(), c.id));
    return { animalMap, lotMap, breedMap, classMap };
}

type Catalogs = Awaited<ReturnType<typeof loadLocalCatalogs>>;

function readSheetRows(workbook: ReturnType<typeof xlsxRead>, sheetName: string): Record<string, any>[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return xlsxUtils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

function groupPurchaseLike(
    rawRows: Record<string, any>[],
    type: 'purchase' | 'sale' | 'pasture_transfer' | 'ranch_exit',
    catalogs: Catalogs,
): BulkMovementGroup[] {
    const byId = new Map<string, { rows: Record<string, any>[]; rowIndexes: number[] }>();
    rawRows.forEach((r, i) => {
        const hasData = Object.values(r).some(v => v !== null && v !== '');
        if (!hasData) return;
        const idCarga = str(r.ID_CARGA) ?? `FILA_${i + 2}`;
        if (!byId.has(idCarga)) byId.set(idCarga, { rows: [], rowIndexes: [] });
        byId.get(idCarga)!.rows.push(r);
        byId.get(idCarga)!.rowIndexes.push(i + 2);
    });

    const groups: BulkMovementGroup[] = [];
    for (const [key, { rows, rowIndexes }] of byId) {
        const errors: string[] = [];
        const header = rows[0];
        const fecha = mapDate(header.FECHA);
        if (!fecha) errors.push('Fecha inválida o vacía');

        // Consistencia de cabecera dentro del grupo
        const fechas = new Set(rows.map(r => mapDate(r.FECHA)));
        if (fechas.size > 1) errors.push('Las filas del grupo tienen fechas distintas');

        const group: BulkMovementGroup = {
            key, type, rowIndexes, fecha,
            counterpartOrOrigin: null,
            animals: [],
            errors,
            hasError: false,
        };

        if (type === 'purchase') {
            group.counterpartOrOrigin = str(header.PROVEEDOR);
            group.totalPrice = num(header.PRECIO_TOTAL);
            group.pricePerKg = num(header.PRECIO_POR_KG);
            group.notes = str(header.NOTAS_OPERACION);
            for (const r of rows) {
                const code = str(r.CODIGO_ANIMAL_NUEVO);
                const sex = normalizeSex(r.SEXO);
                const breedName = str(r.RAZA);
                const className = str(r.CATEGORIA);
                const birthdate = mapDate(r.FECHA_NACIMIENTO);
                const lotName = str(r.LOTE_DESTINO);
                const psLabel = str(r.ETAPA_PRODUCTIVA)?.toUpperCase();

                if (!code) { errors.push('CODIGO_ANIMAL_NUEVO vacío en una fila'); continue; }
                if (catalogs.animalMap.has(code.toUpperCase())) errors.push(`El animal "${code}" ya existe — no puede ser una compra nueva`);
                if (!sex) errors.push(`Fila de ${code}: SEXO inválido`);
                if (!breedName || !catalogs.breedMap.has(breedName.toUpperCase())) errors.push(`Fila de ${code}: raza "${breedName ?? ''}" no reconocida`);
                if (!className || !catalogs.classMap.has(className.toUpperCase())) errors.push(`Fila de ${code}: categoría "${className ?? ''}" no reconocida`);
                if (!birthdate) errors.push(`Fila de ${code}: fecha de nacimiento inválida`);

                group.animals.push({
                    code,
                    idRanchAnimal: null,
                    notes: str(r.NOTAS_ANIMAL),
                    newAnimal: {
                        sex: sex ?? 'F',
                        breedName: breedName ?? '',
                        idBreed: breedName ? catalogs.breedMap.get(breedName.toUpperCase()) ?? null : null,
                        className: className ?? '',
                        idAnimalClass: className ? catalogs.classMap.get(className.toUpperCase()) ?? null : null,
                        birthdate,
                        weight: num(r.PESO),
                        idProductiveStatus: psLabel ? PRODUCTIVE_STATUS_BY_LABEL[psLabel] : undefined,
                        idLot: lotName ? undefined : undefined, // resuelto abajo
                    } as any,
                });
                if (lotName) {
                    const idLot = catalogs.lotMap.get(lotName.toUpperCase());
                    if (!idLot) errors.push(`Fila de ${code}: lote "${lotName}" no encontrado`);
                    (group.animals[group.animals.length - 1].newAnimal as any).idLot = idLot;
                }
            }
        } else if (type === 'sale') {
            group.counterpartOrOrigin = str(header.COMPRADOR);
            group.totalPrice = num(header.PRECIO_TOTAL);
            group.pricePerKg = num(header.PRECIO_POR_KG);
            group.notes = str(header.NOTAS_OPERACION);
            if (!group.counterpartOrOrigin) errors.push('COMPRADOR vacío');
            for (const r of rows) {
                const code = str(r.CODIGO_ANIMAL);
                if (!code) { errors.push('CODIGO_ANIMAL vacío en una fila'); continue; }
                const animal = catalogs.animalMap.get(code.toUpperCase());
                if (!animal) errors.push(`Animal "${code}" no encontrado`);
                const decisionRaw = str(r.DECISION)?.toLowerCase();
                const decision = decisionRaw === 'accepted' || decisionRaw === 'rejected' ? decisionRaw : null;
                group.animals.push({ code, idRanchAnimal: animal?.id ?? null, decision, notes: str(r.NOTAS_ANIMAL) });
            }
        } else if (type === 'pasture_transfer') {
            group.notes = str(header.NOTAS_OPERACION);
            const destLotName = str(rows[0].LOTE_DESTINO);
            group.destLotName = destLotName;
            for (const r of rows) {
                const code = str(r.CODIGO_ANIMAL);
                if (!code) { errors.push('CODIGO_ANIMAL vacío en una fila'); continue; }
                const animal = catalogs.animalMap.get(code.toUpperCase());
                if (!animal) errors.push(`Animal "${code}" no encontrado`);
                const rowLotName = str(r.LOTE_DESTINO);
                if (rowLotName && rowLotName.toUpperCase() !== destLotName?.toUpperCase()) {
                    errors.push(`Fila de ${code}: LOTE_DESTINO distinto al resto del grupo`);
                }
                group.animals.push({ code, idRanchAnimal: animal?.id ?? null, notes: str(r.NOTAS_ANIMAL) });
            }
            if (!destLotName || !catalogs.lotMap.has(destLotName.toUpperCase())) errors.push(`Lote destino "${destLotName ?? ''}" no encontrado`);
        } else {
            group.counterpartOrOrigin = str(header.ESTANCIA_DESTINO);
            group.notes = str(header.NOTAS_OPERACION);
            if (!group.counterpartOrOrigin) errors.push('ESTANCIA_DESTINO vacío');
            for (const r of rows) {
                const code = str(r.CODIGO_ANIMAL);
                if (!code) { errors.push('CODIGO_ANIMAL vacío en una fila'); continue; }
                const animal = catalogs.animalMap.get(code.toUpperCase());
                if (!animal) errors.push(`Animal "${code}" no encontrado`);
                group.animals.push({ code, idRanchAnimal: animal?.id ?? null, notes: str(r.NOTAS_ANIMAL) });
            }
        }

        group.hasError = errors.length > 0;
        groups.push(group);
    }
    return groups;
}

function groupExits(rawRows: Record<string, any>[], catalogs: Catalogs): BulkMovementGroup[] {
    const groups: BulkMovementGroup[] = [];
    rawRows.forEach((r, i) => {
        const hasData = Object.values(r).some(v => v !== null && v !== '');
        if (!hasData) return;
        const errors: string[] = [];
        const code = str(r.CODIGO_ANIMAL);
        const fecha = mapDate(r.FECHA);
        const reason = str(r.MOTIVO)?.toLowerCase() ?? null;

        if (!code) errors.push('CODIGO_ANIMAL vacío');
        if (!fecha) errors.push('Fecha inválida o vacía');
        if (!reason || !EXIT_REASONS.has(reason)) errors.push(`MOTIVO "${reason ?? ''}" inválido (death|discard|loss|other)`);
        const animal = code ? catalogs.animalMap.get(code.toUpperCase()) : undefined;
        if (code && !animal) errors.push(`Animal "${code}" no encontrado`);

        groups.push({
            key: `BAJA_${i + 2}`,
            type: 'exit',
            rowIndexes: [i + 2],
            fecha,
            counterpartOrOrigin: null,
            reason,
            notes: str(r.NOTAS),
            animals: [{ code: code ?? '', idRanchAnimal: animal?.id ?? null, notes: str(r.NOTAS) }],
            errors,
            hasError: errors.length > 0,
        });
    });
    return groups;
}

export function useBulkImportMovements() {
    const [step, setStep] = useState<'idle' | 'reading' | 'preview' | 'loading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [groups, setGroups] = useState<BulkMovementGroup[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    const pickAndParse = useCallback(async () => {
        setStep('reading');
        setProgress(5);
        setErrorMsg(null);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) { setStep('idle'); return; }

            setProgress(20);
            const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
            setProgress(35);
            const workbook = xlsxRead(base64, { type: 'base64', cellDates: true });

            const session = await getSession();
            if (!session) { setErrorMsg('No hay sesión activa.'); setStep('error'); return; }
            const catalogs = await loadLocalCatalogs(session.id_ranch);
            setProgress(55);

            const allGroups: BulkMovementGroup[] = [
                ...groupPurchaseLike(readSheetRows(workbook, SHEET_BY_TYPE.purchase), 'purchase', catalogs),
                ...groupPurchaseLike(readSheetRows(workbook, SHEET_BY_TYPE.sale), 'sale', catalogs),
                ...groupPurchaseLike(readSheetRows(workbook, SHEET_BY_TYPE.pasture_transfer), 'pasture_transfer', catalogs),
                ...groupPurchaseLike(readSheetRows(workbook, SHEET_BY_TYPE.ranch_exit), 'ranch_exit', catalogs),
                ...groupExits(readSheetRows(workbook, SHEET_BY_TYPE.exit), catalogs),
            ];

            if (allGroups.length === 0) {
                setErrorMsg('El archivo no contiene filas de datos en ninguna hoja reconocida (Carga_Compras, Carga_Ventas, Carga_Traslados, Carga_Salidas_Estancia, Carga_Bajas).');
                setStep('error');
                return;
            }

            setProgress(100);
            setGroups(allGroups);
            setStep('preview');
        } catch (e: any) {
            console.error('BulkImportMovements parse error:', e);
            setErrorMsg(e.message ?? 'Error al leer el archivo.');
            setStep('error');
        }
    }, []);

    const removeGroup = useCallback((key: string) => {
        setGroups(prev => prev.filter(g => g.key !== key));
    }, []);

    const loadToDatabase = useCallback(async () => {
        const validGroups = groups.filter(g => !g.hasError);
        if (validGroups.length === 0) { setErrorMsg('No hay operaciones válidas para cargar.'); return; }

        setStep('loading');
        setProgress(0);
        setLoadedCount(0);
        setSkippedCount(0);

        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');

            let loaded = 0;
            let skipped = 0;
            const total = validGroups.length;

            for (let i = 0; i < total; i++) {
                const g = validGroups[i];
                try {
                    if (g.type === 'exit') {
                        await registerExit({
                            id_user: session.id_user,
                            id_ranch_animal: g.animals[0].idRanchAnimal!,
                            event_date: new Date(g.fecha!).toISOString(),
                            reason: g.reason as 'death' | 'discard' | 'loss' | 'other',
                            notes: g.notes ?? undefined,
                        });
                    } else {
                        const animals: MovementAnimalInput[] = g.animals.map(a => {
                            if (g.type === 'purchase') {
                                return {
                                    notes: a.notes ?? undefined,
                                    newAnimal: {
                                        code: a.code,
                                        sex: a.newAnimal!.sex,
                                        id_breed: a.newAnimal!.idBreed!,
                                        id_animal_class: a.newAnimal!.idAnimalClass!,
                                        birthdate: a.newAnimal!.birthdate!,
                                        weight: a.newAnimal!.weight,
                                        id_lot: (a.newAnimal as any).idLot,
                                        id_productive_status: a.newAnimal!.idProductiveStatus,
                                    },
                                };
                            }
                            if (g.type === 'pasture_transfer') {
                                return { id_ranch_animal: a.idRanchAnimal!, id_lot_dest: undefined, notes: a.notes ?? undefined };
                            }
                            return { id_ranch_animal: a.idRanchAnimal!, notes: a.notes ?? undefined };
                        });

                        // id_lot_dest del traslado es común al grupo — resolver una sola vez
                        let idLotDest: string | undefined;
                        if (g.type === 'pasture_transfer' && g.destLotName) {
                            const db = await getDb();
                            const lot = await db.getFirstAsync<{ id: string }>(
                                `SELECT id FROM ranch_lots WHERE id_ranch = ? AND UPPER(name) = ?`,
                                [session.id_ranch, g.destLotName.toUpperCase()]
                            );
                            idLotDest = lot?.id;
                            animals.forEach(a => { a.id_lot_dest = idLotDest; });
                        }

                        const result = await registerMovement({
                            id_user: session.id_user,
                            id_ranch: session.id_ranch,
                            movement_type: g.type,
                            event_date: new Date(g.fecha!).toISOString(),
                            counterpart_name: g.type === 'sale' || g.type === 'ranch_exit' ? g.counterpartOrOrigin ?? undefined : undefined,
                            origin_name: g.type === 'purchase' ? g.counterpartOrOrigin ?? undefined : undefined,
                            total_price: g.totalPrice,
                            price_per_kg: g.pricePerKg,
                            notes: g.notes ?? undefined,
                            animals,
                        });

                        // Ventas con DECISION ya cargada en el Excel: aplicar de una
                        if (g.type === 'sale') {
                            for (let j = 0; j < g.animals.length; j++) {
                                const decision = g.animals[j].decision;
                                const maId = result.movement_animal_ids[j];
                                if (decision && maId) {
                                    await confirmMovementAnimal(maId, session.id_user, decision);
                                }
                            }
                        }
                    }
                    loaded++;
                } catch (e) {
                    console.warn('BulkImportMovements commit error:', e);
                    skipped++;
                }

                setProgress(Math.round(((i + 1) / total) * 100));
                setLoadedCount(loaded);
                setSkippedCount(skipped);
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
            }

            setStep('done');
        } catch (e: any) {
            setErrorMsg(e.message ?? 'Error durante la carga.');
            setStep('error');
        }
    }, [groups]);

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setGroups([]);
        setErrorMsg(null);
        setLoadedCount(0);
        setSkippedCount(0);
    }, []);

    const validCount = groups.filter(g => !g.hasError).length;
    const invalidCount = groups.filter(g => g.hasError).length;

    return {
        step, progress, groups, errorMsg,
        loadedCount, skippedCount, validCount, invalidCount,
        pickAndParse, removeGroup, loadToDatabase, reset,
    };
}

export { LABEL_BY_TYPE };
