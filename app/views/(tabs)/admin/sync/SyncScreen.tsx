import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { SyncLoadingOverlay } from '../../../../../components/common/SyncLoadingOverlay';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getDb } from '../../../../../hooks/db.sqlite/db-pool';
import { ALL_TABLES, getPendingCount, syncAll } from '../../../../../hooks/db.sqlite/sync';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TablePendingInfo {
  label: string;
  table: string;
  icon: string;
  count: number;
}

interface WeightSummary {
  totalAnimals: number;
  avgWeight: number;
  maxWeight: number;
  minWeight: number;
  lastWeightDate: string | null;
}

const TABLE_LABELS: Record<string, { label: string; icon: string }> = {
  ranch_pastures:          { label: 'Potreros',               icon: 'grid-outline' },
  ranch_lots:              { label: 'Lotes',                  icon: 'albums-outline' },
  ranch_animals:           { label: 'Animales',               icon: 'paw-outline' },
  animal_declared_history: { label: 'Historial declarado',    icon: 'document-text-outline' },
  animal_events:           { label: 'Eventos',                icon: 'flash-outline' },
  breeding_services:       { label: 'Servicios reproductivos',icon: 'heart-outline' },
  gestation_diagnoses:     { label: 'Diagnósticos',           icon: 'medical-outline' },
  parturitions:            { label: 'Partos',                 icon: 'happy-outline' },
  weanings:                { label: 'Destetes',               icon: 'git-branch-outline' },
  weight_records:          { label: 'Pesajes',                icon: 'scale-outline' },
  rearing_selections:      { label: 'Selecciones recría',     icon: 'filter-outline' },
  fattening_entries:       { label: 'Ingresos engorde',       icon: 'trending-up-outline' },
  feed_records:            { label: 'Alimentación',           icon: 'leaf-outline' },
  animal_purchases:        { label: 'Compras',                icon: 'cart-outline' },
  animal_sales:            { label: 'Ventas',                 icon: 'cash-outline' },
  animal_transfers:        { label: 'Traslados',              icon: 'swap-horizontal-outline' },
  animal_exits:            { label: 'Bajas',                  icon: 'close-circle-outline' },
  vaccinations:            { label: 'Vacunaciones',           icon: 'shield-checkmark-outline' },
  treatments:              { label: 'Tratamientos',           icon: 'bandage-outline' },
  health_incidents:        { label: 'Incidentes sanitarios',  icon: 'warning-outline' },
};

// Tablas que se sincronizan con el backend + animal_events (se marca al sincronizar sus hijos)
const SYNCABLE_SET = new Set([...ALL_TABLES, 'animal_events']);

// ─── Hook de datos ────────────────────────────────────────────────────────────

