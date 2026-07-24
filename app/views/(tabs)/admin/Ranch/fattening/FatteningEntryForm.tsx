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
import { useFatteningEntry } from '../../../../../../hooks/fattening/use-FatteningEntry';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const SYSTEM_TYPES = [
  { value: 'field' as const, label: 'Pastoreo' },
  { value: 'feedlot' as const, label: 'Feedlot' },
];

export default function FatteningEntryForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formData, updateField, saveEntry, resetForm, loading, error, success } = useFatteningEntry();
  const [showLotSelector, setShowLotSelector] = React.useState(false);

  const handleSave = async () => {
    const ok = await saveEntry();
    if (ok) {
      Alert.alert(
        'Ingreso a Engorde registrado',
        `Animal ${formData.animalCode} ingresado a Engorde correctamente.`,
        [
          { text: 'Nuevo ingreso', onPress: resetForm },
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
          <Text style={styles.title}>Ingresar a Engorde</Text>
          <Text style={styles.subtitle}>Desde Recría a Engorde</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="trending-up" size={22} color="#F59E0B" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Animal</Text>
          <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: AN-001"
            value={formData.animalCode}
            onChangeText={(v) => updateField('animalCode', v.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        {/* Engorde */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos de Ingreso</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

          <Text style={styles.label}>SISTEMA DE PRODUCCIÓN</Text>
          <View style={styles.toggleContainer}>
            {SYSTEM_TYPES.map((st) => (
              <TouchableOpacity
                key={st.value}
                style={[styles.toggleOption, formData.systemType === st.value && styles.toggleOptionSelected]}
                onPress={() => updateField('systemType', st.value)}
              >
                <Text style={[styles.toggleText, formData.systemType === st.value && styles.toggleTextSelected]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>PESO INICIAL (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 280"
            value={formData.initialWeight}
            onChangeText={(v) => updateField('initialWeight', v)}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>LOTE DE ENGORDE *</Text>
          <TouchableOpacity
            style={styles.inputWithIcon}
            onPress={() => setShowLotSelector(true)}
          >
            <Text style={{ color: formData.lotDestName ? Colors.textPrimary : Colors.textDisabled, fontSize: 16 }}>
              {formData.lotDestName || 'Seleccionar lote de engorde...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

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
              <Text style={styles.saveButtonText}>Ingresar a Engorde</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LotSelectorModal
        visible={showLotSelector}
        onClose={() => setShowLotSelector(false)}
        onSelect={(lot) => {
          updateField('lotDestName', lot.name);
          updateField('lotDestId', lot.id);
          setShowLotSelector(false);
        }}
        filterType="engorde"
        title="Seleccionar lote de engorde"
      />
    </KeyboardAvoidingView>
  );
}
