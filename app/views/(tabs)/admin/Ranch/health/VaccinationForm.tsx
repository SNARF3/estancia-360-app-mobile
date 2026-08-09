import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { useVaccination, type VaccineEntry } from '../../../../../../hooks/health/use-Vaccination';
import { breedingFormStyles as styles } from '../breeding/_breedingFormStyles';

const COMMON_VACCINES = ['Aftosa', 'Brucelosis', 'IBR', 'DVB', 'Carbunclo', 'Leptospirosis', 'Mancha negra'];

function VaccineRow({
  entry,
  onNameChange,
  onDoseChange,
  onRemove,
  canRemove,
}: {
  entry: VaccineEntry;
  onNameChange: (name: string) => void;
  onDoseChange: (dose: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <View style={local.vaccineRow}>
      <View style={local.vaccineRowHeader}>
        <Text style={styles.label}>VACUNA</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nombre de la vacuna..."
        value={entry.vaccineName}
        onChangeText={onNameChange}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={local.chipScroll}>
        {COMMON_VACCINES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, entry.vaccineName === v && styles.chipSelected, local.chipItem]}
            onPress={() => onNameChange(v)}
          >
            <Text style={[styles.chipText, entry.vaccineName === v && styles.chipTextSelected]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>DOSIS</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 2 ml"
        value={entry.dose}
        onChangeText={onDoseChange}
      />
    </View>
  );
}

export default function VaccinationForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { animalCode: paramCode } = useLocalSearchParams<{ animalCode: string }>();
  const {
    formData, updateField, updateVaccine, addVaccine, removeVaccine,
    setVaccineName, saveRecord, resetForm, loading, error,
  } = useVaccination();

  useEffect(() => {
    if (paramCode) updateField('animalCode', paramCode.toUpperCase());
  }, [paramCode]);

  const handleBack = () => {
    if (paramCode) {
      router.replace('/views/(tabs)/admin/Ranch/Animals/AnimalMenu' as any);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    const ok = await saveRecord();
    if (ok) {
      const count = formData.vaccines.filter(v => v.vaccineName.trim()).length;
      Alert.alert(
        'Vacunación registrada',
        `${count} vacuna${count > 1 ? 's' : ''} registrada${count > 1 ? 's' : ''} para el animal ${formData.animalCode}.`,
        [
          { text: 'Nueva vacunación', onPress: resetForm },
          { text: 'Volver', onPress: handleBack },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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

        {/* Fecha y responsable */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos de la sesión</Text>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

          <Text style={styles.label}>RESPONSABLE</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del veterinario o encargado"
            value={formData.responsible}
            onChangeText={(v) => updateField('responsible', v)}
          />

          <Text style={styles.label}>OBSERVACIONES GENERALES</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notas adicionales..."
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Vacunas */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vacunas aplicadas</Text>

          {formData.vaccines.map((entry) => (
            <VaccineRow
              key={entry.id}
              entry={entry}
              onNameChange={(name) => setVaccineName(entry.id, name)}
              onDoseChange={(dose) => updateVaccine(entry.id, 'dose', dose)}
              onRemove={() => removeVaccine(entry.id)}
              canRemove={formData.vaccines.length > 1}
            />
          ))}

          <TouchableOpacity style={local.addBtn} onPress={addVaccine}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={local.addBtnTxt}>Agregar otra vacuna</Text>
          </TouchableOpacity>
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

const local = StyleSheet.create({
  vaccineRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 8,
  },
  vaccineRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipScroll: {
    marginBottom: 8,
  },
  chipItem: {
    marginRight: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    justifyContent: 'center',
  },
  addBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