function useSyncData() {
  const [pending, setPending] = useState<TablePendingInfo[]>([]);
  const [pendingNoBackend, setPendingNoBackend] = useState<TablePendingInfo[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [weightSummary, setWeightSummary] = useState<WeightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const db = await getDb();

      // Pendientes por tabla — separar sincronizables de sin-backend
      const tables = Object.keys(TABLE_LABELS);
      const syncableList: TablePendingInfo[] = [];
      const noBackendList: TablePendingInfo[] = [];
      let total = 0;

      for (const table of tables) {
        try {
          const row = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
          );
          const count = row?.count ?? 0;
          if (count > 0) {
            const info: TablePendingInfo = {
              table,
              label: TABLE_LABELS[table].label,
              icon: TABLE_LABELS[table].icon,
              count,
            };
            if (SYNCABLE_SET.has(table)) {
              syncableList.push(info);
              total += count;
            } else {
              noBackendList.push(info);
            }
          }
        } catch {
          // Tabla puede no existir aún
        }
      }

      setPending(syncableList);
      setPendingNoBackend(noBackendList);
      setTotalPending(total);

      // Último sync
      const session = await db.getFirstAsync<{ last_sync: string | null }>(
        'SELECT last_sync FROM local_session WHERE id = 1'
      );
      setLastSync(session?.last_sync ?? null);

      // Resumen de pesos
      const wRow = await db.getFirstAsync<{
        total: number;
        avg_w: number;
        max_w: number;
        min_w: number;
        last_date: string | null;
      }>(
        `SELECT
          COUNT(DISTINCT a.id)         AS total,
          ROUND(AVG(a.weight), 1)      AS avg_w,
          MAX(a.weight)                AS max_w,
          MIN(a.weight)                AS min_w,
          MAX(wr.created_at)           AS last_date
        FROM ranch_animals a
        LEFT JOIN weight_records wr ON wr.id_event IN (
          SELECT id FROM animal_events WHERE id_ranch_animal = a.id
        )
        WHERE a.id_productive_status IN (2,3)
          AND a.id_status = 1`
      );

      if (wRow && wRow.total > 0) {
        setWeightSummary({
          totalAnimals: wRow.total,
          avgWeight: wRow.avg_w ?? 0,
          maxWeight: wRow.max_w ?? 0,
          minWeight: wRow.min_w ?? 0,
          lastWeightDate: wRow.last_date,
        });
      } else {
        setWeightSummary(null);
      }
    } catch (e) {
      console.error('Error loading sync data:', e);
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncPhase('Iniciando...');
    setSyncProgress(0);
    try {
      const result = await syncAll((msg, pct) => {
        setSyncPhase(msg);
        setSyncProgress(pct);
      });
      console.log('[SyncScreen] result:', JSON.stringify(result));
      if (result.success) {
        showMessage({
          message: 'Sincronización exitosa',
          description: `${result.synced} registro(s) sincronizados.`,
          type: 'success',
          floating: true,
        });
      } else if (result.synced > 0) {
        showMessage({
          message: 'Sincronización parcial',
          description: `${result.synced} ok, ${result.failed} con errores.`,
          type: 'warning',
          floating: true,
        });
      } else {
        showMessage({
          message: 'Sin conexión',
          description: 'Verifica tu internet e intenta de nuevo.',
          type: 'danger',
          floating: true,
        });
      }
      await load();
    } catch {
      showMessage({
        message: 'Error de sincronización',
        description: 'No se pudo conectar al servidor.',
        type: 'danger',
        floating: true,
      });
    } finally {
      setSyncing(false);
      setSyncPhase('');
      setSyncProgress(0);
    }
  };

  return { pending, pendingNoBackend, totalPending, lastSync, weightSummary, loading, syncing, syncPhase, syncProgress, load, runSync };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SyncScreen() {
  const { pending, pendingNoBackend, totalPending, lastSync, weightSummary, loading, syncing, syncPhase, syncProgress, load, runSync } =
    useSyncData();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScreenContainer scrollable={false} style={styles.container}>
      <SyncLoadingOverlay visible={syncing} phase={syncPhase} progress={syncProgress} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sincronización</Text>
          <Text style={styles.subtitle}>Último sync: {formatDate(lastSync)}</Text>
        </View>

        {/* Botón Sincronizar */}
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={runSync}
          disabled={syncing || loading}
          activeOpacity={0.85}
        >
          <Ionicons name="sync" size={22} color={Colors.white} />
          <Text style={styles.syncButtonText}>Sincronizar Ahora</Text>
        </TouchableOpacity>

        {/* Estado general */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: totalPending > 0 ? Colors.warning : Colors.success }]} />
            <Text style={styles.statusText}>
              {totalPending > 0
                ? `${totalPending} registro(s) pendientes de sincronizar`
                : 'Todo sincronizado'}
            </Text>
          </View>
        </View>

        {/* Pendientes por tabla (sincronizables) */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pendientes por módulo</Text>
            {pending.map((item) => (
              <View key={item.table} style={styles.pendingRow}>
                <View style={styles.pendingIcon}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.pendingLabel}>{item.label}</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingCount}>{item.count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pendientes sin backend aún */}
        {pendingNoBackend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardados localmente (sin backend aún)</Text>
            {pendingNoBackend.map((item) => (
              <View key={item.table} style={[styles.pendingRow, { opacity: 0.6 }]}>
                <View style={[styles.pendingIcon, { backgroundColor: Colors.textSecondary + '20' }]}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.textSecondary} />
                </View>
                <Text style={[styles.pendingLabel, { color: Colors.textSecondary }]}>{item.label}</Text>
                <View style={[styles.pendingBadge, { backgroundColor: Colors.textSecondary }]}>
                  <Text style={styles.pendingCount}>{item.count}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resumen de Pesos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Pesos</Text>
          {weightSummary ? (
            <View style={styles.weightGrid}>
              <WeightStat label="Animales en recría/engorde" value={`${weightSummary.totalAnimals}`} icon="paw" />
              <WeightStat label="Peso promedio" value={`${weightSummary.avgWeight} kg`} icon="stats-chart" />
              <WeightStat label="Peso máximo" value={`${weightSummary.maxWeight} kg`} icon="trending-up" />
              <WeightStat label="Peso mínimo" value={`${weightSummary.minWeight} kg`} icon="trending-down" />
            </View>
          ) : (
            <View style={styles.emptyWeights}>
              <Ionicons name="scale-outline" size={36} color={Colors.textDisabled} />
              <Text style={styles.emptyText}>Sin pesajes registrados en recría/engorde</Text>
            </View>
          )}
        </View>

        <View style={{ height: Spacing.tabBarHeight + 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function WeightStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.weightStat}>
      <View style={styles.weightStatIcon}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.weightStatValue}>{value}</Text>
      <Text style={styles.weightStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  title: {
    fontFamily: Typography.fontPrimary,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadows.floatingButton,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.tabBar,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  pendingRow: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.tabBar,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  pendingLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pendingCount: {
    fontFamily: Typography.fontPrimary,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  weightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  weightStat: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: '47%',
    ...Shadows.tabBar,
  },
  weightStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  weightStatValue: {
    fontFamily: Typography.fontPrimary,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  weightStatLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyWeights: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.tabBar,
  },
  emptyText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
