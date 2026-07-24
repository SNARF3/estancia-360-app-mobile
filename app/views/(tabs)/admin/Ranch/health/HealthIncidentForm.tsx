import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { useHealthIncident } from '../../../../../../hooks/health/use-HealthIncident';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const INCIDENT_TYPES = [
  { value: 'illness_detected' as const, label: 'Enfermedad detectada' },
  { value: 'quarantine' as const, label: 'Cuarentena' },
];

export default function HealthIncidentForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { animalCode: paramCode } = useLocalSearchParams<{ animalCode: string }>();
  const { formData, updateField, saveRecord, resetForm, loading, error } = useHealthIncident();

  useEffect(() => {
    if (paramCode) updateField('animalCode', paramCode.toUpperCase());
  }, [paramCode]);

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      const quarantineMsg = formData.incidentType === 'quarantine'
        ? ' El animal fue marcado en observación.'
        : '';
      Alert.alert(
        'Incidente registrado',
        `Incidente sanitario registrado para ${formData.animalCode}.${quarantineMsg}`,
        [
          { text: 'Nuevo incidente', onPress: resetForm },
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
          <Text style={styles.title}>Incidente Sanitario</Text>
          <Text style={styles.subtitle}>Registrar evento de salud</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="warning" size={22} color="#F59E0B" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Animal</Text>
          <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setIsPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: formData.animalCode ? Colors.textPrimary : Colors.textDisabled }}>
              {formData.animalCode || 'Buscar animal...'}
            </Text>
            <Ionicons name="search" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>
        </View>

        {/* Incidente */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Incidente</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

          <Text style={styles.label}>TIPO DE INCIDENTE *</Text>
          <View style={styles.toggleContainer}>
            {INCIDENT_TYPES.map((it) => (
              <TouchableOpacity
                key={it.value}
                style={[styles.toggleOption, formData.incidentType === it.value && styles.toggleOptionSelected]}
                onPress={() => updateField('incidentType', it.value)}
              >
                <Text style={[styles.toggleText, formData.incidentType === it.value && styles.toggleTextSelected]}>
                  {it.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.incidentType === 'quarantine' && (
            <View style={[styles.errorBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Ionicons name="information-circle" size={18} color="#F59E0B" />
              <Text style={[styles.errorBoxText, { color: '#92400E' }]}>
                El animal será marcado en observación al guardar.
              </Text>
            </View>
          )}

          <Text style={styles.label}>DESCRIPCIÓN *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describir el incidente sanitario..."
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>OBSERVACIONES ADICIONALES</Text>
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
              <Text style={styles.saveButtonText}>Registrar Incidente</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    
      <AnimalPickerModal
          visible={isPickerVisible}
          onClose={() => setIsPickerVisible(false)}
          onSelect={(code) => updateField('animalCode', code)}
      />
</KeyboardAvoidingView>
  );
}
