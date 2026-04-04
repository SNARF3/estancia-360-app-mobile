// views/BulkImport/BulkImportAnimals.tsx
// Flujo completo: seleccionar archivo → leer → previsualizar → cargar → listo

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { useBulkImportAnimals, type ValidatedAnimalRow } from '../../../../../hooks/Animals/offline/use-BulkImport';

// ─── Helpers de display ───────────────────────────────────────────────────────

const CLASS_NAMES: Record<number, string> = {
    1: 'Ternera', 2: 'Ternero M. Entero', 3: 'Ternero M. Castrado',
    4: 'H. Destetada', 5: 'M. Entero Destetado', 6: 'M. Castrado Destetado',
    7: 'Vaquilla', 8: 'Vaca', 9: 'H. Esterilizada', 10: 'Toro', 11: 'Novillo',
};

// ─── Barra de progreso animada ────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.timing(anim, { toValue: pct / 100, duration: 300, useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
}

// ─── Pantalla de lectura/procesamiento ────────────────────────────────────────

function ReadingScreen({ progress }: { progress: number }) {
    return (
        <View style={styles.centerScreen}>
            <View style={styles.spinnerWrap}>
                <Ionicons name="document-text" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.readingTitle}>Procesando archivo...</Text>
            <Text style={styles.readingSubtitle}>Validando datos y formatos</Text>
            <View style={styles.progressWrap}>
                <ProgressBar pct={progress} />
                <Text style={styles.progressPct}>{progress}%</Text>
            </View>
            <Text style={styles.readingHint}>
                Esto puede tardar unos segundos según el tamaño del archivo.
            </Text>
        </View>
    );
}

// ─── Pantalla de carga a SQLite ───────────────────────────────────────────────

