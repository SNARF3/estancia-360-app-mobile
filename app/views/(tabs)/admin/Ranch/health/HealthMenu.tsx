import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { getSession } from '../../../../../../hooks/auth/use-Auth';
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';
import { useFocusEffect } from 'expo-router';

interface HealthStats {
    vaccinationsThisMonth: number;
    activeTreatments: number;
    openIncidents: number;
    animalsInWithdrawal: number;
}

const INITIAL_STATS: HealthStats = {
    vaccinationsThisMonth: 0,
    activeTreatments: 0,
    openIncidents: 0,
    animalsInWithdrawal: 0,
};

export default function HealthMenu() {
    const router = useRouter();
    const [stats, setStats] = useState<HealthStats>(INITIAL_STATS);
    const [refreshing, setRefreshing] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            const session = await getSession();
            if (!session) return;
            const db = await getDb();
            const today = new Date().toISOString().split('T')[0];
            const monthStart = today.slice(0, 7) + '-01';

            const [vacc, treat, incidents, withdrawal] = await Promise.all([
                db.getFirstAsync<{ count: number }>(
                    `SELECT COUNT(*) as count FROM vaccinations v
                     JOIN animal_events ae ON ae.id = v.id_event
                     JOIN ranch_animals ra ON ra.id = ae.id_ranch_animal
                     WHERE ra.id_ranch = ? AND ae.event_date >= ?`,
                    [session.id_ranch, monthStart]
                ),
                db.getFirstAsync<{ count: number }>(
                    `SELECT COUNT(DISTINCT ae.id_ranch_animal) as count FROM treatments t
                     JOIN animal_events ae ON ae.id = t.id_event
                     JOIN ranch_animals ra ON ra.id = ae.id_ranch_animal
                     WHERE ra.id_ranch = ?
                       AND (julianday(ae.event_date, '+' || COALESCE(t.duration_days,1) || ' days') >= julianday('now'))`,
                    [session.id_ranch]
                ),
                db.getFirstAsync<{ count: number }>(
                    `SELECT COUNT(*) as count FROM health_incidents hi
                     JOIN animal_events ae ON ae.id = hi.id_event
                     JOIN ranch_animals ra ON ra.id = ae.id_ranch_animal
                     WHERE ra.id_ranch = ?`,
                    [session.id_ranch]
                ),
                db.getFirstAsync<{ count: number }>(
                    `SELECT COUNT(DISTINCT ae.id_ranch_animal) as count FROM treatments t
                     JOIN animal_events ae ON ae.id = t.id_event
                     JOIN ranch_animals ra ON ra.id = ae.id_ranch_animal
                     WHERE ra.id_ranch = ?
                       AND t.withdrawal_end_date IS NOT NULL
                       AND t.withdrawal_end_date >= ?`,
                    [session.id_ranch, today]
                ),
            ]);

            setStats({
                vaccinationsThisMonth: vacc?.count ?? 0,
                activeTreatments: treat?.count ?? 0,
                openIncidents: incidents?.count ?? 0,
                animalsInWithdrawal: withdrawal?.count ?? 0,
            });
        } catch { /* offline silencioso */ }
    }, []);

    useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    const statCards = [
        { label: 'Vacunaciones\neste mes', value: stats.vaccinationsThisMonth, icon: 'shield-checkmark', color: '#10B981' },
        { label: 'Tratamientos\nactivos', value: stats.activeTreatments, icon: 'medkit', color: '#3B82F6' },
        { label: 'Incidentes\nregistrados', value: stats.openIncidents, icon: 'warning', color: '#F59E0B' },
        { label: 'En período\nde retiro', value: stats.animalsInWithdrawal, icon: 'time', color: '#EF4444' },
    ];

    const actions = [
        { label: 'Registrar Vacunación', icon: 'shield-checkmark', color: '#10B981', route: '/views/(tabs)/admin/Ranch/health/VaccinationForm' },
        { label: 'Registrar Tratamiento', icon: 'medkit', color: '#3B82F6', route: '/views/(tabs)/admin/Ranch/health/TreatmentForm' },
        { label: 'Registrar Incidente', icon: 'warning', color: '#F59E0B', route: '/views/(tabs)/admin/Ranch/health/HealthIncidentForm' },
    ];

    return (
        <ScreenContainer scrollable={false} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/views/(tabs)/admin/management/Management' as any)}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Sanidad</Text>
                    <Text style={styles.subtitle}>Control sanitario del rodeo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="heart-circle" size={24} color="#10B981" />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.statsGrid}>
                    {statCards.map((s, i) => (
                        <View key={i} style={[styles.statCard, { borderLeftColor: s.color }]}>
                            <Ionicons name={s.icon as any} size={24} color={s.color} />
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Acciones rápidas</Text>

                {actions.map((action, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.actionCard, { borderLeftColor: action.color, borderLeftWidth: 4 }]}
                        onPress={() => router.push(action.route as any)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                            <Ionicons name={action.icon as any} size={22} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                ))}

                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTextContainer: { flex: 1 },
    title: { fontFamily: Typography.fontPrimary, fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
    subtitle: { fontFamily: Typography.fontSecondary, fontSize: 13, color: Colors.textSecondary },
    headerIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    statCard: {
        flex: 1, minWidth: '45%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderLeftWidth: 4, alignItems: 'center', gap: 4,
        ...Shadows.card,
    },
    statValue: { fontFamily: Typography.fontPrimary, fontSize: 28, fontWeight: '700' },
    statLabel: { fontFamily: Typography.fontSecondary, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
    sectionTitle: { fontFamily: Typography.fontPrimary, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
    actionCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
        gap: Spacing.md, ...Shadows.card,
    },
    actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontFamily: Typography.fontPrimary, fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
});
