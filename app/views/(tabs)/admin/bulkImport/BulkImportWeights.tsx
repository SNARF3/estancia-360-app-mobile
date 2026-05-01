// views/BulkImport/BulkImportWeights.tsx
// Carga masiva de registros de peso desde Excel

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Alert,
    Animated, FlatList, Platform, StatusBar,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { useBulkImportWeights, type ValidatedWeightRow } from '../../../../../hooks/Animals/offline/use-BulkImportWeights';

// ─── Barra de progreso ────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.timing(anim, { toValue: pct / 100, duration: 300, useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
}

// ─── Condición corporal → texto ───────────────────────────────────────────────

const BC_LABELS: Record<number, string> = {
    1: 'Muy flaco', 2: 'Flaco', 3: 'Normal', 4: 'Gordo', 5: 'Muy gordo',
};
const BC_COLORS: Record<number, string> = {
    1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#84CC16', 5: '#22C55E',
};

// ─── Pantallas intermedias ────────────────────────────────────────────────────

function ReadingScreen({ progress }: { progress: number }) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="barbell" size={48} color="#F59E0B" />
            </View>
            <Text style={s.readTitle}>Procesando archivo...</Text>
            <Text style={s.readSub}>Buscando animales y validando datos</Text>
            <View style={s.progressWrap}>
                <ProgressBar pct={progress} />
                <Text style={s.progressPct}>{progress}%</Text>
            </View>
        </View>
    );
}

function LoadingScreen({ progress, loaded, skipped }: { progress: number; loaded: number; skipped: number }) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="cloud-upload" size={48} color={Colors.primary} />
            </View>
            <Text style={s.readTitle}>Registrando pesajes...</Text>
            <Text style={s.readSub}>Guardando en la base de datos local</Text>
            <View style={s.progressWrap}>
                <ProgressBar pct={progress} />
                <Text style={s.progressPct}>{progress}%</Text>
            </View>
            <View style={s.countersRow}>
                <View style={s.counterItem}>
                    <Text style={[s.counterValue, { color: Colors.success }]}>{loaded}</Text>
                    <Text style={s.counterLabel}>Cargados</Text>
                </View>
                {skipped > 0 && (
                    <View style={s.counterItem}>
                        <Text style={[s.counterValue, { color: Colors.error }]}>{skipped}</Text>
                        <Text style={s.counterLabel}>Omitidos</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function DoneScreen({ loaded, skipped, onGoAnimals, onImportMore }: {
    loaded: number; skipped: number; onGoAnimals: () => void; onImportMore: () => void;
}) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: Colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            </View>
            <Text style={s.doneTitle}>¡Pesajes registrados!</Text>
            <Text style={s.doneSub}>Los pesos fueron guardados correctamente.</Text>
            <View style={s.doneStats}>
                <View style={[s.statBox, { borderColor: Colors.success }]}>
                    <Text style={[s.statNum, { color: Colors.success }]}>{loaded}</Text>
                    <Text style={s.statLbl}>Cargados</Text>
                </View>
                {skipped > 0 && (
                    <View style={[s.statBox, { borderColor: Colors.error }]}>
                        <Text style={[s.statNum, { color: Colors.error }]}>{skipped}</Text>
                        <Text style={s.statLbl}>Omitidos</Text>
                    </View>
                )}
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={onGoAnimals}>
                <Ionicons name="paw" size={20} color={Colors.white} />
                <Text style={s.primaryBtnTxt}>Ver mis animales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={onImportMore}>
                <Text style={s.secondaryBtnTxt}>Importar más</Text>
            </TouchableOpacity>
        </View>
    );
}

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: Colors.error + '15' }]}>
                <Ionicons name="alert-circle" size={48} color={Colors.error} />
            </View>
            <Text style={s.readTitle}>Error al procesar</Text>
            <Text style={s.errorMsg}>{msg}</Text>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.error }]} onPress={onRetry}>
                <Text style={s.primaryBtnTxt}>Intentar de nuevo</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Fila de previsualización ─────────────────────────────────────────────────

