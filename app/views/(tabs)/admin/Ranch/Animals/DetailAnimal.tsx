import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { classifyAnimal } from '../../../../../../hooks/Animals/offline/use-AnimalClassification';
import { TimelineEntry, useAnimalFullHistory } from '../../../../../../hooks/Animals/offline/use-AnimalHistory';
import { useAnimalWeightSeries } from '../../../../../../hooks/Animals/offline/use-AnimalWeightSeries';
import { AnimalCurrentLot, getAnimalCurrentLot } from '../../../../../../hooks/db.sqlite/repositories/animals';
import { useLotFeedHistory } from '../../../../../../hooks/feeding/use-LotFeedHistory';
import { useSafeRouter } from '../../../../../../hooks/navigation/use-SafeRouter';

const SANIDAD_LABELS = ['Vacunación', 'Tratamiento', 'Incidente'];

type Tab = 'resumen' | 'pesos' | 'alimentacion' | 'sanidad' | 'mas';

const TABS: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'pesos', label: 'Pesos' },
    { key: 'alimentacion', label: 'Alim.' },
    { key: 'sanidad', label: 'Sanidad' },
    { key: 'mas', label: 'Más' },
];

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtKg = (n: number | null) => (n != null ? `${n.toFixed(1)} kg` : '—');
const fmtGmd = (n: number | null) => (n != null ? `${n.toFixed(2)} kg/día` : '—');

function formatAge(birthdate: string): string {
    const start = new Date(birthdate);
    if (isNaN(start.getTime())) return '—';
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 1) {
        const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return `${days} día${days === 1 ? '' : 's'}`;
    }
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years === 0) return `${remMonths} mes${remMonths === 1 ? '' : 'es'}`;
    if (remMonths === 0) return `${years} año${years === 1 ? '' : 's'}`;
    return `${years} año${years === 1 ? '' : 's'} ${remMonths} mes${remMonths === 1 ? '' : 'es'}`;
}

