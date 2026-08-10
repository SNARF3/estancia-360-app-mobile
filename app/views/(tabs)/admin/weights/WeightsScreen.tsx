import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getSession } from '../../../../../hooks/auth/use-Auth';
import { PRODUCTIVE_STATUSES } from '../../../../../hooks/db.sqlite/database';
import { getDb } from '../../../../../hooks/db.sqlite/db-pool';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AnimalWeightRow {
  id: string;
  code: string;
  weight: number | null;
  last_weight: number | null;
  last_weight_date: string | null;
  productive_status: number;
  sex: string;
}

interface LotWeightRow {
  lot_name: string;
  pasture_name: string;
  lot_type: string;
  animal_count: number;
  avg_weight: number | null;
  total_kg: number | null;
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function WeightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [animals, setAnimals] = useState<AnimalWeightRow[]>([]);
  const [lots, setLots] = useState<LotWeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'animales' | 'lotes'>('animales');

  const load = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      const db = await getDb();

      // Animales con al menos un pesaje registrado (sin importar su estado productivo actual)
      const animalRows = await db.getAllAsync<AnimalWeightRow>(
        `SELECT
          a.id,
          a.code,
          a.weight,
          a.id_productive_status AS productive_status,
          a.sex,
          wr.weight              AS last_weight,
          wr.created_at          AS last_weight_date
        FROM ranch_animals a
        JOIN (
          SELECT wr2.weight, wr2.created_at, ae.id_ranch_animal
          FROM weight_records wr2
          JOIN animal_events ae ON ae.id = wr2.id_event
          WHERE wr2.id = (
            SELECT wr3.id FROM weight_records wr3
            JOIN animal_events ae3 ON ae3.id = wr3.id_event
            WHERE ae3.id_ranch_animal = ae.id_ranch_animal
            ORDER BY wr3.created_at DESC LIMIT 1
          )
        ) wr ON wr.id_ranch_animal = a.id
        WHERE a.id_ranch = ?
          AND a.id_status = 1
        ORDER BY wr.created_at DESC
        LIMIT 100`,
        [session.id_ranch]
      );
      setAnimals(animalRows);