function WeightPreviewRow({ item, onRemove }: { item: ValidatedWeightRow; onRemove: () => void }) {
    const hasErr = item.hasError;
    const bcColor = item.body_condition ? BC_COLORS[item.body_condition] : Colors.textDisabled;
    return (
        <View style={[s.previewRow, hasErr && s.previewRowError]}>
            <View style={s.previewLeft}>
                <View style={s.previewCodeRow}>
                    <Text style={[s.previewCode, hasErr && { color: Colors.error }]}>{item.code}</Text>
                    {!hasErr && (
                        <View style={[s.weightBadge, { backgroundColor: Colors.primary + '15' }]}>
                            <Text style={[s.weightBadgeTxt, { color: Colors.primary }]}>
                                {item.weight} kg
                            </Text>
                        </View>
                    )}
                </View>
                <View style={s.previewMeta}>
                    <Ionicons name="calendar-outline" size={11} color={Colors.textDisabled} />
                    <Text style={s.metaTxt}>{item.event_date}</Text>
                    {item.body_condition !== null && (
                        <>
                            <Text style={s.dot}>·</Text>
                            <View style={[s.bcDot, { backgroundColor: bcColor }]} />
                            <Text style={[s.metaTxt, { color: bcColor }]}>
                                CC {item.body_condition} – {BC_LABELS[item.body_condition]}
                            </Text>
                        </>
                    )}
                </View>
                {item.notes && <Text style={s.noteTxt}>{item.notes}</Text>}
                {hasErr && (
                    <View style={s.errorsWrap}>
                        {item.errors.map((e, i) => <Text key={i} style={s.errorLine}>⚠ {e}</Text>)}
                    </View>
                )}
            </View>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color={hasErr ? Colors.error : Colors.textDisabled} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Previsualización ─────────────────────────────────────────────────────────

function PreviewScreen({ rows, validCount, invalidCount, onRemove, onLoad, onCancel }: {
    rows: ValidatedWeightRow[]; validCount: number; invalidCount: number;
    onRemove: (rowIndex: number) => void; onLoad: () => void; onCancel: () => void;
}) {
    const handleLoad = () => {
        if (validCount === 0) {
            Alert.alert('Sin datos válidos', 'No hay filas válidas para cargar.');
            return;
        }
        if (invalidCount > 0) {
            Alert.alert('Filas con errores',
                `${invalidCount} fila(s) con errores serán omitidas. ¿Cargar las ${validCount} válidas?`,
                [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cargar igual', onPress: onLoad }]
            );
        } else { onLoad(); }
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={s.previewSummary}>
                <View style={s.summaryChip}>
                    <Text style={[s.summaryNum, { color: Colors.success }]}>{validCount}</Text>
                    <Text style={s.summaryLbl}>Válidos</Text>
                </View>
                {invalidCount > 0 && (
                    <View style={s.summaryChip}>
                        <Text style={[s.summaryNum, { color: Colors.error }]}>{invalidCount}</Text>
                        <Text style={s.summaryLbl}>Con errores</Text>
                    </View>
                )}
                <View style={s.summaryChip}>
                    <Text style={[s.summaryNum, { color: Colors.primary }]}>{rows.length}</Text>
                    <Text style={s.summaryLbl}>Total</Text>
                </View>
            </View>

            {invalidCount > 0 && (
                <View style={s.warnBanner}>
                    <Ionicons name="warning-outline" size={16} color="#92400E" />
                    <Text style={s.warnText}>Las filas en rojo serán omitidas. Tocá 🗑 para eliminarlas.</Text>
                </View>
            )}

            <FlatList
                data={rows}
                keyExtractor={r => r.rowIndex.toString()}
                renderItem={({ item }) => (
                    <WeightPreviewRow item={item} onRemove={() => onRemove(item.rowIndex)} />
                )}
                contentContainerStyle={s.previewList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={<View style={{ height: 120 }} />}
            />

            <View style={s.previewFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
                    <Text style={s.cancelBtnTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.loadBtn, validCount === 0 && s.loadBtnDisabled]}
                    onPress={handleLoad}
                    disabled={validCount === 0}
                >
                    <Ionicons name="barbell-outline" size={18} color={Colors.white} />
                    <Text style={s.loadBtnTxt}>REGISTRAR {validCount} PESAJES</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Idle ─────────────────────────────────────────────────────────────────────

function IdleScreen({ onPick }: { onPick: () => void }) {
    return (
        <View style={s.center}>
            <View style={s.uploadZone}>
                <Ionicons name="barbell" size={48} color="#F59E0B" />
                <Text style={s.uploadTitle}>Importar Pesajes</Text>
                <Text style={s.uploadSub}>Formato .xlsx · Plantilla Estancia360</Text>
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#F59E0B' }]} onPress={onPick}>
                <Ionicons name="folder-open-outline" size={20} color={Colors.white} />
                <Text style={s.primaryBtnTxt}>Elegir archivo Excel</Text>
            </TouchableOpacity>
            <View style={s.columnsBox}>
                <Text style={s.columnsTitle}>Columnas requeridas:</Text>
                {['CÓDIGO ANIMAL *', 'FECHA PESAJE *  (DD/MM/YYYY)', 'PESO (KG) *',
                    'CONDICIÓN CORPORAL  (1=muy flaco … 5=muy gordo)', 'OBSERVACIONES'].map((c, i) => (
                        <View key={i} style={s.colRow}>
                            <View style={[s.colDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={s.colTxt}>{c}</Text>
                        </View>
                    ))}
            </View>
        </View>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BulkImportWeights() {
    const router = useRouter();
    const {
        step, progress, rows, errorMsg,
        loadedCount, skippedCount, validCount, invalidCount,
        pickAndParse, removeRow, loadToDatabase, reset,
    } = useBulkImportWeights();

    const blocked = step === 'loading' || step === 'reading';

    const renderContent = () => {
        switch (step) {
            case 'idle': return <IdleScreen onPick={pickAndParse} />;
            case 'reading': return <ReadingScreen progress={progress} />;
            case 'preview': return (
                <PreviewScreen rows={rows} validCount={validCount} invalidCount={invalidCount}
                    onRemove={removeRow} onLoad={loadToDatabase} onCancel={reset} />
            );
            case 'loading': return <LoadingScreen progress={progress} loaded={loadedCount} skipped={skippedCount} />;
            case 'done': return (
                <DoneScreen loaded={loadedCount} skipped={skippedCount}
                    onGoAnimals={() => router.replace('/views/(tabs)/admin/Ranch/Animals/AnimalMenu' as any)}
                    onImportMore={reset} />
            );
            case 'error': return <ErrorScreen msg={errorMsg ?? 'Error desconocido'} onRetry={reset} />;
        }
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
            {step !== 'done' && (
                <View style={s.header}>
                    <TouchableOpacity onPress={() => { reset(); router.replace('/views/(tabs)/admin/bulkImport/bulkImport' as any); }} style={s.backBtn} disabled={blocked}>
                        <Ionicons name="arrow-back" size={28} color={blocked ? Colors.textDisabled : Colors.primary} />
                    </TouchableOpacity>
                    <View style={s.titleWrap}>
                        <Text style={s.headerTitle}>Carga Masiva</Text>
                        <Text style={s.headerSub}>Registros de Pesaje</Text>
                    </View>
                    <View style={[s.stepBadge, { backgroundColor: '#F59E0B20' }]}>
                        <Text style={[s.stepTxt, { color: '#F59E0B' }]}>
                            {step === 'idle' ? '1/3' : step === 'preview' ? '2/3' : step === 'loading' ? '3/3' : ''}
                        </Text>
                    </View>
                </View>
            )}
            <View style={{ flex: 1 }}>{renderContent()}</View>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background, gap: Spacing.md },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    headerTitle: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
    stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    stepTxt: { fontSize: 12, fontWeight: '800' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    iconWrap: { width: 90, height: 90, borderRadius: 24, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
    readTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
    readSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    progressWrap: { width: '100%', alignItems: 'center', gap: 8 },
    progressTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
    progressPct: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    countersRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
    counterItem: { alignItems: 'center' },
    counterValue: { fontSize: 28, fontWeight: '900' },
    counterLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
    errorMsg: { fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },

    doneTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8 },
    doneSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    doneStats: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
    statBox: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 2 },
    statNum: { fontSize: 32, fontWeight: '900' },
    statLbl: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },

    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, paddingHorizontal: 28, gap: 8, width: '100%', marginTop: Spacing.md, ...Shadows.floatingButton },
    primaryBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
    secondaryBtn: { paddingVertical: 14, paddingHorizontal: 24, marginTop: Spacing.sm },
    secondaryBtnTxt: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

    uploadZone: { width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F59E0B40', borderStyle: 'dashed', borderRadius: BorderRadius.xl, paddingVertical: Spacing.xl * 1.5, marginBottom: Spacing.xl, backgroundColor: '#F59E0B05' },
    uploadTitle: { fontSize: 18, fontWeight: '800', color: '#F59E0B', marginTop: 12 },
    uploadSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    columnsBox: { width: '100%', marginTop: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card },
    columnsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    colRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    colDot: { width: 5, height: 5, borderRadius: 3 },
    colTxt: { fontSize: 12, color: Colors.textSecondary },

    previewSummary: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.white, ...Shadows.card },
    summaryChip: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.background, borderRadius: BorderRadius.md },
    summaryNum: { fontSize: 22, fontWeight: '900' },
    summaryLbl: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
    warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: Spacing.lg, paddingVertical: 10 },
    warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
    previewList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

    previewRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
    previewRowError: { borderLeftColor: Colors.error },
    previewLeft: { flex: 1 },
    previewCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    previewCode: { fontSize: 16, fontWeight: '800', color: Colors.primary },
    weightBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    weightBadgeTxt: { fontSize: 12, fontWeight: '800' },
    previewMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    metaTxt: { fontSize: 11, color: Colors.textDisabled },
    dot: { color: Colors.textDisabled, fontSize: 10 },
    bcDot: { width: 8, height: 8, borderRadius: 4 },
    noteTxt: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
    errorsWrap: { marginTop: 6 },
    errorLine: { fontSize: 11, color: Colors.error, lineHeight: 18 },

    previewFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md, backgroundColor: Colors.white, ...Shadows.card },
    cancelBtn: { flex: 0.35, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
    cancelBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
    loadBtn: { flex: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', borderRadius: BorderRadius.lg, paddingVertical: 14, gap: 6, ...Shadows.floatingButton },
    loadBtnDisabled: { backgroundColor: Colors.textDisabled },
    loadBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.white },
});