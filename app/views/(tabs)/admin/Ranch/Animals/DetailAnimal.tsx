import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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
import { useAnimalFullHistory } from '../../../../../../hooks/Animals/offline/use-AnimalHistory';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DetailAnimalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();

    const breed = useMemo(() => params.breed ? JSON.parse(params.breed as string) : {}, [params.breed]);
    const status = useMemo(() => params.status ? JSON.parse(params.status as string) : {}, [params.status]);
    const animalId = params.id as string;

    const getBool = (val: any) => val === 'true' || val === true;

    const classification = useMemo(() => classifyAnimal({
        sex: params.sex as string,
        birthdate: params.birthdate as string,
        isCastrated: getBool(params.isCastrated),
        isSterilized: getBool(params.isSterilized),
        hasCalved: getBool(params.hasCalved),
        id_animal_class: params.id_animal_class ? parseInt(params.id_animal_class as string) : undefined,
    }), [params]);

    const { entries, loading: histLoading, refresh } = useAnimalFullHistory(animalId);

    const isOk = status.name === 'OK';
    const statusColor = isOk ? Colors.success : Colors.error;
    const statusBg = isOk ? Colors.successLight : Colors.errorLight;

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

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ficha del Animal</Text>
                <TouchableOpacity onPress={refresh} style={styles.backButton}>
                    <Ionicons name="refresh" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Tarjeta principal ─────────────────────────────── */}
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

                    <Text style={styles.animalCode}>{params.code}</Text>
                    <Text style={styles.breedName}>{breed.name || 'Raza no definida'}</Text>

                    <View style={[styles.classificationBlock, { backgroundColor: classification.backgroundColor, borderColor: classification.color + '40' }]}>
                        <View style={styles.classificationIconWrap}>
                            <Ionicons
                                name={classification.category === 'Ternero' ? 'egg-outline' : classification.category === 'Destetado' ? 'leaf-outline' : 'ribbon-outline'}
                                size={22} color={classification.color}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.classificationCategory, { color: classification.color }]}>{classification.category}</Text>
                            <Text style={[styles.classificationLabel, { color: classification.color }]}>{classification.label}</Text>
                        </View>
                    </View>

                    <View style={styles.quickStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>PESO</Text>
                            <Text style={styles.statValue}>{params.weight} kg</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>SEXO</Text>
                            <Text style={styles.statValue}>{params.sex === 'M' ? '♂ Macho' : '♀ Hembra'}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Genealogía ────────────────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>GENEALOGÍA Y REGISTRO</Text>
                    <InfoRow label="Fecha Nac." value={new Date(params.birthdate as string).toLocaleDateString()} icon="calendar-sharp" />
                    <InfoRow label="ID Madre" value={params.idMother as string} icon="female-sharp" />
                    <InfoRow label="ID Padre" value={params.idFather as string} icon="male-sharp" />
                </View>

                {/* ── Estado reproductivo ───────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>ESTADO REPRODUCTIVO</Text>
                    <InfoRow label="Castrado" value={params.isCastrated} icon="cut-outline" isBool />
                    <InfoRow label="Esterilizado" value={params.isSterilized} icon="medkit-outline" isBool />
                    {params.sex === 'F' && (
                        <InfoRow label="Ha parido" value={params.hasCalved} icon="git-branch-outline" isBool />
                    )}
                </View>

                {/* ── Historial de eventos ──────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>HISTORIAL DE EVENTOS</Text>

                    {histLoading && (
                        <View style={styles.histLoading}>
                            <ActivityIndicator color={Colors.primary} />
                        </View>
                    )}

                    {!histLoading && entries.length === 0 && (
                        <View style={styles.histEmpty}>
                            <Ionicons name="time-outline" size={36} color={Colors.textDisabled} />
                            <Text style={styles.histEmptyText}>Sin eventos registrados</Text>
                        </View>
                    )}

                    {entries.map((entry, idx) => (
                        <View key={entry.id} style={styles.timelineItem}>
                            {/* Línea de tiempo */}
                            <View style={styles.timelineLine}>
                                <View style={[styles.timelineDot, { backgroundColor: entry.color }]}>
                                    <Ionicons name={entry.icon as any} size={12} color={Colors.white} />
                                </View>
                                {idx < entries.length - 1 && <View style={styles.timelineConnector} />}
                            </View>

                            {/* Contenido */}
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
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
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
    scrollContent: { padding: Spacing.lg },

    mainCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadows.card, alignItems: 'center', marginBottom: Spacing.lg },
    badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignSelf: 'stretch', justifyContent: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm },
    categoryBadgeText: { fontSize: 11, fontWeight: '800' },
    breedName: { ...Typography.overline, color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 4 },
    animalCode: { ...Typography.h1, color: Colors.primary, fontSize: 40, fontWeight: '900' },
    classificationBlock: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.md, gap: Spacing.md },
    classificationIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.white + '80', alignItems: 'center', justifyContent: 'center' },
    classificationCategory: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 },
    classificationLabel: { fontSize: 15, fontWeight: '800', marginTop: 1 },
    quickStats: { flexDirection: 'row', marginTop: Spacing.lg, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, width: '100%' },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },
    statLabel: { fontSize: 10, color: Colors.textDisabled, fontWeight: '700' },
    statValue: { fontSize: 16, color: Colors.primary, fontWeight: '800' },

    sectionCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card, marginBottom: Spacing.md },
    sectionHeader: { ...Typography.overline, color: Colors.primary, fontWeight: '900', marginBottom: Spacing.lg, fontSize: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingLeft: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    textContainer: { flex: 1 },
    label: { fontSize: 11, color: Colors.textDisabled, fontWeight: '700', textTransform: 'uppercase' },
    value: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
    booleanTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },

    // Historia
    histLoading: { alignItems: 'center', paddingVertical: Spacing.xl },
    histEmpty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
    histEmptyText: { ...Typography.body, color: Colors.textDisabled },

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
