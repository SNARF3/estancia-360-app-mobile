import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimalMultiPickerModal } from '../../../../../../components/common/AnimalMultiPickerModal';
import { CowIcon } from '../../../../../../components/icons/AppIcons';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { getSession } from '../../../../../../hooks/auth/use-Auth';
import { LOT_TYPE_COLORS, LOT_TYPE_LABELS } from '../../../../../../hooks/Ranch/use-Pastures';
import { assignAnimalToLot, getAnimalByCode, getAnimals, updateAnimalProductiveStatus } from '../../../../../../hooks/db.sqlite/repositories/animals';
import type { Animal } from '../../../../../../hooks/db.sqlite/repositories/animals';
import type { LotType } from '../../../../../../hooks/Ranch/use-Pastures';
import { useLotFeedHistory } from '../../../../../../hooks/feeding/use-LotFeedHistory';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Constantes de estado productivo ─────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = { 1: 'Cría', 2: 'Recría', 3: 'Engorde', 4: 'Baja' };

function lotTypeToProductiveStatus(lotType: string): number | null {
  switch (lotType) {
    case 'cria':         return 1;
    case 'recria':       return 2;
    case 'engorde':      return 3;
    case 'reproductiva': return 1;
    default:             return null; // 'general' → sin cambio
  }
}
const STATUS_COLORS: Record<number, string> = {
  1: Colors.warning,
  2: Colors.primary,
  3: '#EF4444',
  4: Colors.textSecondary,
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function LotDetail() {
  const router = useRouter();
  const { lotId, lotName, lotType } = useLocalSearchParams<{
    lotId: string;
    lotName: string;
    lotType: LotType;
  }>();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  const lotColor = LOT_TYPE_COLORS[lotType] ?? Colors.primary;
  const { records: feedRecords, loading: feedLoading } = useLotFeedHistory(lotId);

  const loadAnimals = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.id_ranch) return;
      const list = await getAnimals({ id_ranch: session.id_ranch, id_lot: lotId });
      setAnimals(list);
    } catch (e) {
      console.error('LotDetail loadAnimals:', e);
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useFocusEffect(useCallback(() => { loadAnimals(); }, [loadAnimals]));

  const handleAddAnimals = async (selected: { id: string; code: string }[]) => {
    try {
      const session = await getSession();
      if (!session?.id_ranch) return;

      const newPs = lotTypeToProductiveStatus(lotType);
      let added = 0;
      let alreadyHere = 0;
      let notFound = 0;

      for (const sel of selected) {
        const animal = await getAnimalByCode(session.id_ranch, sel.code);
        if (!animal) { notFound++; continue; }
        if (animal.id_lot === lotId) { alreadyHere++; continue; }

        if (newPs !== null) {
          // Actualiza lote + etapa productiva en un solo UPDATE
          await updateAnimalProductiveStatus(animal.id, newPs, lotId);
        } else {
          await assignAnimalToLot(animal.id, lotId);
        }
        added++;
      }

      await loadAnimals();

      const parts: string[] = [];
      if (added > 0) {
        const stageMsg = newPs !== null ? ` Pasaron a etapa ${STATUS_LABELS[newPs]}.` : '';
        parts.push(`${added} animal${added > 1 ? 'es' : ''} agregado${added > 1 ? 's' : ''} a "${lotName}".${stageMsg}`);
      }
      if (alreadyHere > 0) parts.push(`${alreadyHere} ya estaba${alreadyHere > 1 ? 'n' : ''} en este lote.`);
      if (notFound > 0) parts.push(`${notFound} no se encontró${notFound > 1 ? 'n' : ''}.`);
      Alert.alert('Lote actualizado', parts.join(' '));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudieron mover los animales.');
    }
  };

  const renderAnimal = ({ item }: { item: Animal }) => {
    const statusColor = STATUS_COLORS[item.id_productive_status] ?? Colors.textSecondary;
    const statusLabel = STATUS_LABELS[item.id_productive_status] ?? '—';
    return (
      <View style={styles.animalRow}>
        <View style={[styles.animalIcon, { backgroundColor: statusColor + '18' }]}>
          <CowIcon size={22} color={statusColor} />
        </View>
        <View style={styles.animalInfo}>
          <Text style={styles.animalCode}>{item.code}</Text>
          <Text style={styles.animalMeta}>
            {item.sex === 'F' ? 'Hembra' : 'Macho'}
            {item.weight ? ` · ${item.weight} kg` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.lotName} numberOfLines={1}>{lotName}</Text>
          <View style={[styles.lotTypeBadge, { backgroundColor: lotColor + '20' }]}>
            <Text style={[styles.lotTypeText, { color: lotColor }]}>
              {LOT_TYPE_LABELS[lotType] ?? lotType}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: lotColor }]}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View style={styles.summaryCard}>
        <CowIcon size={18} color={Colors.textSecondary} />
        <Text style={styles.summaryText}>
          {animals.length} animal{animals.length !== 1 ? 'es' : ''} en este lote
        </Text>
      </View>

      {/* Historial de alimentación */}
      <View style={styles.feedCard}>
        <Text style={styles.feedHeader}>ALIMENTACIÓN RECIENTE</Text>
        {feedLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : feedRecords.length === 0 ? (
          <Text style={styles.feedEmpty}>Sin registros de alimentación para este lote</Text>
        ) : (
          feedRecords.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.feedRow}>
              <View style={styles.feedInfo}>
                <Text style={styles.feedType}>{r.feed_type}</Text>
                <Text style={styles.feedDate}>{fmtDate(r.feed_date)}</Text>
              </View>
              {r.quantity != null && (
                <Text style={styles.feedQty}>{r.quantity}{r.unit ? ` ${r.unit}` : ''}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Lista de animales */}
      <FlatList
        data={animals}
        keyExtractor={(item) => item.id}
        renderItem={renderAnimal}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAnimals} tintColor={Colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <CowIcon size={48} color={Colors.textDisabled} />
              <Text style={styles.emptyTitle}>Sin animales</Text>
              <Text style={styles.emptyText}>Toca el botón + para agregar animales a este lote.</Text>
            </View>
          ) : null
        }
      />

      <AnimalMultiPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handleAddAnimals}
        initialSelected={animals.map((a) => a.code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 4,
  },
  lotName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  lotTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lotTypeText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.tabBar,
  },
  summaryText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  feedCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.tabBar,
  },
  feedHeader: {
    fontFamily: Typography.fontPrimary,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDisabled,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  feedEmpty: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textDisabled,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  feedInfo: {
    flex: 1,
  },
  feedType: {
    fontFamily: Typography.fontPrimary,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  feedDate: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  feedQty: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  animalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.tabBar,
  },
  animalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalInfo: {
    flex: 1,
  },
  animalCode: {
    fontFamily: Typography.fontPrimary,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  animalMeta: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.fontPrimary,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textDisabled,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