function LoadingScreen({ progress, loaded, skipped }: { progress: number; loaded: number; skipped: number }) {
    return (
        <View style={styles.centerScreen}>
            <View style={[styles.spinnerWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="cloud-upload" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.readingTitle}>Cargando animales...</Text>
            <Text style={styles.readingSubtitle}>Guardando en la base de datos local</Text>
            <View style={styles.progressWrap}>
                <ProgressBar pct={progress} />
                <Text style={styles.progressPct}>{progress}%</Text>
            </View>
            <View style={styles.countersRow}>
                <View style={styles.counterItem}>
                    <Text style={[styles.counterValue, { color: Colors.success }]}>{loaded}</Text>
                    <Text style={styles.counterLabel}>Cargados</Text>
                </View>
                {skipped > 0 && (
                    <View style={styles.counterItem}>
                        <Text style={[styles.counterValue, { color: Colors.error }]}>{skipped}</Text>
                        <Text style={styles.counterLabel}>Omitidos</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

// ─── Pantalla de completado ───────────────────────────────────────────────────

function DoneScreen({
    loaded, skipped, onGoAnimals, onImportMore
}: {
    loaded: number; skipped: number;
    onGoAnimals: () => void; onImportMore: () => void;
}) {
    return (
        <View style={styles.centerScreen}>
            <View style={[styles.spinnerWrap, { backgroundColor: Colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            </View>
            <Text style={styles.doneTitle}>¡Carga completada!</Text>
            <Text style={styles.doneSubtitle}>Los animales fueron guardados correctamente.</Text>

            <View style={styles.doneStats}>
                <View style={[styles.statBox, { borderColor: Colors.success }]}>
                    <Text style={[styles.statNum, { color: Colors.success }]}>{loaded}</Text>
                    <Text style={styles.statLbl}>Cargados</Text>
                </View>
                {skipped > 0 && (
                    <View style={[styles.statBox, { borderColor: Colors.error }]}>
                        <Text style={[styles.statNum, { color: Colors.error }]}>{skipped}</Text>
                        <Text style={styles.statLbl}>Omitidos</Text>
                    </View>
                )}
            </View>

            {skipped > 0 && (
                <Text style={styles.doneNote}>
                    Los animales omitidos tenían errores o ya existían en la base de datos.
                </Text>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={onGoAnimals}>
                <Ionicons name="paw" size={20} color={Colors.white} />
                <Text style={styles.primaryBtnTxt}>Ver mis animales</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onImportMore}>
                <Text style={styles.secondaryBtnTxt}>Importar más</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Pantalla de error ────────────────────────────────────────────────────────

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
    return (
        <View style={styles.centerScreen}>
            <View style={[styles.spinnerWrap, { backgroundColor: Colors.error + '15' }]}>
                <Ionicons name="alert-circle" size={48} color={Colors.error} />
            </View>
            <Text style={styles.readingTitle}>Error al procesar</Text>
            <Text style={styles.errorMsg}>{msg}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.error }]} onPress={onRetry}>
                <Text style={styles.primaryBtnTxt}>Intentar de nuevo</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Fila de previsualización ─────────────────────────────────────────────────

function PreviewRow({ item, onRemove }: { item: ValidatedAnimalRow; onRemove: () => void }) {
    const hasErr = item.hasError;
    return (
        <View style={[styles.previewRow, hasErr && styles.previewRowError]}>
            <View style={styles.previewLeft}>
                <View style={styles.previewCodeRow}>
                    <Text style={[styles.previewCode, hasErr && { color: Colors.error }]}>{item.code}</Text>
                    <View style={[styles.sexBadge, { backgroundColor: item.sex === 'F' ? '#EC489920' : '#3B82F620' }]}>
                        <Text style={[styles.sexBadgeTxt, { color: item.sex === 'F' ? '#EC4899' : '#3B82F6' }]}>
                            {item.sex === 'F' ? '♀' : '♂'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.previewClass}>{CLASS_NAMES[item.id_animal_class] ?? '-'}</Text>
                <View style={styles.previewMeta}>
                    <Ionicons name="calendar-outline" size={11} color={Colors.textDisabled} />
                    <Text style={styles.previewMetaTxt}>{item.birthdate}</Text>
                    {item.weight !== null && (
                        <>
                            <Text style={styles.previewDot}>·</Text>
                            <Text style={styles.previewMetaTxt}>{item.weight} kg</Text>
                        </>
                    )}
                </View>
                {hasErr && (
                    <View style={styles.errorsWrap}>
                        {item.errors.map((e, i) => (
                            <Text key={i} style={styles.errorLine}>⚠ {e}</Text>
                        ))}
                    </View>
                )}
            </View>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color={hasErr ? Colors.error : Colors.textDisabled} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Pantalla de previsualización ────────────────────────────────────────────

function PreviewScreen({
    rows, validCount, invalidCount, onRemove, onLoad, onCancel,
}: {
    rows: ValidatedAnimalRow[];
    validCount: number;
    invalidCount: number;
    onRemove: (rowIndex: number) => void;
    onLoad: () => void;
    onCancel: () => void;
}) {
    const handleLoad = () => {
        if (validCount === 0) {
            Alert.alert('Sin datos válidos', 'No hay filas válidas para cargar. Corregí el archivo e intentá de nuevo.');
            return;
        }
        if (invalidCount > 0) {
            Alert.alert(
                'Filas con errores',
                `Hay ${invalidCount} fila(s) con errores que serán omitidas. ¿Cargar las ${validCount} válidas de todas formas?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Cargar igual', style: 'default', onPress: onLoad },
                ]
            );
        } else {
            onLoad();
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Resumen */}
            <View style={styles.previewSummary}>
                <View style={styles.summaryChip}>
                    <Text style={[styles.summaryNum, { color: Colors.success }]}>{validCount}</Text>
                    <Text style={styles.summaryLbl}>Válidos</Text>
                </View>
                {invalidCount > 0 && (
                    <View style={styles.summaryChip}>
                        <Text style={[styles.summaryNum, { color: Colors.error }]}>{invalidCount}</Text>
                        <Text style={styles.summaryLbl}>Con errores</Text>
                    </View>
                )}
                <View style={styles.summaryChip}>
                    <Text style={[styles.summaryNum, { color: Colors.primary }]}>{rows.length}</Text>
                    <Text style={styles.summaryLbl}>Total</Text>
                </View>
            </View>

            {invalidCount > 0 && (
                <View style={styles.warnBanner}>
                    <Ionicons name="warning-outline" size={16} color="#92400E" />
                    <Text style={styles.warnText}>
                        Las filas en rojo serán omitidas. Podés eliminarlas tocando 🗑.
                    </Text>
                </View>
            )}

            {/* Lista */}
            <FlatList
                data={rows}
                keyExtractor={r => r.rowIndex.toString()}
                renderItem={({ item }) => (
                    <PreviewRow item={item} onRemove={() => onRemove(item.rowIndex)} />
                )}
                contentContainerStyle={styles.previewList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={<View style={{ height: 120 }} />}
            />

            {/* Botones fijos abajo */}
            <View style={styles.previewFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                    <Text style={styles.cancelBtnTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.loadBtn, validCount === 0 && styles.loadBtnDisabled]} onPress={handleLoad} disabled={validCount === 0}>
                    <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
                    <Text style={styles.loadBtnTxt}>CARGAR {validCount} ANIMALES</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Pantalla inicial ─────────────────────────────────────────────────────────

function IdleScreen({ onPick }: { onPick: () => void }) {
    return (
        <View style={styles.centerScreen}>
            <View style={[styles.uploadZone]}>
                <Ionicons name="cloud-upload-outline" size={52} color={Colors.primary} />
                <Text style={styles.uploadTitle}>Seleccionar archivo Excel</Text>
                <Text style={styles.uploadSub}>Formato .xlsx · Plantilla oficial Estancia360</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onPick}>
                <Ionicons name="folder-open-outline" size={20} color={Colors.white} />
                <Text style={styles.primaryBtnTxt}>Elegir archivo</Text>
            </TouchableOpacity>

            <View style={styles.columnsBox}>
                <Text style={styles.columnsTitle}>Columnas requeridas en la plantilla:</Text>
                {[
                    'CÓDIGO DEL ANIMAL',
                    'SEXO  (Macho / Hembra)',
                    'CATEGORÍA  (Vaca, Toro, Ternero, Novillo…)',
                    'RAZA',
                    'FECHA DE NACIMIENTO  (YYYY-MM-DD)',
                    'EDAD EN MESES',
                    'PESO ACTUAL (kg)',
                ].map((c, i) => (
                    <View key={i} style={styles.columnRow}>
                        <View style={styles.columnDot} />
                        <Text style={styles.columnTxt}>{c}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BulkImportAnimals() {
    const router = useRouter();
    const {
        step, progress, rows, errorMsg,
        loadedCount, skippedCount, validCount, invalidCount,
        pickAndParse, removeRow, loadToDatabase, reset,
    } = useBulkImportAnimals();

    const renderContent = () => {
        switch (step) {
            case 'idle': return <IdleScreen onPick={pickAndParse} />;
            case 'reading': return <ReadingScreen progress={progress} />;
            case 'preview': return (
                <PreviewScreen
                    rows={rows}
                    validCount={validCount}
                    invalidCount={invalidCount}
                    onRemove={removeRow}
                    onLoad={loadToDatabase}
                    onCancel={reset}
                />
            );
            case 'loading': return <LoadingScreen progress={progress} loaded={loadedCount} skipped={skippedCount} />;
            case 'done': return (
                <DoneScreen
                    loaded={loadedCount}
                    skipped={skippedCount}
                    onGoAnimals={() => router.replace('/views/(tabs)/admin/Ranch/Animals/AnimalMenu' as any)}
                    onImportMore={reset}
                />
            );
            case 'error': return <ErrorScreen msg={errorMsg ?? 'Error desconocido'} onRetry={reset} />;
        }
    };

    const showHeader = step !== 'done';

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {showHeader && (
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => { reset(); router.back(); }}
                        style={styles.backBtn}
                        disabled={step === 'loading' || step === 'reading'}
                    >
                        <Ionicons
                            name="arrow-back" size={28}
                            color={step === 'loading' || step === 'reading' ? Colors.textDisabled : Colors.primary}
                        />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.headerTitle}>Carga Masiva</Text>
                        <Text style={styles.headerSub}>Animales</Text>
                    </View>
                    {/* Indicador de paso */}
                    <View style={styles.stepIndicator}>
                        <Text style={styles.stepText}>
                            {step === 'idle' ? '1/3' :
                                step === 'reading' ? '2/3' :
                                    step === 'preview' ? '2/3' :
                                        step === 'loading' ? '3/3' : ''}
                        </Text>
                    </View>
                </View>
            )}

            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
        backgroundColor: Colors.background, gap: Spacing.md,
    },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    headerTitle: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
    stepIndicator: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8,
    },
    stepText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

    // Center screens (idle, reading, loading, done, error)
    centerScreen: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: Spacing.xl, paddingBottom: 40,
    },
    spinnerWrap: {
        width: 90, height: 90, borderRadius: 24,
        backgroundColor: Colors.primary + '12',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    readingTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
    readingSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    readingHint: { fontSize: 12, color: Colors.textDisabled, textAlign: 'center', marginTop: 16 },
    progressWrap: { width: '100%', alignItems: 'center', gap: 8 },
    progressTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
    progressPct: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    countersRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
    counterItem: { alignItems: 'center' },
    counterValue: { fontSize: 28, fontWeight: '900' },
    counterLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
    errorMsg: { fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },

    // Done
    doneTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8 },
    doneSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    doneStats: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
    statBox: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 2 },
    statNum: { fontSize: 32, fontWeight: '900' },
    statLbl: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
    doneNote: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 18 },

    // Buttons
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, paddingHorizontal: 28, gap: 8,
        width: '100%', marginTop: Spacing.md, ...Shadows.floatingButton,
    },
    primaryBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
        paddingVertical: 14, paddingHorizontal: 24, marginTop: Spacing.sm,
    },
    secondaryBtnTxt: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

    // Idle / upload zone
    uploadZone: {
        width: '100%', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.primary + '40', borderStyle: 'dashed',
        borderRadius: BorderRadius.xl, paddingVertical: Spacing.xl * 1.5,
        marginBottom: Spacing.xl, backgroundColor: Colors.primary + '05',
    },
    uploadTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginTop: 12 },
    uploadSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    columnsBox: { width: '100%', marginTop: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card },
    columnsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    columnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    columnDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },
    columnTxt: { fontSize: 12, color: Colors.textSecondary },

    // Preview
    previewSummary: {
        flexDirection: 'row', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        backgroundColor: Colors.white, ...Shadows.card,
    },
    summaryChip: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.background, borderRadius: BorderRadius.md },
    summaryNum: { fontSize: 22, fontWeight: '900' },
    summaryLbl: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
    warnBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FEF3C7', paddingHorizontal: Spacing.lg, paddingVertical: 10,
    },
    warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
    previewList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    previewRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card,
        borderLeftWidth: 4, borderLeftColor: Colors.success,
    },
    previewRowError: { borderLeftColor: Colors.error },
    previewLeft: { flex: 1 },
    previewCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    previewCode: { fontSize: 16, fontWeight: '800', color: Colors.primary },
    sexBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    sexBadgeTxt: { fontSize: 12, fontWeight: '800' },
    previewClass: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
    previewMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    previewMetaTxt: { fontSize: 11, color: Colors.textDisabled },
    previewDot: { color: Colors.textDisabled, fontSize: 10 },
    errorsWrap: { marginTop: 6 },
    errorLine: { fontSize: 11, color: Colors.error, lineHeight: 18 },
    previewFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
        backgroundColor: Colors.white, ...Shadows.card,
    },
    cancelBtn: {
        flex: 0.35, paddingVertical: 14, borderRadius: BorderRadius.lg,
        borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
    },
    cancelBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
    loadBtn: {
        flex: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 14, gap: 6, ...Shadows.floatingButton,
    },
    loadBtnDisabled: { backgroundColor: Colors.textDisabled },
    loadBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.white },
});