import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CowIcon } from '../../../../../components/icons/AppIcons';
import { ConflictResolutionModal } from '../../../../../components/common/ConflictResolutionModal';
import { DownloadLoadingOverlay } from '../../../../../components/common/DownloadLoadingOverlay';
import { SyncLoadingOverlay } from '../../../../../components/common/SyncLoadingOverlay';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getDb } from '../../../../../hooks/db.sqlite/db-pool';
import {
  ALL_TABLES,
  applyConflictResolutions,
  ConflictDecision,
  ConflictItem,
  downloadFromServer,
  syncAll,
} from '../../../../../hooks/db.sqlite/sync';
import { logout } from '../../../../../hooks/auth/use-Auth';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ModuleGroup {
  key: string;
  label: string;
  icon: string;
  tables: string[];
  count: number;
  syncable: boolean;
}

interface PendingRecord {
  id: string;
  primary: string;
  secondary?: string;
  tableLabel?: string;
}

// ─── Definición de módulos ────────────────────────────────────────────────────

const SYNCABLE_SET = new Set(ALL_TABLES);

const MODULE_DEFS: Omit<ModuleGroup, 'count' | 'syncable'>[] = [
  {
    key: 'animales',
    label: 'Animales',
    icon: 'paw-outline',
    tables: ['ranch_animals', 'animal_declared_history', 'ranch_pastures', 'ranch_lots'],
  },
  {
    key: 'reproduccion',
    label: 'Reproducción',
    icon: 'heart-outline',
    tables: ['breeding_services', 'gestation_diagnoses', 'weanings'],
  },
  {
    key: 'partos',
    label: 'Partos',
    icon: 'happy-outline',
    tables: ['parturitions'],
  },
  {
    key: 'pesajes',
    label: 'Pesajes',
    icon: 'scale-outline',
    tables: ['weight_records', 'rearing_selections', 'fattening_entries', 'feed_records'],
  },
  {
    key: 'sanidad',
    label: 'Sanidad',
    icon: 'shield-checkmark-outline',
    tables: ['vaccinations', 'treatments', 'health_incidents'],
  },
  {
    key: 'movimientos',
    label: 'Movimientos',
    icon: 'swap-horizontal-outline',
    // animal_purchases/animal_sales/animal_transfers fueron reemplazadas por
    // movements/movement_animals (modelo batch-first, ver migrations.ts v1) — ese trío ya
    // no existe como tabla. Contar contra las tablas viejas dejaba esta tarjeta siempre en 0
    // (silenciado por el try/catch de abajo), aunque hubiera compras/ventas/traslados sin subir.
    tables: ['movements', 'movement_animals', 'animal_exits'],
  },
];

const TABLE_LABELS: Record<string, string> = {
  ranch_pastures:           'Potreros',
  ranch_lots:               'Lotes',
  ranch_animals:            'Animales',
  animal_declared_history:  'Historial declarado',
  breeding_services:        'Servicios reproductivos',
  gestation_diagnoses:      'Diagnósticos gestación',
  parturitions:             'Partos',
  weanings:                 'Destetes',
  weight_records:           'Pesajes',
  rearing_selections:       'Selecciones recría',
  fattening_entries:        'Ingresos engorde',
  feed_records:             'Alimentación',
  movements:                'Movimientos',
  movement_animals:         'Animales por movimiento',
  animal_exits:             'Bajas',
  vaccinations:             'Vacunaciones',
  treatments:               'Tratamientos',
  health_incidents:         'Incidentes sanitarios',
};

const EVENT_LINKED_TABLES = new Set([
  'breeding_services', 'gestation_diagnoses', 'parturitions', 'weanings',
  'weight_records', 'rearing_selections', 'vaccinations', 'treatments', 'health_incidents',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso ?? ''; }
}

