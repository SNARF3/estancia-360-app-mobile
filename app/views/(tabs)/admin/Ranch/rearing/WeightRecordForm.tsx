import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
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
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';
import { Colors, Spacing } from '../../../../../../constants/theme';
import { useWeightRecord } from '../../../../../../hooks/rearing/use-WeightRecord';

const BODY_CONDITIONS = [1, 2, 3, 4, 5];
const WEIGHT_TYPES = [
  { value: 'scale' as const, label: 'Balanza' },
  { value: 'estimated' as const, label: 'Estimado' },
];

export default function WeightRecordForm() {
  const router = useRouter();
  const { animalCode: paramCode } = useLocalSearchParams<{ animalCode: string }>();
  const { formData, updateField, saveRecord, resetForm, loading, error, success } = useWeightRecord();

  useEffect(() => {
    if (paramCode) updateField('animalCode', paramCode.toUpperCase());
  }, [paramCode]);

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      Alert.alert('Pesaje registrado', `Peso de ${formData.weight} kg guardado correctamente.`, [
        { text: 'Nuevo pesaje', onPress: resetForm },
        { text: 'Volver', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Registrar Pesaje</Text>
          <Text style={styles.subtitle}>Recría / Engorde</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#3B82F620' }]}>
          <Ionicons name="scale" size={22} color="#3B82F6" />
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

        {/* Pesaje */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Pesaje</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector
            value={formData.eventDate}
            onChange={(d) => updateField('eventDate', d)}
            label=""
          />

          <Text style={styles.label}>PESO (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 245.5"
            value={formData.weight}
            onChangeText={(v) => updateField('weight', v)}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>TIPO DE PESAJE</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {WEIGHT_TYPES.map((wt) => (
              <TouchableOpacity
                key={wt.value}
                onPress={() => updateField('weightType', wt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: formData.weightType === wt.value ? Colors.primary : Colors.background,
                  borderWidth: 1,
                  borderColor: formData.weightType === wt.value ? Colors.primary : Colors.border,
                }}
              >
                <Text style={{
                  fontFamily: 'Montserrat-SemiBold',
                  color: formData.weightType === wt.value ? Colors.white : Colors.textSecondary,
                  fontSize: 13,
                }}>
                  {wt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>CONDICIÓN CORPORAL (1-5)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {BODY_CONDITIONS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => updateField('bodyCondition', formData.bodyCondition === n ? null : n)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: formData.bodyCondition === n ? Colors.primary : Colors.background,
                  borderWidth: 1,
                  borderColor: formData.bodyCondition === n ? Colors.primary : Colors.border,
                }}
              >
                <Text style={{
                  fontFamily: 'Montserrat-SemiBold',
                  color: formData.bodyCondition === n ? Colors.white : Colors.textPrimary,
                  fontSize: 14,
                }}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>OBSERVACIONES</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notas adicionales..."
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        {/* Botón guardar */}
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
              <Text style={styles.saveButtonText}>Guardar Pesaje</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
