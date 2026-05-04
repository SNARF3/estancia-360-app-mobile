import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { getSession } from '../../../../../../hooks/auth/use-Auth';
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';

interface FatteningStats {
  total: number;
  avgWeight: number | null;
  feedRecordsLast7: number;
}

export default function FatteningMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<FatteningStats>({ total: 0, avgWeight: null, feedRecordsLast7: 0 });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const session = await getSession();
          if (!session) return;
          const db = await getDb();

          const aRow = await db.getFirstAsync<{ total: number; avg_w: number | null }>(
            `SELECT COUNT(*) AS total, ROUND(AVG(weight), 1) AS avg_w
             FROM ranch_animals
             WHERE id_ranch = ? AND id_productive_status = 3 AND id_status = 1`,
            [session.id_ranch]
          );

          const feedRow = await db.getFirstAsync<{ cnt: number }>(
            `SELECT COUNT(*) AS cnt FROM feed_records fr
             JOIN ranch_lots rl ON rl.id = fr.id_lot
             WHERE rl.id_ranch = ?
               AND fr.feed_date >= date('now', '-7 days')`,
            [session.id_ranch]
          );

          setStats({
            total: aRow?.total ?? 0,
            avgWeight: aRow?.avg_w ?? null,
            feedRecordsLast7: feedRow?.cnt ?? 0,
          });
        } catch {}
      })();
    }, [])
  );

  const actions = [
    {
      icon: 'arrow-forward-circle',
      label: 'Ingresar Animal a Engorde',
      description: 'Mover un animal de Recría a Engorde',
      color: '#F59E0B',
      route: '/views/(tabs)/admin/Ranch/fattening/FatteningEntryForm',
    },
    {
      icon: 'scale',
      label: 'Registrar Pesaje',
      description: 'Control de peso individual',
      color: '#3B82F6',
      route: '/views/(tabs)/admin/Ranch/rearing/WeightRecordForm',
    },
    {
      icon: 'leaf',
      label: 'Registrar Alimentación',
      description: 'Registro de alimentación por lote',
      color: '#059669',
      route: '/views/(tabs)/admin/Ranch/fattening/FeedRecordForm',
    },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/views/(tabs)/admin/management/Management' as any)}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Engorde</Text>
          <Text style={styles.subtitle}>Terminación y salida comercial</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="trending-up" size={22} color="#F59E0B" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard label="En Engorde" value={`${stats.total}`} icon="paw" color="#F59E0B" />
          <StatCard
            label="Peso Prom."
            value={stats.avgWeight != null ? `${stats.avgWeight} kg` : '—'}
            icon="scale"
            color="#059669"
          />
          <StatCard
            label="Alimentaciones (7d)"
            value={`${stats.feedRecordsLast7}`}
            icon="leaf"
            color="#3B82F6"
          />
        </View>

        <Text style={styles.sectionLabel}>Acciones</Text>
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionCard}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color + '20' }]}>
              <Ionicons name={a.icon as any} size={24} color={a.color} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionDesc}>{a.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 6, marginRight: Spacing.sm },
  headerText: { flex: 1 },
  title: { fontFamily: Typography.fontPrimary, fontSize: 22, fontWeight: '800', color: Colors.primary },
  subtitle: { fontFamily: Typography.fontSecondary, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.tabBar,
  },
  statValue: { fontFamily: Typography.fontPrimary, fontSize: 16, fontWeight: '700' },
  statLabel: { fontFamily: Typography.fontSecondary, fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  sectionLabel: {
    fontFamily: Typography.fontPrimary,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.tabBar,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  actionText: { flex: 1 },
  actionLabel: { fontFamily: Typography.fontPrimary, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  actionDesc: { fontFamily: Typography.fontSecondary, fontSize: 12, color: Colors.textSecondary },
});
