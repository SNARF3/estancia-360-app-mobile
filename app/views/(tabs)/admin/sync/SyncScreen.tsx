import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { ALL_TABLES, pullFromServer, syncAll } from '../../../../../hooks/db.sqlite/sync';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TablePendingInfo {
  label: string;
  table: string;
  icon: string;
  count: number;
}

interface PendingRecord {
  id: string;
  primary: string;
  secondary?: string;
}

interface WeightSummary {
  totalAnimals: number;
  avgWeight: number;
  maxWeight: number;
  minWeight: number;
  lastWeightDate: string | null;
}

const TABLE_LABELS: Record<string, { label: string; icon: string }> = {
  ranch_pastures:          { label: 'Potreros',                icon: 'grid-outline' },
  ranch_lots:              { label: 'Lotes',                   icon: 'albums-outline' },
  ranch_animals:           { label: 'Animales',                icon: 'paw-outline' },
  animal_declared_history: { label: 'Historial declarado',     icon: 'document-text-outline' },
  breeding_services:       { label: 'Servicios reproductivos', icon: 'heart-outline' },
  gestation_diagnoses:     { label: 'Diagnósticos',            icon: 'medical-outline' },
  parturitions:            { label: 'Partos',                  icon: 'happy-outline' },
  weanings:                { label: 'Destetes',                icon: 'git-branch-outline' },
  weight_records:          { label: 'Pesajes',                 icon: 'scale-outline' },
  rearing_selections:      { label: 'Selecciones recría',      icon: 'filter-outline' },
  fattening_entries:       { label: 'Ingresos engorde',        icon: 'trending-up-outline' },
  feed_records:            { label: 'Alimentación',            icon: 'leaf-outline' },
  animal_purchases:        { label: 'Compras',                 icon: 'cart-outline' },
  animal_sales:            { label: 'Ventas',                  icon: 'cash-outline' },
  animal_transfers:        { label: 'Traslados',               icon: 'swap-horizontal-outline' },
  animal_exits:            { label: 'Bajas',                   icon: 'close-circle-outline' },
  vaccinations:            { label: 'Vacunaciones',            icon: 'shield-checkmark-outline' },
  treatments:              { label: 'Tratamientos',            icon: 'bandage-outline' },
  health_incidents:        { label: 'Incidentes sanitarios',   icon: 'warning-outline' },
};

const EVENT_TYPE_NAMES: Record<number, string> = {
  1: 'Servicio reproductivo',
  2: 'Diagnóstico gestación',
  3: 'Parto',
  4: 'Destete',
  5: 'Pesaje',
  6: 'Selección recría',
  7: 'Compra',
  8: 'Venta',
  9: 'Traslado',
  10: 'Salida',
  11: 'Vacunación',
  12: 'Tratamiento',
  13: 'Incidente sanitario',
  14: 'Entrada engorde',
  15: 'Cambio de proceso',
};

const SYNCABLE_SET = new Set(ALL_TABLES);

const EVENT_LINKED_TABLES = new Set([
  'breeding_services', 'gestation_diagnoses', 'parturitions', 'weanings',
  'weight_records', 'rearing_selections', 'vaccinations', 'treatments', 'health_incidents',
]);

// ─── Helper: detalle de registros pendientes ──────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso ?? ''; }
}

