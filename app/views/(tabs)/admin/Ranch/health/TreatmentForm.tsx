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
import { Colors } from '../../../../../../constants/theme';
import { useTreatment } from '../../../../../../hooks/health/use-Treatment';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const COMMON_MEDICATIONS = ['Oxitetraciclina', 'Penicilina', 'Ivermectina', 'Florfenicol', 'Enrofloxacina'];

export default function TreatmentForm() {
  const router = useRouter();
  const { animalCode: paramCode } = useLocalSearchParams<{ animalCode: string }>();
  const { formData, updateField, saveRecord, resetForm, loading, error } = useTreatment();

  useEffect(() => {
    if (paramCode) updateField('animalCode', paramCode.toUpperCase());
  }, [paramCode]);

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      const withdrawalMsg = formData.withdrawalDays
        ? ` Período de retiro: ${formData.withdrawalDays} días.`
        : '';
      Alert.alert(
        'Tratamiento registrado',
        `Tratamiento con ${formData.medication} registrado para ${formData.animalCode}.${withdrawalMsg}`,
        [
          { text: 'Nuevo tratamiento', onPress: resetForm },
          { text: 'Volver', onPress: () => router.back() },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Registrar Tratamiento</Text>
          <Text style={styles.subtitle}>Sanidad del rodeo</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#3B82F620' }]}>
          <Ionicons name="medkit" size={22} color="#3B82F6" />
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

        {/* Tratamiento */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Tratamiento</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

          <Text style={styles.label}>ENFERMEDAD / DIAGNÓSTICO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mastitis, Neumonía..."
            value={formData.illness}
            onChangeText={(v) => updateField('illness', v)}
          />

          <Text style={styles.label}>MEDICAMENTO *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del medicamento"
            value={formData.medication}
            onChangeText={(v) => updateField('medication', v)}
          />

          <View style={styles.chipRow}>
            {COMMON_MEDICATIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, formData.medication === m && styles.chipSelected]}
                onPress={() => updateField('medication', m)}
              >
                <Text style={[styles.chipText, formData.medication === m && styles.chipTextSelected]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DOSIS</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 10 ml/100 kg"
            value={formData.dose}
            onChangeText={(v) => updateField('dose', v)}
          />

          <Text style={styles.label}>DURACIÓN (días)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 5"
            value={formData.durationDays}
            onChangeText={(v) => updateField('durationDays', v)}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>PERÍODO DE RETIRO (días)</Text>
          <TextInput
            style={styles.input}
            placeholder="Días antes de faena / comercialización"
            value={formData.withdrawalDays}
            onChangeText={(v) => updateField('withdrawalDays', v)}
            keyboardType="number-pad"
          />
          {formData.withdrawalDays ? (
            <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: -8, marginBottom: 8 }}>
              ⚠ Animal en período de retiro hasta {calcWithdrawalDisplay(formData.eventDate, formData.withdrawalDays)}
            </Text>
          ) : null}

          <Text style={styles.label}>RESPONSABLE</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del veterinario o encargado"
            value={formData.responsible}
            onChangeText={(v) => updateField('responsible', v)}
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
              <Text style={styles.saveButtonText}>Registrar Tratamiento</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function calcWithdrawalDisplay(eventDate: string, withdrawalDaysStr: string): string {
  const days = parseInt(withdrawalDaysStr);
  if (!eventDate || isNaN(days)) return '';
  const d = new Date(eventDate);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
