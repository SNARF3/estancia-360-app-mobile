import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';
import { getSession } from '../../../../../../hooks/auth/use-Auth';

interface Stats {
    transfers: number;
    sales: number;
    purchases: number;
    exits: number;
}

function useMovimientosStats() {
    const [stats, setStats] = useState<Stats>({ transfers: 0, sales: 0, purchases: 0, exits: 0 });

    useEffect(() => {
        (async () => {
            try {
                const session = await getSession();
                if (!session) return;
                const db = await getDb();
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const since = startOfMonth.toISOString();

                const [t, s, p, e] = await Promise.all([
                    db.getFirstAsync<{ count: number }>(
                        `SELECT COUNT(*) as count FROM animal_transfers at2
                         JOIN animal_events ae ON ae.id = at2.id_event
                         WHERE ae.id_ranch_animal IN (SELECT id FROM ranch_animals WHERE id_ranch = ?)
                         AND at2.created_at >= ?`, [session.id_ranch, since]),
                    db.getFirstAsync<{ count: number }>(
                        `SELECT COUNT(*) as count FROM animal_sales asal
                         JOIN animal_events ae ON ae.id = asal.id_event
                         WHERE ae.id_ranch_animal IN (SELECT id FROM ranch_animals WHERE id_ranch = ?)
                         AND asal.created_at >= ?`, [session.id_ranch, since]),
                    db.getFirstAsync<{ count: number }>(
                        `SELECT COUNT(*) as count FROM animal_purchases ap
                         JOIN animal_events ae ON ae.id = ap.id_event
                         WHERE ae.id_ranch_animal IN (SELECT id FROM ranch_animals WHERE id_ranch = ?)
                         AND ap.created_at >= ?`, [session.id_ranch, since]),
                    db.getFirstAsync<{ count: number }>(
                        `SELECT COUNT(*) as count FROM animal_exits aex
                         JOIN animal_events ae ON ae.id = aex.id_event
                         WHERE ae.id_ranch_animal IN (SELECT id FROM ranch_animals WHERE id_ranch = ?)
                         AND aex.created_at >= ?`, [session.id_ranch, since]),
                ]);

                setStats({
                    transfers: t?.count ?? 0,
                    sales: s?.count ?? 0,
                    purchases: p?.count ?? 0,
                    exits: e?.count ?? 0,
                });
            } catch (err) {
                console.warn('[MovimientosMenu] stats error:', err);
            }
        })();
    }, []);

    return stats;
}

export default function MovimientosMenu() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const stats = useMovimientosStats();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/views/(tabs)/admin/management/Management')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={26} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Movimientos</Text>
                    <Text style={styles.subtitle}>Traslados, ventas y bajas</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="swap-horizontal" size={22} color={Colors.primary} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>ESTE MES</Text>
                <View style={styles.statsRow}>
                    {[
                        { label: 'Traslados', value: stats.transfers, color: Colors.primary },
                        { label: 'Ventas', value: stats.sales, color: Colors.success },
                        { label: 'Compras', value: stats.purchases, color: '#8B5CF6' },
                        { label: 'Bajas', value: stats.exits, color: Colors.error },
                    ].map(item => (
                        <View key={item.label} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                            <Text style={styles.statLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>REGISTRAR</Text>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/views/(tabs)/admin/Ranch/movements/TransferForm' as any)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '15' }]}>
                        <Ionicons name="swap-horizontal" size={28} color={Colors.primary} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Traslado</Text>
                        <Text style={styles.actionSub}>Mover animal entre lotes o potreros</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/views/(tabs)/admin/Ranch/movements/SaleForm' as any)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
                        <Ionicons name="cash-outline" size={28} color={Colors.success} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Venta</Text>
                        <Text style={styles.actionSub}>Registrar venta de un animal</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/views/(tabs)/admin/Ranch/movements/PurchaseForm' as any)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#8B5CF615' }]}>
                        <Ionicons name="cart-outline" size={28} color="#8B5CF6" />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Compra</Text>
                        <Text style={styles.actionSub}>Registrar compra de un animal existente</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/views/(tabs)/admin/Ranch/movements/AnimalExitForm' as any)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionIcon, { backgroundColor: Colors.error + '15' }]}>
                        <Ionicons name="close-circle-outline" size={28} color={Colors.error} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Baja</Text>
                        <Text style={styles.actionSub}>Muerte, descarte o pérdida</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: Colors.border ?? '#E5E7EB',
    },
    backBtn: { marginRight: Spacing.md },
    headerText: { flex: 1 },
    title: {
        fontSize: 20, fontWeight: '700', color: Colors.textPrimary,
        fontFamily: Typography.fontPrimary,
    },
    subtitle: {
        fontSize: 12, color: Colors.textSecondary, marginTop: 2,
        fontFamily: Typography.fontSecondary,
    },
    headerIcon: {
        width: 42, height: 42, borderRadius: BorderRadius.full ?? 21,
        justifyContent: 'center', alignItems: 'center',
    },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    sectionLabel: {
        fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
        letterSpacing: 0.6, marginBottom: Spacing.sm,
        fontFamily: Typography.fontPrimary,
    },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
    statCard: {
        flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md,
        paddingVertical: 12, alignItems: 'center', ...Shadows.card,
    },
    statValue: { fontSize: 20, fontWeight: '800', fontFamily: Typography.fontPrimary },
    statLabel: {
        fontSize: 10, color: Colors.textSecondary, marginTop: 2,
        fontFamily: Typography.fontSecondary,
    },
    actionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card,
        gap: Spacing.md,
    },
    actionIcon: {
        width: 52, height: 52, borderRadius: BorderRadius.md,
        justifyContent: 'center', alignItems: 'center',
    },
    actionText: { flex: 1 },
    actionTitle: {
        fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
        fontFamily: Typography.fontPrimary,
    },
    actionSub: {
        fontSize: 12, color: Colors.textSecondary, marginTop: 2,
        fontFamily: Typography.fontSecondary,
    },
});
