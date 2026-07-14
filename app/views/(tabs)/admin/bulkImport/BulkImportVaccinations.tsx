import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Alert, Animated, FlatList, StatusBar,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import {
    useBulkImportVaccinations,
    type ValidatedVaccinationRow,
} from '../../../../../hooks/Animals/offline/use-BulkImportVaccinations';

const ACCENT = '#10B981';

function ProgressBar({ pct }: { pct: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.timing(anim, { toValue: pct / 100, duration: 300, useNativeDriver: false }).start();
    }, [pct]);
    return (
        <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, {
                width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: ACCENT,
            }]} />
        </View>
    );
}

function ReadingScreen({ progress }: { progress: number }) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: ACCENT + '18' }]}>
                <Ionicons name="document-text" size={48} color={ACCENT} />
            </View>
            <Text style={s.readTitle}>Procesando archivo...</Text>
            <Text style={s.readSub}>Buscando animales y validando datos</Text>
            <View style={s.progressWrap}><ProgressBar pct={progress} /><Text style={[s.progressPct, { color: ACCENT }]}>{progress}%</Text></View>
        </View>
    );
}

function LoadingScreen({ progress, loaded, skipped }: { progress: number; loaded: number; skipped: number }) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="cloud-upload" size={48} color={Colors.primary} />
            </View>
            <Text style={s.readTitle}>Registrando vacunaciones...</Text>
            <Text style={s.readSub}>Guardando en la base de datos local</Text>
            <View style={s.progressWrap}><ProgressBar pct={progress} /><Text style={[s.progressPct, { color: Colors.primary }]}>{progress}%</Text></View>
            <View style={s.countersRow}>
                <View style={s.counterItem}><Text style={[s.counterVal, { color: Colors.success }]}>{loaded}</Text><Text style={s.counterLbl}>Cargadas</Text></View>
                {skipped > 0 && <View style={s.counterItem}><Text style={[s.counterVal, { color: Colors.error }]}>{skipped}</Text><Text style={s.counterLbl}>Omitidas</Text></View>}
            </View>
        </View>
    );
}