export default function DetailAnimalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const safeRouter = useSafeRouter();
    const params = useLocalSearchParams();
    const [tab, setTab] = useState<Tab>('resumen');
    const [showAllEvents, setShowAllEvents] = useState(false);

    const breed = useMemo(() => params.breed ? JSON.parse(params.breed as string) : {}, [params.breed]);
    const status = useMemo(() => params.status ? JSON.parse(params.status as string) : {}, [params.status]);
    const animalId = params.id as string;
    const animalCode = params.code as string;

    const getBool = (val: any) => val === 'true' || val === true;

    const classification = useMemo(() => classifyAnimal({
        sex: params.sex as string,
        birthdate: params.birthdate as string,
        isCastrated: getBool(params.isCastrated),
        isSterilized: getBool(params.isSterilized),
        hasCalved: getBool(params.hasCalved),
        id_animal_class: params.id_animal_class ? parseInt(params.id_animal_class as string) : undefined,
    }), [params]);

    const { entries, loading: histLoading, refresh: refreshHistory } = useAnimalFullHistory(animalId);
    const registeredWeight = params.weight ? parseFloat(params.weight as string) : undefined;
    const { series: weightSeries, stats: weightStats, loading: weightLoading, refresh: refreshWeights } =
        useAnimalWeightSeries(animalId, registeredWeight);

    const [currentLot, setCurrentLot] = useState<AnimalCurrentLot | null>(null);
    const [lotLoading, setLotLoading] = useState(true);

    const loadLot = async () => {
        setLotLoading(true);
        try {
            const lot = await getAnimalCurrentLot(animalId);
            setCurrentLot(lot);
        } catch (e) {
            console.error('DetailAnimal loadLot:', e);
        } finally {
            setLotLoading(false);
        }
    };

    useEffect(() => { if (animalId) loadLot(); }, [animalId]);

    const { records: feedRecords, loading: feedLoading, refresh: refreshFeed } = useLotFeedHistory(currentLot?.id_lot);

    const refreshAll = () => {
        refreshHistory();
        refreshWeights();
        loadLot();
        refreshFeed();
    };

    const isOk = status.name === 'OK';
    const statusColor = isOk ? Colors.success : Colors.error;
    const statusBg = isOk ? Colors.successLight : Colors.errorLight;

    const sanidadEntries = useMemo(
        () => entries.filter(e => SANIDAD_LABELS.includes(e.label)),
        [entries]
    );
    const visibleEvents = showAllEvents ? entries : entries.slice(0, 5);

    const goTo = (route: string, extraParams?: Record<string, string>) => {
        safeRouter.push({ pathname: route as any, params: { animalCode, ...extraParams } });
    };

    const InfoRow = ({ label, value, icon, isBool = false }: { label: string; value: any; icon: any; isBool?: boolean }) => (
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                {isBool ? (
                    <View style={[styles.booleanTag, { backgroundColor: getBool(value) ? Colors.successLight : Colors.errorLight }]}>
                        <Text style={{ color: getBool(value) ? Colors.success : Colors.error, fontSize: 12, fontWeight: '800' }}>
                            {getBool(value) ? 'SÍ' : 'NO'}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.value}>{value || 'No registrado'}</Text>
                )}
            </View>
        </View>
    );

    const TimelineList = ({ list, emptyText }: { list: TimelineEntry[]; emptyText: string }) => (
        <>
            {histLoading && (
                <View style={styles.histLoading}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            )}
            {!histLoading && list.length === 0 && (
                <View style={styles.histEmpty}>
                    <Ionicons name="time-outline" size={36} color={Colors.textDisabled} />
                    <Text style={styles.histEmptyText}>{emptyText}</Text>
                </View>
            )}
            {list.map((entry, idx) => (
                <View key={entry.id} style={styles.timelineItem}>
                    <View style={styles.timelineLine}>
                        <View style={[styles.timelineDot, { backgroundColor: entry.color }]}>
                            <Ionicons name={entry.icon as any} size={12} color={Colors.white} />
                        </View>
                        {idx < list.length - 1 && <View style={styles.timelineConnector} />}
                    </View>
                    <View style={[styles.timelineCard, { borderLeftColor: entry.color }]}>
                        <View style={styles.timelineCardHeader}>
                            <View style={[styles.timelineLabelBadge, { backgroundColor: entry.color + '18' }]}>
                                <Text style={[styles.timelineLabelText, { color: entry.color }]}>{entry.label.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.timelineDate}>{fmtDate(entry.event_date)}</Text>
                            {entry.is_synced === 0 && <View style={styles.pendingDot} />}
                        </View>
                        <Text style={styles.timelineSummary}>{entry.summary}</Text>
                        {entry.details.map((d, i) => (
                            <Text key={i} style={styles.timelineDetail}>{d}</Text>
                        ))}
                    </View>
                </View>
            ))}
        </>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ficha del Animal</Text>
                <TouchableOpacity onPress={refreshAll} style={styles.backButton}>
                    <Ionicons name="refresh" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* ── Tarjeta principal (identidad, siempre visible) ─────── */}
            <View style={styles.identityWrap}>
                <View style={styles.mainCard}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status.name || 'S/E'}</Text>
                        </View>
                        <View style={[styles.categoryBadge, { backgroundColor: classification.backgroundColor }]}>
                            <Text style={[styles.categoryBadgeText, { color: classification.color }]}>
                                {classification.category.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.animalCode}>{animalCode}</Text>
                    <Text style={styles.breedName}>
                        {breed.name || 'Raza no definida'} · {formatAge(params.birthdate as string)}
                    </Text>
                </View>
            </View>

            {/* ── Navegación por secciones ────────────────────────────── */}
            <View style={styles.tabRow}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                        onPress={() => setTab(t.key)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {tab === 'resumen' && (
                    <>
                        {/* KPIs */}
                        <View style={styles.kpiRow}>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiLabel}>PESO ACTUAL</Text>
                                <Text style={styles.kpiValue}>{fmtKg(weightStats.currentWeight)}</Text>
                            </View>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiLabel}>GMD (30 DÍAS)</Text>
                                <Text style={styles.kpiValue}>{fmtGmd(weightStats.gmd30)}</Text>
                            </View>
                            <View style={styles.kpiCard}>
                                <Text style={styles.kpiLabel}>GANANCIA TOTAL</Text>
                                <Text style={styles.kpiValue}>
                                    {weightStats.totalGain != null ? `+${weightStats.totalGain.toFixed(1)} kg` : '—'}
                                </Text>
                            </View>
                        </View>

                        {/* Lote actual */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionHeader}>LOTE ACTUAL</Text>
                            {lotLoading ? (
                                <ActivityIndicator color={Colors.primary} />
                            ) : currentLot ? (
                                <View style={styles.lotRow}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="albums-outline" size={18} color={Colors.primary} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.value}>{currentLot.lot_name}</Text>
                                        <Text style={styles.label}>{currentLot.pasture_name}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.emptyInline}>Sin lote asignado</Text>
                            )}
                        </View>

                        {/* Último peso */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionHeader}>ÚLTIMO PESO REGISTRADO</Text>
                            {weightLoading ? (
                                <ActivityIndicator color={Colors.primary} />
                            ) : weightStats.currentWeightDate ? (
                                <View style={styles.lastWeightRow}>
                                    <View>
                                        <Text style={styles.lastWeightValue}>{fmtKg(weightStats.currentWeight)}</Text>
                                        <Text style={styles.label}>{fmtDate(weightStats.currentWeightDate)}</Text>
                                    </View>
                                    {weightStats.weightDelta != null && (
                                        <View style={[styles.deltaBadge, { backgroundColor: weightStats.weightDelta >= 0 ? Colors.successLight : Colors.errorLight }]}>
                                            <Text style={{ color: weightStats.weightDelta >= 0 ? Colors.success : Colors.error, fontWeight: '800', fontSize: 13 }}>
                                                {weightStats.weightDelta >= 0 ? '+' : ''}{weightStats.weightDelta.toFixed(1)} kg
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text style={styles.emptyInline}>Sin pesajes registrados</Text>
                            )}
                        </View>

                        {/* Eventos recientes */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionHeader}>EVENTOS RECIENTES</Text>
                                {entries.length > 5 && (
                                    <TouchableOpacity onPress={() => setShowAllEvents(v => !v)}>
                                        <Text style={styles.verTodos}>{showAllEvents ? 'Ver menos' : 'Ver todos'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TimelineList list={visibleEvents} emptyText="Sin eventos registrados" />
                        </View>

                        {/* Acciones rápidas */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionHeader}>ACCIONES RÁPIDAS</Text>
                            <View style={styles.quickActions}>
                                <QuickAction icon="scale-outline" label="Registrar peso"
                                    onPress={() => goTo('/views/(tabs)/admin/Ranch/rearing/WeightRecordForm')} />
                                <QuickAction icon="restaurant-outline" label="Alimentación"
                                    onPress={() => setTab('alimentacion')} />
                                <QuickAction icon="swap-horizontal-outline" label="Movimiento"
                                    onPress={() => goTo('/views/(tabs)/admin/Ranch/movements/TransferForm')} />
                                <QuickAction icon="shield-checkmark-outline" label="Sanidad"
                                    onPress={() => setTab('sanidad')} />
                                <QuickAction icon="cash-outline" label="Venta"
                                    onPress={() => goTo('/views/(tabs)/admin/Ranch/movements/SaleForm')} />
                                <QuickAction icon="ellipsis-horizontal" label="Más"
                                    onPress={() => setTab('mas')} />
                            </View>
                        </View>
                    </>
                )}

                {tab === 'pesos' && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeader}>HISTORIAL DE PESOS</Text>
                        {weightLoading ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : weightSeries.length === 0 ? (
                            <Text style={styles.emptyInline}>Sin pesajes registrados</Text>
                        ) : (
                            [...weightSeries].reverse().map((w) => (
                                <View key={w.id} style={styles.weightRow}>
                                    <View>
                                        <Text style={styles.value}>{fmtKg(w.weight)}</Text>
                                        <Text style={styles.label}>{fmtDate(w.event_date)}</Text>
                                    </View>
                                    <Text style={styles.weightMeta}>
                                        {w.weight_type === 'scale' ? 'Báscula' : 'Estimado'}
                                        {w.body_condition ? ` · CC ${w.body_condition}/5` : ''}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {tab === 'alimentacion' && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeader}>ALIMENTACIÓN DEL LOTE ACTUAL</Text>
                        {!currentLot ? (
                            <View style={styles.histEmpty}>
                                <Ionicons name="restaurant-outline" size={36} color={Colors.textDisabled} />
                                <Text style={styles.histEmptyText}>El animal no tiene lote asignado</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.emptyInline}>
                                    La alimentación se registra por lote — se muestra el historial de {currentLot.lot_name}
                                </Text>
                                {feedLoading ? (
                                    <ActivityIndicator color={Colors.primary} />
                                ) : feedRecords.length === 0 ? (
                                    <View style={styles.histEmpty}>
                                        <Ionicons name="restaurant-outline" size={36} color={Colors.textDisabled} />
                                        <Text style={styles.histEmptyText}>Sin registros de alimentación para este lote</Text>
                                    </View>
                                ) : (
                                    feedRecords.map((r) => (
                                        <View key={r.id} style={styles.weightRow}>
                                            <View>
                                                <Text style={styles.value}>{r.feed_type}</Text>
                                                <Text style={styles.label}>{fmtDate(r.feed_date)}</Text>
                                            </View>
                                            <Text style={styles.weightMeta}>
                                                {r.quantity != null ? `${r.quantity}${r.unit ? ` ${r.unit}` : ''}` : ''}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </>
                        )}
                    </View>
                )}

                {tab === 'sanidad' && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeader}>HISTORIAL DE SANIDAD</Text>
                        <TimelineList list={sanidadEntries} emptyText="Sin eventos de sanidad registrados" />
                    </View>
                )}

                {tab === 'mas' && (
                    <>
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionHeader}>GENEALOGÍA Y REGISTRO</Text>
                            <InfoRow label="Fecha Nac." value={new Date(params.birthdate as string).toLocaleDateString()} icon="calendar-sharp" />
                            <InfoRow label="ID Madre" value={params.idMother as string} icon="female-sharp" />
                            <InfoRow label="ID Padre" value={params.idFather as string} icon="male-sharp" />
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionHeader}>ESTADO REPRODUCTIVO</Text>
                            <InfoRow label="Castrado" value={params.isCastrated} icon="cut-outline" isBool />
                            <InfoRow label="Esterilizado" value={params.isSterilized} icon="medkit-outline" isBool />
                            {params.sex === 'F' && (
                                <InfoRow label="Ha parido" value={params.hasCalved} icon="git-branch-outline" isBool />
                            )}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.quickActionBtn} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.quickActionIcon}>
                <Ionicons name={icon} size={22} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
    },
    backButton: { padding: 5 },
    headerTitle: { ...Typography.h3, color: Colors.primary, fontWeight: '800' },
    scrollContent: { padding: Spacing.lg, paddingTop: Spacing.md },

    identityWrap: { paddingHorizontal: Spacing.lg },
    mainCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.card, alignItems: 'center' },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignSelf: 'stretch', justifyContent: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm },
    categoryBadgeText: { fontSize: 11, fontWeight: '800' },
    breedName: { ...Typography.overline, color: Colors.textSecondary, letterSpacing: 1, marginTop: 4, textTransform: 'none' },
    animalCode: { ...Typography.h1, color: Colors.primary, fontSize: 34, fontWeight: '900' },

    tabRow: {
        flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
        padding: 4, marginHorizontal: Spacing.lg, marginTop: Spacing.md, ...Shadows.tabBar,
    },
    tabBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md },
    tabBtnActive: { backgroundColor: Colors.primary },
    tabBtnText: { fontFamily: Typography.fontSecondary, fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
    tabBtnTextActive: { color: Colors.white },

    kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    kpiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadows.card },
    kpiLabel: { fontSize: 9, color: Colors.textDisabled, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
    kpiValue: { fontSize: 15, color: Colors.primary, fontWeight: '800', textAlign: 'center' },

    sectionCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card, marginBottom: Spacing.md },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    sectionHeader: { ...Typography.overline, color: Colors.primary, fontWeight: '900', marginBottom: Spacing.lg, fontSize: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingLeft: 10 },
    verTodos: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    textContainer: { flex: 1 },
    label: { fontSize: 11, color: Colors.textDisabled, fontWeight: '700', textTransform: 'uppercase' },
    value: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
    booleanTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
    emptyInline: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center', paddingVertical: Spacing.sm },

    lotRow: { flexDirection: 'row', alignItems: 'center' },
    lastWeightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastWeightValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    deltaBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm },

    weightRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    weightMeta: { fontSize: 12, color: Colors.textSecondary },

    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    quickActionBtn: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
    quickActionIcon: {
        width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.primary + '12',
        alignItems: 'center', justifyContent: 'center',
    },
    quickActionLabel: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },

    // Historial
    histLoading: { alignItems: 'center', paddingVertical: Spacing.xl },
    histEmpty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
    histEmptyText: { ...Typography.body, color: Colors.textDisabled, textAlign: 'center' },

    timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
    timelineLine: { alignItems: 'center', marginRight: Spacing.md, width: 28 },
    timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    timelineConnector: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
    timelineCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderLeftWidth: 3 },
    timelineCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
    timelineLabelBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    timelineLabelText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    timelineDate: { flex: 1, fontSize: 11, color: Colors.textSecondary, textAlign: 'right' },
    pendingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F59E0B' },
    timelineSummary: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    timelineDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
});