async function loadDetailRecords(table: string): Promise<PendingRecord[]> {
  const db = await getDb();
  try {
    if (EVENT_LINKED_TABLES.has(table)) {
      const rows = await db.getAllAsync<{
        id: string; event_date: string | null; code: string | null;
      }>(
        `SELECT t.id, ae.event_date, ra.code
         FROM ${table} t
         LEFT JOIN animal_events ae ON ae.id = t.id_event
         LEFT JOIN ranch_animals ra ON ra.id = ae.id_ranch_animal
         WHERE t.is_synced = 0
         ORDER BY ae.event_date DESC`
      );
      return rows.map(r => ({
        id: r.id,
        primary: r.code ?? 'Sin código',
        secondary: r.event_date ? fmtDate(r.event_date) : undefined,
      }));
    }

    if (table === 'ranch_animals') {
      const rows = await db.getAllAsync<{ id: string; code: string; sex: string; birthdate: string }>(
        `SELECT id, code, sex, birthdate FROM ranch_animals WHERE is_synced = 0 ORDER BY created_at DESC`
      );
      return rows.map(r => ({
        id: r.id,
        primary: r.code,
        secondary: `${r.sex === 'F' ? 'Hembra' : 'Macho'} — Nac. ${fmtDate(r.birthdate)}`,
      }));
    }

    if (table === 'ranch_pastures' || table === 'ranch_lots') {
      const rows = await db.getAllAsync<{ id: string; name: string }>(
        `SELECT id, name FROM ${table} WHERE is_synced = 0 ORDER BY created_at DESC`
      );
      return rows.map(r => ({ id: r.id, primary: r.name }));
    }

    if (table === 'animal_declared_history') {
      const rows = await db.getAllAsync<{ id: string; code: string | null }>(
        `SELECT adh.id, ra.code FROM animal_declared_history adh
         LEFT JOIN ranch_animals ra ON ra.id = adh.id_ranch_animal
         WHERE adh.is_synced = 0`
      );
      return rows.map(r => ({ id: r.id, primary: r.code ?? 'Sin código' }));
    }

    // Fallback genérico
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM ${table} WHERE is_synced = 0`);
    return rows.map(r => ({ id: r.id, primary: r.id.slice(0, 14) + '…' }));
  } catch {
    return [];
  }
}

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
  const [pulling, setPulling] = useState(false);

  // Detail modal
  const [detailTable, setDetailTable] = useState<string | null>(null);
  const [detailLabel, setDetailLabel] = useState('');
  const [detailRecords, setDetailRecords] = useState<PendingRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const db = await getDb();
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
        } catch { /* tabla puede no existir */ }
      }

      setPending(syncableList);
      setPendingNoBackend(noBackendList);
      setTotalPending(total);

      const session = await db.getFirstAsync<{ last_sync: string | null }>(
        'SELECT last_sync FROM local_session WHERE id = 1'
      );
      setLastSync(session?.last_sync ?? null);

      const wRow = await db.getFirstAsync<{
        total: number; avg_w: number; max_w: number; min_w: number; last_date: string | null;
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
      setWeightSummary(wRow && wRow.total > 0 ? {
        totalAnimals: wRow.total,
        avgWeight: wRow.avg_w ?? 0,
        maxWeight: wRow.max_w ?? 0,
        minWeight: wRow.min_w ?? 0,
        lastWeightDate: wRow.last_date,
      } : null);
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
      if (result.success) {
        showMessage({ message: 'Sincronización exitosa', description: `${result.synced} registro(s) sincronizados.`, type: 'success', floating: true });
      } else if (result.synced > 0) {
        showMessage({ message: 'Sincronización parcial', description: `${result.synced} ok, ${result.failed} con errores.`, type: 'warning', floating: true });
      } else {
        showMessage({ message: 'Sin conexión', description: 'Verifica tu internet e intenta de nuevo.', type: 'danger', floating: true });
      }
      await load();
    } catch {
      showMessage({ message: 'Error de sincronización', description: 'No se pudo conectar al servidor.', type: 'danger', floating: true });
    } finally {
      setSyncing(false);
      setSyncPhase('');
      setSyncProgress(0);
    }
  };

  const openDetail = async (item: TablePendingInfo) => {
    setDetailLabel(item.label);
    setDetailTable(item.table);
    setDetailRecords([]);
    setDetailLoading(true);
    const records = await loadDetailRecords(item.table);
    setDetailRecords(records);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetailTable(null);
    setDetailRecords([]);
  };

  const runPull = async (fullSync = false) => {
    if (fullSync) {
      Alert.alert(
        'Descarga completa',
        'Esto descargará todos los datos del servidor. Útil si cambiaste de celular. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descargar todo', onPress: () => executePull(true) },
        ]
      );
    } else {
      await executePull(false);
    }
  };

  const executePull = async (fullSync: boolean) => {
    setPulling(true);
    try {
      const db = await getDb();
      const session = await db.getFirstAsync<{ id_ranch: string }>(
        'SELECT id_ranch FROM local_session WHERE id = 1'
      );
      if (!session?.id_ranch) {
        showMessage({ message: 'Sin sesión activa', type: 'danger', floating: true });
        return;
      }
      const result = await pullFromServer(session.id_ranch, { fullSync });
      if (result.error) {
        showMessage({ message: 'Error al descargar', description: result.error, type: 'danger', floating: true });
      } else {
        showMessage({
          message: result.pulled > 0 ? `${result.pulled} registro(s) descargados` : 'Sin cambios nuevos',
          description: fullSync ? 'Descarga completa finalizada' : 'Datos actualizados desde el servidor',
          type: 'success',
          floating: true,
        });
        await load();
      }
    } catch {
      showMessage({ message: 'Sin conexión', description: 'No se pudo contactar el servidor.', type: 'danger', floating: true });
    } finally {
      setPulling(false);
    }
  };

  return {
    pending, pendingNoBackend, totalPending, lastSync, weightSummary,
    loading, syncing, syncPhase, syncProgress, pulling,
    detailTable, detailLabel, detailRecords, detailLoading,
    load, runSync, openDetail, closeDetail, runPull,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SyncScreen() {
  const {
    pending, pendingNoBackend, totalPending, lastSync, weightSummary,
    loading, syncing, syncPhase, syncProgress, pulling,
    detailTable, detailLabel, detailRecords, detailLoading,
    load, runSync, openDetail, closeDetail, runPull,
  } = useSyncData();

  useFocusEffect(useCallback(() => { load(); }, []));

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScreenContainer scrollable={false} style={styles.container}>
      <SyncLoadingOverlay visible={syncing} phase={syncPhase} progress={syncProgress} />

      {/* Modal de detalle de registros pendientes */}
      <Modal visible={detailTable !== null} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailLabel}</Text>
              <TouchableOpacity onPress={closeDetail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Registros pendientes de sincronizar</Text>

            {detailLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : detailRecords.length === 0 ? (
              <Text style={styles.modalEmpty}>Sin registros</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
                {detailRecords.map((r, i) => (
                  <View key={r.id} style={[styles.detailRow, i === detailRecords.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.detailDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailPrimary}>{r.primary}</Text>
                      {r.secondary ? <Text style={styles.detailSecondary}>{r.secondary}</Text> : null}
                    </View>
                  </View>
                ))}
                <View style={{ height: Spacing.xl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sincronización</Text>
          <Text style={styles.subtitle}>Último sync: {formatDate(lastSync)}</Text>
        </View>

        {/* Subir cambios */}
        <TouchableOpacity
          style={[styles.syncButton, (syncing || pulling) && styles.syncButtonDisabled]}
          onPress={runSync}
          disabled={syncing || pulling || loading}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={Colors.white} />
          <Text style={styles.syncButtonText}>Subir cambios al servidor</Text>
        </TouchableOpacity>

        {/* Descargar cambios — próximamente */}
        <View style={[styles.downloadCard, { opacity: 0.5 }]}>
          <View style={styles.downloadCardHeader}>
            <Ionicons name="cloud-download-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.downloadCardTitle}>Recibir datos del servidor</Text>
            <View style={styles.proximamenteBadge}>
              <Text style={styles.proximamenteText}>PRÓXIMAMENTE</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.downloadButton, styles.syncButtonDisabled]}
            disabled
            activeOpacity={1}
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.white} />
            <Text style={styles.downloadButtonText}>Descargar novedades</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadButtonSecondary, styles.syncButtonDisabled]}
            disabled
            activeOpacity={1}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={Colors.primary} />
            <Text style={styles.downloadButtonSecondaryText}>Cambio de celular (descarga completa)</Text>
          </TouchableOpacity>
        </View>

        {/* Estado general */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: totalPending > 0 ? Colors.warning : Colors.success }]} />
            <Text style={styles.statusText}>
              {totalPending > 0
                ? `${totalPending} registro(s) pendientes de subir`
                : 'Todo sincronizado'}
            </Text>
          </View>
        </View>

        {/* Pendientes por tabla (sincronizables) — tappable */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pendientes por módulo</Text>
            {pending.map((item) => (
              <TouchableOpacity
                key={item.table}
                style={styles.pendingRow}
                onPress={() => openDetail(item)}
                activeOpacity={0.75}
              >
                <View style={styles.pendingIcon}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.pendingLabel}>{item.label}</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingCount}>{item.count}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
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
    paddingTop: 60,
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
    marginBottom: Spacing.md,
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
  downloadCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.tabBar,
  },
  downloadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  downloadCardTitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  proximamenteBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.textDisabled + '30',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proximamenteText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textDisabled,
    letterSpacing: 0.5,
  },
  downloadButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  downloadButtonText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  downloadButtonSecondary: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  downloadButtonSecondaryText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
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
  // Modal de detalle
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: Typography.fontPrimary,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  modalList: {
    flexGrow: 0,
  },
  modalEmpty: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border ?? '#E5E7EB',
    gap: Spacing.sm,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    flexShrink: 0,
  },
  detailPrimary: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  detailSecondary: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