function DoneScreen({ loaded, skipped, onGoBack, onImportMore }: {
    loaded: number; skipped: number; onGoBack: () => void; onImportMore: () => void;
}) {
    return (
        <View style={s.center}>
            <View style={[s.iconWrap, { backgroundColor: Colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            </View>
            <Text style={s.doneTitle}>¡Vacunaciones registradas!</Text>
            <Text style={s.doneSub}>Las vacunaciones fueron guardadas correctamente.</Text>
            <View style={s.doneStats}>
                <View style={[s.statBox, { borderColor: Colors.success }]}>
                    <Text style={[s.statNum, { color: Colors.success }]}>{loaded}</Text>
                    <Text style={s.statLbl}>Cargadas</Text>
                </View>
                {skipped > 0 && <View style={[s.statBox, { borderColor: Colors.error }]}>
                    <Text style={[s.statNum, { color: Colors.error }]}>{skipped}</Text>
                    <Text style={s.statLbl}>Omitidas</Text>
                </View>}
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={onGoBack}>
                <Ionicons name="arrow-back" size={20} color={Colors.white} />
                <Text style={s.primaryBtnTxt}>Volver al menú</Text>
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

function PreviewRow({ item, onRemove }: { item: ValidatedVaccinationRow; onRemove: () => void }) {
    const hasErr = item.hasError;
    return (
        <View style={[s.previewRow, hasErr && s.previewRowError]}>
            <View style={s.previewLeft}>
                <View style={s.previewCodeRow}>
                    <Text style={[s.previewCode, hasErr && { color: Colors.error }]}>{item.animalCode}</Text>
                    {item.vaccineName ? (
                        <Text style={[s.badge, { backgroundColor: ACCENT + '20', color: ACCENT }]}>{item.vaccineName}</Text>
                    ) : null}
                </View>
                <View style={s.previewMeta}>
                    <Ionicons name="calendar-outline" size={11} color={Colors.textDisabled} />
                    <Text style={s.previewMetaTxt}>{item.eventDate}</Text>
                    {item.dose && <><Text style={s.dot}>·</Text><Text style={s.previewMetaTxt}>Dosis: {item.dose}</Text></>}
                    {item.responsible && <><Text style={s.dot}>·</Text><Ionicons name="person-outline" size={11} color={Colors.textDisabled} /><Text style={s.previewMetaTxt}>{item.responsible}</Text></>}
                </View>
                {hasErr && <View style={s.errorsWrap}>{item.errors.map((e, i) => <Text key={i} style={s.errorLine}>⚠ {e}</Text>)}</View>}
            </View>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color={hasErr ? Colors.error : Colors.textDisabled} />
            </TouchableOpacity>
        </View>
    );
}

function PreviewScreen({ rows, validCount, invalidCount, onRemove, onLoad, onCancel }: {
    rows: ValidatedVaccinationRow[]; validCount: number; invalidCount: number;
    onRemove: (i: number) => void; onLoad: () => void; onCancel: () => void;
}) {
    const insets = useSafeAreaInsets();
    const handleLoad = () => {
        if (validCount === 0) { Alert.alert('Sin datos válidos', 'Corregí el archivo e intentá de nuevo.'); return; }
        if (invalidCount > 0) {
            Alert.alert('Filas con errores', `${invalidCount} fila(s) serán omitidas. ¿Cargar las ${validCount} válidas?`,
                [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cargar igual', onPress: onLoad }]);
        } else onLoad();
    };
    return (
        <View style={{ flex: 1 }}>
            <View style={s.previewSummary}>
                <View style={s.summaryChip}><Text style={[s.summaryNum, { color: Colors.success }]}>{validCount}</Text><Text style={s.summaryLbl}>Válidas</Text></View>
                {invalidCount > 0 && <View style={s.summaryChip}><Text style={[s.summaryNum, { color: Colors.error }]}>{invalidCount}</Text><Text style={s.summaryLbl}>Con errores</Text></View>}
                <View style={s.summaryChip}><Text style={[s.summaryNum, { color: Colors.primary }]}>{rows.length}</Text><Text style={s.summaryLbl}>Total</Text></View>
            </View>
            {invalidCount > 0 && (
                <View style={s.warnBanner}>
                    <Ionicons name="warning-outline" size={16} color="#92400E" />
                    <Text style={s.warnText}>Las filas en rojo serán omitidas. Toca 🗑 para eliminarlas.</Text>
                </View>
            )}
            <FlatList
                data={rows}
                keyExtractor={r => r.rowIndex.toString()}
                renderItem={({ item }) => <PreviewRow item={item} onRemove={() => onRemove(item.rowIndex)} />}
                contentContainerStyle={s.previewList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={<View style={{ height: 120 }} />}
            />
            <View style={[s.previewFooter, { paddingBottom: insets.bottom + 8 }]}>
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel}><Text style={s.cancelBtnTxt}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[s.loadBtn, validCount === 0 && s.loadBtnDisabled]} onPress={handleLoad} disabled={validCount === 0}>
                    <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
                    <Text style={s.loadBtnTxt}>CARGAR {validCount} VACUNACIONES</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function IdleScreen({ onPick }: { onPick: () => void }) {
    return (
        <View style={s.center}>
            <View style={s.uploadZone}>
                <Ionicons name="cloud-upload-outline" size={52} color={Colors.primary} />
                <Text style={s.uploadTitle}>Seleccionar archivo Excel</Text>
                <Text style={s.uploadSub}>Formato .xlsx · Plantilla oficial Estancia360</Text>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={onPick}>
                <Ionicons name="folder-open-outline" size={20} color={Colors.white} />
                <Text style={s.primaryBtnTxt}>Elegir archivo</Text>
            </TouchableOpacity>
            <View style={s.columnsBox}>
                <Text style={s.columnsTitle}>Columnas requeridas en la plantilla:</Text>
                {[
                    'CÓDIGO DEL ANIMAL',
                    'FECHA  (DD/MM/YYYY)',
                    'NOMBRE DE VACUNA  (obligatorio)',
                    'DOSIS  (Opcional)',
                    'RESPONSABLE  (Opcional)',
                    'NOTAS  (Opcional)',
                ].map((c, i) => (
                    <View key={i} style={s.columnRow}>
                        <View style={s.columnDot} />
                        <Text style={s.columnTxt}>{c}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function BulkImportVaccinations() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { step, progress, rows, errorMsg, loadedCount, skippedCount, validCount, invalidCount, pickAndParse, removeRow, loadToDatabase, reset } = useBulkImportVaccinations();

    const goBack = () => {
        reset();
        router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
    };

    const STEPS: Record<string, string> = { idle: '1/3', reading: '1/3', preview: '2/3', loading: '3/3' };

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
            {step !== 'done' && (
                <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity onPress={step === 'loading' || step === 'reading' ? undefined : goBack} style={s.backBtn} disabled={step === 'loading' || step === 'reading'}>
                        <Ionicons name="arrow-back" size={28} color={step === 'loading' || step === 'reading' ? Colors.textDisabled : Colors.primary} />
                    </TouchableOpacity>
                    <View style={s.titleWrap}>
                        <Text style={s.headerTitle}>Carga Masiva</Text>
                        <Text style={s.headerSub}>Vacunaciones</Text>
                    </View>
                    {STEPS[step] && <View style={s.stepIndicator}><Text style={s.stepText}>{STEPS[step]}</Text></View>}
                </View>
            )}
            {step === 'idle' && <IdleScreen onPick={pickAndParse} />}
            {step === 'reading' && <ReadingScreen progress={progress} />}
            {step === 'preview' && <PreviewScreen rows={rows} validCount={validCount} invalidCount={invalidCount} onRemove={removeRow} onLoad={loadToDatabase} onCancel={reset} />}
            {step === 'loading' && <LoadingScreen progress={progress} loaded={loadedCount} skipped={skippedCount} />}
            {step === 'done' && <DoneScreen loaded={loadedCount} skipped={skippedCount} onGoBack={goBack} onImportMore={reset} />}
            {step === 'error' && <ErrorScreen msg={errorMsg ?? 'Error desconocido'} onRetry={reset} />}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background, gap: Spacing.md },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    headerTitle: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
    stepIndicator: { backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    stepText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    iconWrap: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
    readTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
    readSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    progressWrap: { width: '100%', alignItems: 'center', gap: 8 },
    progressTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    progressPct: { fontSize: 13, fontWeight: '700' },
    countersRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
    counterItem: { alignItems: 'center' },
    counterVal: { fontSize: 28, fontWeight: '900' },
    counterLbl: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
    errorMsg: { fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },

    doneTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8 },
    doneSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
    doneStats: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
    statBox: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 2 },
    statNum: { fontSize: 32, fontWeight: '900' },
    statLbl: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },

    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryButton, borderRadius: BorderRadius.lg, paddingVertical: 16, paddingHorizontal: 28, gap: 8, width: '100%', marginTop: Spacing.md, ...Shadows.floatingButton },
    primaryBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
    secondaryBtn: { paddingVertical: 14, paddingHorizontal: 24, marginTop: Spacing.sm },
    secondaryBtnTxt: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

    uploadZone: { width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '40', borderStyle: 'dashed', borderRadius: BorderRadius.xl, paddingVertical: Spacing.xl * 1.5, marginBottom: Spacing.xl, backgroundColor: Colors.primary + '05' },
    uploadTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginTop: 12 },
    uploadSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    columnsBox: { width: '100%', marginTop: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card },
    columnsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    columnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    columnDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT },
    columnTxt: { fontSize: 12, color: Colors.textSecondary },

    previewSummary: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.white, ...Shadows.card },
    summaryChip: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.background, borderRadius: BorderRadius.md },
    summaryNum: { fontSize: 22, fontWeight: '900' },
    summaryLbl: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
    warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: Spacing.lg, paddingVertical: 10 },
    warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
    previewList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    previewRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card, borderLeftWidth: 4, borderLeftColor: Colors.success },
    previewRowError: { borderLeftColor: Colors.error },
    previewLeft: { flex: 1 },
    previewCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    previewCode: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
    badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    previewMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    previewMetaTxt: { fontSize: 11, color: Colors.textDisabled },
    dot: { fontSize: 11, color: Colors.textDisabled },
    errorsWrap: { marginTop: 6 },
    errorLine: { fontSize: 11, color: Colors.error, lineHeight: 18 },
    previewFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.white, ...Shadows.card },
    cancelBtn: { flex: 0.35, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
    cancelBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
    loadBtn: { flex: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryButton, borderRadius: BorderRadius.lg, paddingVertical: 14, gap: 6, ...Shadows.floatingButton },
    loadBtnDisabled: { backgroundColor: Colors.textDisabled },
    loadBtnTxt: { fontSize: 12, fontWeight: '800', color: Colors.white },
});
