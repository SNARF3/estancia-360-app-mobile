import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { useHealthIncident } from '../../../../../../hooks/health/use-HealthIncident';
import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles';

const INCIDENT_TYPES = [
  { value: 'illness_detected' as const, label: 'Enfermedad detectada' },
  { value: 'quarantine' as const, label: 'Cuarentena' },
];

export default function HealthIncidentForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animalCode: paramCode, from } = useLocalSearchParams<{ animalCode?: string; from?: string }>();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const inc = useHealthIncident();

  const isFirstParamSync = useRef(true);
  useEffect(() => {
    if (paramCode) {
      if (!isFirstParamSync.current) inc.resetForm();
      inc.updateField('animalCode', paramCode.toUpperCase());
    }
    isFirstParamSync.current = false;
  }, [paramCode]);

  const handleBack = () => {
    if (from === 'registros') {
      router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    const ok = await inc.saveRecord();
    if (ok) {
      const qMsg = inc.formData.incidentType === 'quarantine' ? ' Animal en observación.' : '';
      const successMsg = `Incidente registrado para ${inc.formData.animalCode}.${qMsg}`;
      Alert.alert('Registrado', successMsg, [
        { text: 'Nuevo registro', onPress: inc.resetForm },
        { text: 'Volver', onPress: handleBack },
      ]);
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
          <Text style={styles.title}>Incidente Sanitario</Text>
          <Text style={styles.subtitle}>Sanidad del rodeo</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#EF444420' }]}>
          <Ionicons name="warning" size={22} color="#EF4444" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Animal</Text>
          <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setIsPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: inc.formData.animalCode ? Colors.textPrimary : Colors.textDisabled }}>
              {inc.formData.animalCode || 'Buscar animal...'}
            </Text>
            <Ionicons name="search" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={inc.formData.eventDate} onChange={(v) => inc.updateField('eventDate', v)} label="" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Incidente</Text>

          <Text style={styles.label}>TIPO DE INCIDENTE *</Text>
          <View style={styles.toggleContainer}>
            {INCIDENT_TYPES.map((it) => (
              <TouchableOpacity
                key={it.value}
                style={[styles.toggleOption, inc.formData.incidentType === it.value && styles.toggleOptionSelected]}
                onPress={() => inc.updateField('incidentType', it.value)}
              >
                <Text style={[styles.toggleText, inc.formData.incidentType === it.value && styles.toggleTextSelected]}>
                  {it.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {inc.formData.incidentType === 'quarantine' && (
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
            value={inc.formData.description}
            onChangeText={(v) => inc.updateField('description', v)}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>OBSERVACIONES ADICIONALES</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notas adicionales..."
            value={inc.formData.notes}
            onChangeText={(v) => inc.updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {inc.error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{inc.error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, inc.loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={inc.loading}
          activeOpacity={0.85}
        >
          {inc.loading ? (
            <Text style={styles.saveButtonText}>Guardando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Registrar Incidente Sanitario</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AnimalPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(code) => inc.updateField('animalCode', code)}
      />
    </KeyboardAvoidingView>
  );
}
