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
} from 'react-native';
import { View } from 'react-native';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { useVaccination } from '../../../../../../hooks/health/use-Vaccination';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const COMMON_VACCINES = ['Aftosa', 'Brucelosis', 'IBR', 'DVB', 'Carbunclo', 'Leptospirosis', 'Mancha negra'];

export default function VaccinationForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { animalCode: paramCode } = useLocalSearchParams<{ animalCode: string }>();
  const { formData, updateField, saveRecord, resetForm, loading, error } = useVaccination();

  useEffect(() => {
    if (paramCode) updateField('animalCode', paramCode.toUpperCase());
  }, [paramCode]);

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      Alert.alert(
        'Vacunación registrada',
        `Vacunación de ${formData.vaccineName} registrada para el animal ${formData.animalCode}.`,
        [
          { text: 'Nueva vacunación', onPress: resetForm },
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
          <Text style={styles.title}>Registrar Vacunación</Text>
          <Text style={styles.subtitle}>Sanidad del rodeo</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="shield-checkmark" size={22} color="#10B981" />
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

        {/* Vacuna */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos de la Vacuna</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

          <Text style={styles.label}>NOMBRE DE LA VACUNA *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Aftosa, Brucelosis..."
            value={formData.vaccineName}
            onChangeText={(v) => updateField('vaccineName', v)}
          />

          <View style={styles.chipRow}>
            {COMMON_VACCINES.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, formData.vaccineName === v && styles.chipSelected]}
                onPress={() => updateField('vaccineName', v)}
              >
                <Text style={[styles.chipText, formData.vaccineName === v && styles.chipTextSelected]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DOSIS</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 2 ml"
            value={formData.dose}
            onChangeText={(v) => updateField('dose', v)}
          />

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
              <Text style={styles.saveButtonText}>Registrar Vacunación</Text>
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
