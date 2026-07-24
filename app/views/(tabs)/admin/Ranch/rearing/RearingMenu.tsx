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
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';
import { getSession } from '../../../../../../hooks/auth/use-Auth';

interface RearingStats {
  total: number;
  avgWeight: number | null;
  withoutWeigh: number;
}

export default function RearingMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<RearingStats>({ total: 0, avgWeight: null, withoutWeigh: 0 });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const session = await getSession();
          if (!session) return;
          const db = await getDb();
          const row = await db.getFirstAsync<{ total: number; avg_w: number | null; no_weight: number }>(
            `SELECT
              COUNT(*) AS total,
              ROUND(AVG(weight), 1) AS avg_w,
              SUM(CASE WHEN weight IS NULL THEN 1 ELSE 0 END) AS no_weight
             FROM ranch_animals
             WHERE id_ranch = ? AND id_productive_status = 2 AND id_status = 1`,
            [session.id_ranch]
          );
          setStats({
            total: row?.total ?? 0,
            avgWeight: row?.avg_w ?? null,
            withoutWeigh: row?.no_weight ?? 0,
          });
        } catch {}
      })();
    }, [])
  );

  const actions = [
    {
      icon: 'scale',
      label: 'Registrar Pesaje',
      description: 'Pesar un animal individualmente',
      color: '#3B82F6',
      route: '/views/(tabs)/admin/Ranch/rearing/WeightRecordForm',
    },
    {
      icon: 'filter',
      label: 'Selección para Engorde',
      description: 'Seleccionar animal para pasar a Engorde',
      color: '#8B5CF6',
      route: '/views/(tabs)/admin/Ranch/breeding/RearingSelectionForm',
    },
    {
      icon: 'document-text',
      label: 'Importar Pesajes (Excel)',
      description: 'Carga masiva de pesajes desde planilla',
      color: '#059669',
      route: '/views/(tabs)/admin/bulkImport/BulkImportWeights',
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/views/(tabs)/admin/management/Management' as any)}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Recría</Text>
          <Text style={styles.subtitle}>Desarrollo post-destete</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#3B82F620' }]}>
          <Ionicons name="trending-up" size={22} color="#3B82F6" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas */}
        <View style={styles.statsRow}>
          <StatCard label="En Recría" value={`${stats.total}`} icon="paw" color="#3B82F6" />
          <StatCard
            label="Peso Prom."
            value={stats.avgWeight != null ? `${stats.avgWeight} kg` : '—'}
            icon="scale"
            color="#059669"
          />
          <StatCard
            label="Sin pesar"
            value={`${stats.withoutWeigh}`}
            icon="alert-circle"
            color={stats.withoutWeigh > 0 ? Colors.warning : Colors.textDisabled}
          />
        </View>

        {/* Acciones */}
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.tabBar,
  },
  statValue: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionText: { flex: 1 },
  actionLabel: {
    fontFamily: Typography.fontPrimary,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
