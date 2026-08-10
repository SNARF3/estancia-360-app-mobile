import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { useTreatment, type MedEntry } from '../../../../../../hooks/health/use-Treatment';
import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles';

const COMMON_MEDS = ['Oxitetraciclina', 'Penicilina', 'Ivermectina', 'Florfenicol', 'Enrofloxacina'];

function calcWithdrawalDisplay(eventDate: string, withdrawalDaysStr: string): string {
  const days = parseInt(withdrawalDaysStr);
  if (!eventDate || isNaN(days)) return '';
  const d = new Date(eventDate);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function MedRow({
  entry,
  eventDate,
  onMedChange,
  onDoseChange,
  onDurationChange,
  onWithdrawalChange,
  onRemove,
  canRemove,
}: {
  entry: MedEntry;
  eventDate: string;
  onMedChange: (v: string) => void;
  onDoseChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  onWithdrawalChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <View style={local.vaccineRow}>
      <View style={local.vaccineRowHeader}>
        <Text style={styles.label}>MEDICAMENTO</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Nombre del medicamento..."
        value={entry.medication}
        onChangeText={onMedChange}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={local.chipScroll}>
        {COMMON_MEDS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, entry.medication === m && styles.chipSelected, local.chipItem]}
            onPress={() => onMedChange(m)}
          >
            <Text style={[styles.chipText, entry.medication === m && styles.chipTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.label}>DOSIS</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 10 ml/100 kg"
        value={entry.dose}
        onChangeText={onDoseChange}
      />
      <Text style={styles.label}>DURACIÓN (días)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 5"
        value={entry.durationDays}
        onChangeText={onDurationChange}
        keyboardType="number-pad"
      />
      <Text style={styles.label}>PERÍODO DE RETIRO (días)</Text>
      <TextInput
        style={styles.input}
        placeholder="Días antes de faena"
        value={entry.withdrawalDays}
        onChangeText={onWithdrawalChange}
        keyboardType="number-pad"
      />
      {entry.withdrawalDays ? (
        <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: -8, marginBottom: 8 }}>
          ⚠ Retiro hasta {calcWithdrawalDisplay(eventDate, entry.withdrawalDays)}
        </Text>
      ) : null}
    </View>
  );
}

export default function TreatmentForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animalCode: paramCode, from } = useLocalSearchParams<{ animalCode?: string; from?: string }>();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const treat = useTreatment();

  const isFirstParamSync = useRef(true);
  useEffect(() => {
    if (paramCode) {
      if (!isFirstParamSync.current) treat.resetForm();
      treat.updateField('animalCode', paramCode.toUpperCase());
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
    const ok = await treat.saveRecord();
    if (ok) {
      const count = treat.formData.meds.filter(m => m.medication.trim()).length;
      const successMsg = `${count} medicamento${count > 1 ? 's' : ''} registrado${count > 1 ? 's' : ''} para ${treat.formData.animalCode}.`;
      Alert.alert('Registrado', successMsg, [
        { text: 'Nuevo registro', onPress: treat.resetForm },
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
          <Text style={styles.title}>Tratamiento</Text>
          <Text style={styles.subtitle}>Sanidad del rodeo</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: '#F9731620' }]}>
          <Ionicons name="medkit" size={22} color="#F97316" />
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
            <Text style={{ fontSize: 16, color: treat.formData.animalCode ? Colors.textPrimary : Colors.textDisabled }}>
              {treat.formData.animalCode || 'Buscar animal...'}
            </Text>
            <Ionicons name="search" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={treat.formData.eventDate} onChange={(v) => treat.updateField('eventDate', v)} label="" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Tratamiento</Text>

          <Text style={styles.label}>ENFERMEDAD / DIAGNÓSTICO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mastitis, Neumonía..."
            value={treat.formData.illness}
            onChangeText={(v) => treat.updateField('illness', v)}
          />

          <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 8 }]}>Medicamentos aplicados</Text>

          {treat.formData.meds.map((entry) => (
            <MedRow
              key={entry.id}
              entry={entry}
              eventDate={treat.formData.eventDate}
              onMedChange={(v) => treat.updateMed(entry.id, 'medication', v)}
              onDoseChange={(v) => treat.updateMed(entry.id, 'dose', v)}
              onDurationChange={(v) => treat.updateMed(entry.id, 'durationDays', v)}
              onWithdrawalChange={(v) => treat.updateMed(entry.id, 'withdrawalDays', v)}
              onRemove={() => treat.removeMed(entry.id)}
              canRemove={treat.formData.meds.length > 1}
            />
          ))}

          <TouchableOpacity style={local.addBtn} onPress={treat.addMed}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={local.addBtnTxt}>Agregar otro medicamento</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 8 }]}>RESPONSABLE</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del veterinario o encargado"
            value={treat.formData.responsible}
            onChangeText={(v) => treat.updateField('responsible', v)}
          />

          <Text style={styles.label}>OBSERVACIONES</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notas adicionales..."
            value={treat.formData.notes}
            onChangeText={(v) => treat.updateField('notes', v)}
            multiline
            numberOfLines={3}
          />
        </View>

        {treat.error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{treat.error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, treat.loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={treat.loading}
          activeOpacity={0.85}
        >
          {treat.loading ? (
            <Text style={styles.saveButtonText}>Guardando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Registrar Tratamiento</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AnimalPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(code) => treat.updateField('animalCode', code)}
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
