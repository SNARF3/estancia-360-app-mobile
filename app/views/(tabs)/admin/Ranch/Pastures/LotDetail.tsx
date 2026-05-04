import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { getSession } from '../../../../../../hooks/auth/use-Auth';
import { LOT_TYPE_COLORS, LOT_TYPE_LABELS } from '../../../../../../hooks/Ranch/use-Pastures';
import { assignAnimalToLot, getAnimalByCode, getAnimals } from '../../../../../../hooks/db.sqlite/repositories/animals';
import type { Animal } from '../../../../../../hooks/db.sqlite/repositories/animals';
import type { LotType } from '../../../../../../hooks/Ranch/use-Pastures';

// ─── Constantes de estado productivo ─────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = { 1: 'Cría', 2: 'Recría', 3: 'Engorde', 4: 'Baja' };
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

  const handleAddAnimal = async (code: string) => {
    try {
      const session = await getSession();
      if (!session?.id_ranch) return;

      const animal = await getAnimalByCode(session.id_ranch, code);
      if (!animal) {
        Alert.alert('Animal no encontrado', `No se encontró el animal con código "${code}".`);
        return;
      }
      if (animal.id_lot === lotId) {
        Alert.alert('Ya en este lote', `El animal ${code} ya está asignado a este lote.`);
        return;
      }

      const confirmMsg = animal.id_lot
        ? `El animal ${code} está en otro lote. ¿Moverlo a "${lotName}"?`
        : `¿Asignar el animal ${code} al lote "${lotName}"?`;

      Alert.alert('Asignar al lote', confirmMsg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await assignAnimalToLot(animal.id, lotId);
            await loadAnimals();
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo asignar el animal.');
    }
  };

  const renderAnimal = ({ item }: { item: Animal }) => {
    const statusColor = STATUS_COLORS[item.id_productive_status] ?? Colors.textSecondary;
    const statusLabel = STATUS_LABELS[item.id_productive_status] ?? '—';
    return (
      <View style={styles.animalRow}>
        <View style={[styles.animalIcon, { backgroundColor: statusColor + '18' }]}>
          <Ionicons name="paw-outline" size={20} color={statusColor} />
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
        <Ionicons name="paw" size={16} color={Colors.textSecondary} />
        <Text style={styles.summaryText}>
          {animals.length} animal{animals.length !== 1 ? 'es' : ''} en este lote
        </Text>
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
              <Ionicons name="paw-outline" size={48} color={Colors.textDisabled} />
              <Text style={styles.emptyTitle}>Sin animales</Text>
              <Text style={styles.emptyText}>Toca el botón + para agregar animales a este lote.</Text>
            </View>
          ) : null
        }
      />

      <AnimalPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddAnimal}
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
