import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { LotSelectorModal } from '../../../../../../components/common/LotSelectorModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { useFeedRecord } from '../../../../../../hooks/fattening/use-FeedRecord';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const UNITS = ['kg', 'tn', 'lt', 'bolsas'];
const FEED_SUGGESTIONS = ['Maíz', 'Sorgo', 'Silo maíz', 'Pastura', 'Pellet proteico', 'Heno', 'Otro'];

export default function FeedRecordForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formData, updateField, saveRecord, resetForm, loading, error } = useFeedRecord();
  const [showLotSelector, setShowLotSelector] = React.useState(false);

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      Alert.alert(
        'Alimentación registrada',
        'El registro de alimentación fue guardado correctamente.',
        [
          { text: 'Nuevo registro', onPress: resetForm },
          { text: 'Volver', onPress: () => router.back() },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Registrar Alimentación</Text>
          <Text style={styles.subtitle}>Por lote de engorde</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#05996920' }]}>
          <Ionicons name="leaf" size={22} color="#059669" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Lote */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lote</Text>
          <Text style={styles.label}>LOTE *</Text>
          <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShowLotSelector(true)}>
            <Text style={{ color: formData.lotName ? Colors.textPrimary : Colors.textDisabled, fontSize: 16 }}>
              {formData.lotName || 'Seleccionar lote...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Alimento */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos de Alimentación</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.feedDate} onChange={(d) => updateField('feedDate', d)} label="" />

          <Text style={styles.label}>TIPO DE ALIMENTO *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Maíz, Sorgo, Pastura..."
            value={formData.feedType}
            onChangeText={(v) => updateField('feedType', v)}
          />

          {/* Sugerencias rápidas */}
          <View style={styles.optionsContainer}>
            {FEED_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.optionChip, formData.feedType === s && styles.optionChipSelected]}
                onPress={() => updateField('feedType', s)}
              >
                <Text style={[styles.optionChipText, formData.feedType === s && styles.optionChipTextSelected]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>CANTIDAD</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 500"
                value={formData.quantity}
                onChangeText={(v) => updateField('quantity', v)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>UNIDAD</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.optionChip, formData.unit === u && styles.optionChipSelected]}
                    onPress={() => updateField('unit', u)}
                  >
                    <Text style={[styles.optionChipText, formData.unit === u && styles.optionChipTextSelected]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>COSTO (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 15000"
            value={formData.cost}
            onChangeText={(v) => updateField('cost', v)}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>OBSERVACIONES</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notas adicionales..."
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={styles.saveButtonText}>Guardando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Guardar Alimentación</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LotSelectorModal
        visible={showLotSelector}
        onClose={() => setShowLotSelector(false)}
        onSelect={(lot) => {
          updateField('lotName', lot.name);
          updateField('lotId', lot.id);
          setShowLotSelector(false);
        }}
        title="Seleccionar lote"
      />
    </KeyboardAvoidingView>
  );
}
