import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { LotSelectorModal } from '../../../../../../components/common/LotSelectorModal';
import { Colors } from '../../../../../../constants/theme';
import { useFeedRecord } from '../../../../../../hooks/feeding/use-FeedRecord';
import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles';

export default function FeedRecordForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [isLotPickerVisible, setIsLotPickerVisible] = useState(false);

  const feed = useFeedRecord();

  const handleBack = () => {
    if (from === 'registros') {
      router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    const ok = await feed.saveRecord();
    if (ok) {
      Alert.alert(
        'Registrado',
        `Alimentación registrada para el lote ${feed.formData.lotName}.`,
        [
          { text: 'Nuevo registro', onPress: feed.resetForm },
          { text: 'Volver', onPress: handleBack },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Alimentación</Text>
          <Text style={styles.subtitle}>Registro por lote</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="nutrition" size={22} color="#F59E0B" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lote</Text>
          <Text style={styles.label}>LOTE *</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setIsLotPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: feed.formData.lotName ? Colors.textPrimary : Colors.textDisabled }}>
              {feed.formData.lotName || 'Seleccionar lote...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={feed.formData.feedDate} onChange={(v) => feed.updateField('feedDate', v)} label="" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alimento</Text>

          <Text style={styles.label}>TIPO DE ALIMENTO *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Heno, concentrado, silo..."
            value={feed.formData.feedType}
            onChangeText={(v) => feed.updateField('feedType', v)}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>CANTIDAD</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={feed.formData.quantity}
                onChangeText={(v) => feed.updateField('quantity', v)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>UNIDAD</Text>
              <TextInput
                style={styles.input}
                placeholder="kg"
                value={feed.formData.unit}
                onChangeText={(v) => feed.updateField('unit', v)}
              />
            </View>
          </View>

          <Text style={styles.label}>COSTO</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={feed.formData.cost}
            onChangeText={(v) => feed.updateField('cost', v)}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>OBSERVACIONES</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notas adicionales..."
            value={feed.formData.notes}
            onChangeText={(v) => feed.updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {feed.error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{feed.error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, feed.loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={feed.loading}
          activeOpacity={0.85}
        >
          {feed.loading ? (
            <Text style={styles.saveButtonText}>Guardando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Registrar Alimentación</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LotSelectorModal
        visible={isLotPickerVisible}
        onClose={() => setIsLotPickerVisible(false)}
        onSelect={(lot) => { feed.selectLot(lot.id, lot.name); setIsLotPickerVisible(false); }}
        title="Seleccionar Lote"
      />
    </KeyboardAvoidingView>
  );
}