async function loadTableRecords(table: string): Promise<PendingRecord[]> {
  const db = await getDb();
  const tableLabel = TABLE_LABELS[table] ?? table;
  try {
    if (EVENT_LINKED_TABLES.has(table)) {
      const rows = await db.getAllAsync<{ id: string; event_date: string | null; code: string | null }>(
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
        tableLabel,
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
        tableLabel,
      }));
    }
    if (table === 'ranch_pastures' || table === 'ranch_lots') {
      const rows = await db.getAllAsync<{ id: string; name: string }>(
        `SELECT id, name FROM ${table} WHERE is_synced = 0 ORDER BY created_at DESC`
      );
      return rows.map(r => ({ id: r.id, primary: r.name, tableLabel }));
    }
    if (table === 'movements') {
      const rows = await db.getAllAsync<{ id: string; movement_type: string; counterpart_name: string | null; origin_name: string | null; movement_date: string | null }>(
        `SELECT id, movement_type, counterpart_name, origin_name, movement_date FROM movements WHERE is_synced = 0 ORDER BY created_at DESC`
      );
      const TYPE_LABELS: Record<string, string> = { sale: 'Venta', purchase: 'Compra', pasture_transfer: 'Traslado', ranch_exit: 'Salida a estancia' };
      return rows.map(r => ({
        id: r.id,
        primary: `${TYPE_LABELS[r.movement_type] ?? r.movement_type} — ${r.counterpart_name ?? r.origin_name ?? 'Sin contraparte'}`,
        secondary: r.movement_date ? fmtDate(r.movement_date) : undefined,
        tableLabel,
      }));
    }
    if (table === 'movement_animals') {
      const rows = await db.getAllAsync<{ id: string; code: string | null; new_code: string | null }>(
        `SELECT ma.id, ra.code, ma.new_code
         FROM movement_animals ma LEFT JOIN ranch_animals ra ON ra.id = ma.id_ranch_animal
         WHERE ma.is_synced = 0`
      );
      return rows.map(r => ({ id: r.id, primary: r.code ?? r.new_code ?? 'Sin código', tableLabel }));
    }
    if (table === 'animal_declared_history') {
      const rows = await db.getAllAsync<{ id: string; code: string | null }>(
        `SELECT adh.id, ra.code FROM animal_declared_history adh
         LEFT JOIN ranch_animals ra ON ra.id = adh.id_ranch_animal
         WHERE adh.is_synced = 0`
      );
      return rows.map(r => ({ id: r.id, primary: r.code ?? 'Sin código', tableLabel }));
    }
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM ${table} WHERE is_synced = 0`);
    return rows.map(r => ({ id: r.id, primary: r.id.slice(0, 14) + '…', tableLabel }));
  } catch { return []; }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useSyncData() {
  const [modules, setModules] = useState<ModuleGroup[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const lastServerTimeRef = useRef<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadPhase, setDownloadPhase] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const [detailModule, setDetailModule] = useState<ModuleGroup | null>(null);
  const [detailRecords, setDetailRecords] = useState<PendingRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const db = await getDb();
      let total = 0;
      const resolved: ModuleGroup[] = [];

      for (const def of MODULE_DEFS) {
        let count = 0;
        let anyHasBackend = false;
        for (const table of def.tables) {
          try {
            const row = await db.getFirstAsync<{ count: number }>(
              `SELECT COUNT(*) as count FROM ${table} WHERE is_synced = 0`
            );
            const c = row?.count ?? 0;
            count += c;
            if (SYNCABLE_SET.has(table)) {
              anyHasBackend = true;
              total += c;
            }
          } catch { /* tabla puede no existir aún */ }
        }
        resolved.push({ ...def, count, syncable: anyHasBackend });
      }

      setModules(resolved);
      setTotalPending(total);

      const session = await db.getFirstAsync<{ last_sync: string | null }>(
        'SELECT last_sync FROM local_session WHERE id = 1'
      );
      setLastSync(session?.last_sync ?? null);
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

  const openModuleDetail = async (mod: ModuleGroup) => {
    setDetailModule(mod);
    setDetailRecords([]);
    setDetailLoading(true);
    const all: PendingRecord[] = [];
    for (const table of mod.tables) {
      const records = await loadTableRecords(table);
      all.push(...records);
    }
    setDetailRecords(all);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetailModule(null);
    setDetailRecords([]);
  };

  const runDownload = async (fullSync: boolean) => {
    if (fullSync) {
      Alert.alert(
        'Descarga completa',
        'Esto descargará todos los datos del servidor. Útil si cambiaste de celular. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descargar todo', onPress: () => executeDownload(true) },
        ]
      );
    } else {
      await executeDownload(false);
    }
  };

  const executeDownload = async (fullSync: boolean) => {
    abortRef.current = new AbortController();
    setDownloading(true);
    setDownloadPhase('Iniciando descarga...');
    setDownloadProgress(0);
    try {
      const db = await getDb();
      const session = await db.getFirstAsync<{ id_ranch: string }>(
        'SELECT id_ranch FROM local_session WHERE id = 1'
      );
      if (!session?.id_ranch) {
        showMessage({ message: 'Sin sesión activa', type: 'danger', floating: true });
        return;
      }
      const result = await downloadFromServer(session.id_ranch, {
        fullSync,
        signal: abortRef.current.signal,
        onProgress: (msg, pct) => {
          setDownloadPhase(msg);
          setDownloadProgress(pct);
        },
      });
      if (result.cancelled) {
        showMessage({ message: 'Descarga cancelada', type: 'info', floating: true });
      } else if (result.error) {
        showMessage({ message: 'Error al descargar', description: result.error, type: 'danger', floating: true });
      } else if (result.conflicts.length > 0) {
        lastServerTimeRef.current = result.serverTime ?? null;
        setConflicts(result.conflicts);
      } else {
        const desc = result.deleted > 0 ? `${result.deleted} eliminado(s) del servidor` : undefined;
        showMessage({
          message: result.pulled > 0 ? `${result.pulled} registro(s) descargados` : 'Sin cambios nuevos',
          description: desc,
          type: 'success',
          floating: true,
        });
        await load();
      }
    } catch {
      showMessage({ message: 'Sin conexión', description: 'No se pudo contactar el servidor.', type: 'danger', floating: true });
    } finally {
      setDownloading(false);
      setDownloadPhase('');
      setDownloadProgress(0);
    }
  };

  const cancelDownload = () => { abortRef.current?.abort(); };

  const handleConflictResolve = async (decisions: ConflictDecision[]) => {
    try {
      await applyConflictResolutions(decisions, lastServerTimeRef.current ?? undefined);
      setConflicts([]);
      lastServerTimeRef.current = null;
      showMessage({ message: 'Conflictos resueltos', type: 'success', floating: true });
      await load();
    } catch {
      showMessage({ message: 'Error al aplicar resoluciones', type: 'danger', floating: true });
    }
  };

  const clearConflicts = () => {
    setConflicts([]);
    lastServerTimeRef.current = null;
  };

  return {
    modules, totalPending, lastSync,
    loading, syncing, syncPhase, syncProgress,
    downloading, downloadPhase, downloadProgress, conflicts,
    detailModule, detailRecords, detailLoading,
    load, runSync, openModuleDetail, closeDetail,
    runDownload, cancelDownload, handleConflictResolve, clearConflicts,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const {
    modules, totalPending, lastSync,
    loading, syncing, syncPhase, syncProgress,
    downloading, downloadPhase, downloadProgress, conflicts,
    detailModule, detailRecords, detailLoading,
    load, runSync, openModuleDetail, closeDetail,
    runDownload, cancelDownload, handleConflictResolve, clearConflicts,
  } = useSyncData();

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/views/auth/Inicio');
        },
      },
    ]);
  };

  const activeModules = modules.filter(m => m.count > 0);
  const busy = syncing || loading || downloading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <SyncLoadingOverlay visible={syncing} phase={syncPhase} progress={syncProgress} />
      <DownloadLoadingOverlay
        visible={downloading}
        phase={downloadPhase}
        progress={downloadProgress}
        onCancel={cancelDownload}
      />
      <ConflictResolutionModal
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={clearConflicts}
      />

      {/* Modal detalle de módulo */}
      <Modal
        visible={detailModule !== null}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailModule?.label}</Text>
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
                  <View
                    key={r.id + i}
                    style={[styles.detailRow, i === detailRecords.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={styles.detailDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailPrimary}>{r.primary}</Text>
                      {r.secondary ? <Text style={styles.detailSecondary}>{r.secondary}</Text> : null}
                      {r.tableLabel ? <Text style={styles.detailTableLabel}>{r.tableLabel}</Text> : null}
                    </View>
                  </View>
                ))}
                <View style={{ height: Spacing.xl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Header — idéntico a Management y Perfil */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity style={styles.salirBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Text style={styles.salirText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {/* Ícono sync + título */}
        <View style={styles.syncHeader}>
          <View style={styles.syncIconWrap}>
            <Ionicons name="sync-outline" size={52} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Sincronizar Datos</Text>
          <Text style={styles.subtitle}>Última sincronización: {formatDate(lastSync)}</Text>
        </View>

        {/* Card total de pendientes */}
        <View style={styles.pendingCard}>
          <View>
            <Text style={styles.pendingCardLabel}>Registros pendientes</Text>
            <Text style={styles.pendingCardCount}>{totalPending}</Text>
          </View>
          <View style={styles.pendingCardIconWrap}>
            <CowIcon size={44} color={Colors.secondary} />
          </View>
        </View>

        {/* Detalle por módulo */}
        {activeModules.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Detalle</Text>
            <View style={styles.moduleList}>
              {activeModules.map(mod => (
                <TouchableOpacity
                  key={mod.key}
                  style={styles.moduleRow}
                  onPress={() => openModuleDetail(mod)}
                  activeOpacity={0.75}
                >
                  <View style={styles.moduleIconBg}>
                    <Ionicons name={mod.icon as any} size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleLabel}>{mod.label}</Text>
                    <Text style={styles.moduleSubtext}>{mod.count} registros sin subir</Text>
                  </View>
                  <View style={[styles.moduleBadge, !mod.syncable && styles.moduleBadgeGray]}>
                    <Text style={[styles.moduleBadgeText, !mod.syncable && styles.moduleBadgeTextGray]}>
                      {mod.count}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textDisabled} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recibir datos del servidor */}
        <View style={styles.downloadCard}>
          <View style={styles.downloadCardHeader}>
            <Ionicons name="cloud-download-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.downloadCardTitle}>Recibir datos del servidor</Text>
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, busy && styles.disabledOpacity]}
            disabled={busy}
            onPress={() => runDownload(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={16} color={Colors.white} />
            <Text style={styles.downloadBtnText}>Descargar novedades</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadBtnSecondary, busy && styles.disabledOpacity]}
            disabled={busy}
            onPress={() => runDownload(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="phone-portrait-outline" size={14} color={Colors.primary} />
            <Text style={styles.downloadBtnSecondaryText}>Cambio de celular (descarga completa)</Text>
          </TouchableOpacity>
        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={[styles.syncButton, busy && styles.disabledOpacity]}
          onPress={runSync}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Ionicons name="sync-outline" size={22} color={Colors.white} />
          <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.tabBarHeight + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header — mismo que Management y Perfil ───────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
  },
  onlineBadge: { borderColor: Colors.primary, backgroundColor: Colors.successLight },
  offlineBadge: { borderColor: Colors.textSecondary, backgroundColor: 'transparent' },
  statusText: { fontSize: 13, fontFamily: Typography.fontPrimary, fontWeight: '700' },
  onlineText: { color: Colors.primary },
  offlineText: { color: Colors.textSecondary },
  salirBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
  },
  salirText: {
    fontSize: 13,
    fontFamily: Typography.fontPrimary,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  // ── Sync header ───────────────────────────────────────────────────────────────
  syncHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  syncIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  title: {
    fontFamily: Typography.fontSecondary,
    fontSize: 24,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Pending card ──────────────────────────────────────────────────────────────
  pendingCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  pendingCardLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pendingCardCount: {
    fontFamily: Typography.fontSecondary,
    fontSize: 30,
    color: Colors.primary + '99',
    lineHeight: 37,
  },
  pendingCardIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Module list ───────────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  moduleList: {
    gap: 12,
    marginBottom: Spacing.xl,
  },
  moduleRow: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadows.tabBar,
  },
  moduleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  moduleSubtext: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textDisabled,
  },
  moduleBadge: {
    backgroundColor: Colors.badgeBg,
    borderRadius: 999,
    minWidth: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  moduleBadgeGray: {
    backgroundColor: Colors.textDisabled + '20',
  },
  moduleBadgeText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.badgeText,
  },
  moduleBadgeTextGray: {
    color: Colors.textDisabled,
  },

  // ── Download card ─────────────────────────────────────────────────────────────
  downloadCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.tabBar,
  },
  downloadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  downloadCardTitle: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  downloadBtn: {
    backgroundColor: Colors.primaryButton,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  downloadBtnText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  downloadBtnSecondary: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  downloadBtnSecondaryText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Sync button ───────────────────────────────────────────────────────────────
  syncButton: {
    backgroundColor: Colors.primaryButton,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    marginBottom: Spacing.md,
    ...Shadows.floatingButton,
  },
  syncButtonText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 18,
    fontWeight: '500',
    color: Colors.white,
  },
  disabledOpacity: {
    opacity: 0.65,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
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
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    flexShrink: 0,
    marginTop: 6,
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
  detailTableLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textDisabled,
    marginTop: 1,
    fontStyle: 'italic',
  },
});