      // Resumen por lote — cualquier lote con animales que tengan pesajes (o peso inicial de alta)
      const lotRows = await db.getAllAsync<LotWeightRow>(
        `SELECT
          rl.name         AS lot_name,
          rp.name         AS pasture_name,
          rl.lot_type,
          COUNT(a.id)     AS animal_count,
          ROUND(AVG(
            COALESCE(
              (SELECT wr.weight FROM weight_records wr
               JOIN animal_events ae ON ae.id = wr.id_event
               WHERE ae.id_ranch_animal = a.id
               ORDER BY wr.created_at DESC LIMIT 1),
              a.weight
            )
          ), 1) AS avg_weight,
          ROUND(SUM(
            COALESCE(
              (SELECT wr.weight FROM weight_records wr
               JOIN animal_events ae ON ae.id = wr.id_event
               WHERE ae.id_ranch_animal = a.id
               ORDER BY wr.created_at DESC LIMIT 1),
              a.weight
            )
          ), 1) AS total_kg
        FROM ranch_lots rl
        JOIN ranch_pastures rp ON rp.id = rl.id_ranch_pasture
        LEFT JOIN ranch_animals a ON a.id_lot = rl.id
          AND a.id_status = 1
        WHERE rl.id_ranch = ?
          AND rl.is_active = 1
        GROUP BY rl.id
        HAVING animal_count > 0
        ORDER BY rl.lot_type, rl.name`,
        [session.id_ranch]
      );
      setLots(lotRows);
    } catch (e) {
      console.error('Error loading weights:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const STATUS_LABELS: Record<number, string> = {
    [PRODUCTIVE_STATUSES.CRIA]: 'Cría',
    [PRODUCTIVE_STATUSES.RECRIA]: 'Recría',
    [PRODUCTIVE_STATUSES.ENGORDE]: 'Engorde',
    [PRODUCTIVE_STATUSES.BAJA]: 'Baja',
  };
  const STATUS_COLORS: Record<number, string> = {
    [PRODUCTIVE_STATUSES.CRIA]: '#8B5CF6',
    [PRODUCTIVE_STATUSES.RECRIA]: '#3B82F6',
    [PRODUCTIVE_STATUSES.ENGORDE]: '#F59E0B',
    [PRODUCTIVE_STATUSES.BAJA]: '#6B7280',
  };
  const statusLabel = (s: number) => STATUS_LABELS[s] ?? 'Sin clasificar';
  const statusColor = (s: number) => STATUS_COLORS[s] ?? Colors.textDisabled;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
  };

  const LOT_TYPE_LABELS: Record<string, string> = {
    cria: 'Cría',
    recria: 'Recría',
    engorde: 'Engorde',
    reproductiva: 'Reproductiva',
    general: 'General',
  };
  const LOT_TYPE_COLORS: Record<string, string> = {
    cria: '#8B5CF6',
    recria: '#3B82F6',
    engorde: '#F59E0B',
    reproductiva: '#EC4899',
    general: '#6B7280',
  };
  const lotTypeColor = (t: string) => LOT_TYPE_COLORS[t] ?? Colors.textDisabled;
  const lotTypeLabel = (t: string) => LOT_TYPE_LABELS[t] ?? t;

  return (
    <ScreenContainer scrollable={false} style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        {router.canGoBack() && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>Pesos</Text>
          <Text style={styles.subtitle}>Todos los animales</Text>
        </View>
      </View>

      {/* Tabs internas */}
      <View style={styles.tabRow}>
        {(['animales', 'lotes'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'animales' ? 'Por Animal' : 'Por Lote'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
        >
          {tab === 'animales' ? (
            animals.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="scale-outline" size={48} color={Colors.textDisabled} />
                <Text style={styles.emptyText}>Sin pesajes registrados</Text>
              </View>
            ) : (
              animals.map((a) => (
                <View key={a.id} style={styles.animalCard}>
                  <View style={styles.animalLeft}>
                    <Text style={styles.animalCode}>{a.code}</Text>
                    <View style={[styles.stageBadge, { backgroundColor: statusColor(a.productive_status) + '20' }]}>
                      <Text style={[styles.stageBadgeText, { color: statusColor(a.productive_status) }]}>
                        {statusLabel(a.productive_status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.animalRight}>
                    <Text style={styles.weightValue}>
                      {a.weight != null ? `${a.weight} kg` : '—'}
                    </Text>
                    <Text style={styles.weightDate}>
                      {a.last_weight_date ? `Últ. pesaje: ${formatDate(a.last_weight_date)}` : 'Sin pesaje'}
                    </Text>
                  </View>
                </View>
              ))
            )
          ) : (
            lots.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="albums-outline" size={48} color={Colors.textDisabled} />
                <Text style={styles.emptyText}>Sin lotes con animales</Text>
              </View>
            ) : (
              lots.map((lot, i) => (
                <View key={i} style={styles.lotCard}>
                  <View style={styles.lotHeader}>
                    <View style={[styles.lotTypeBadge, { backgroundColor: lotTypeColor(lot.lot_type) + '20' }]}>
                      <Text style={[styles.lotTypeText, { color: lotTypeColor(lot.lot_type) }]}>
                        {lotTypeLabel(lot.lot_type)}
                      </Text>
                    </View>
                    <Text style={styles.lotName}>{lot.lot_name}</Text>
                    <Text style={styles.pastureName}>{lot.pasture_name}</Text>
                  </View>
                  <View style={styles.lotStats}>
                    <LotStat label="Animales" value={`${lot.animal_count}`} />
                    <LotStat label="Peso prom." value={lot.avg_weight != null ? `${lot.avg_weight} kg` : '—'} />
                    <LotStat label="Total" value={lot.total_kg != null ? `${lot.total_kg} kg` : '—'} />
                  </View>
                </View>
              ))
            )
          )}
          <View style={{ height: Spacing.tabBarHeight + 20 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function LotStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lotStat}>
      <Text style={styles.lotStatValue}>{value}</Text>
      <Text style={styles.lotStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    ...Shadows.tabBar,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  animalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.tabBar,
  },
  animalLeft: {
    flex: 1,
    gap: 4,
  },
  animalCode: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  animalRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weightValue: {
    fontFamily: Typography.fontPrimary,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weightDate: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  lotCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.tabBar,
  },
  lotHeader: {
    marginBottom: Spacing.sm,
    gap: 2,
  },
  lotTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  lotTypeText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  lotName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pastureName: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lotStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.textDisabled + '20',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  lotStat: {
    alignItems: 'center',
  },
  lotStatValue: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  lotStatLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
