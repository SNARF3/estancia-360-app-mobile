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
import { useHealthIncident } from '../../../../../../hooks/health/use-HealthIncident';
import { useTreatment, type MedEntry } from '../../../../../../hooks/health/use-Treatment';
import { useVaccination, type VaccineEntry } from '../../../../../../hooks/health/use-Vaccination';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

type HealthType = 'vacunacion' | 'tratamiento' | 'incidente';

const HEALTH_TYPES: { id: HealthType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'vacunacion', label: 'Vacunación', icon: 'shield-checkmark', color: '#10B981' },
  { id: 'tratamiento', label: 'Tratamiento', icon: 'medkit', color: '#F97316' },
  { id: 'incidente', label: 'Incidente', icon: 'warning', color: '#EF4444' },
];

const COMMON_VACCINES = ['Aftosa', 'Brucelosis', 'IBR', 'DVB', 'Carbunclo', 'Leptospirosis', 'Mancha negra'];
const COMMON_MEDS = ['Oxitetraciclina', 'Penicilina', 'Ivermectina', 'Florfenicol', 'Enrofloxacina'];
const INCIDENT_TYPES = [
  { value: 'illness_detected' as const, label: 'Enfermedad detectada' },
  { value: 'quarantine' as const, label: 'Cuarentena' },
];

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

function calcWithdrawalDisplay(eventDate: string, withdrawalDaysStr: string): string {
  const days = parseInt(withdrawalDaysStr);
  if (!eventDate || isNaN(days)) return '';
  const d = new Date(eventDate);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SaludForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animalCode: paramCode, from, type: paramType } = useLocalSearchParams<{
    animalCode?: string; from?: string; type?: string;
  }>();

  const [healthType, setHealthType] = useState<HealthType>(
    (paramType as HealthType) || 'vacunacion'
  );
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const vacc = useVaccination();
  const treat = useTreatment();
  const inc = useHealthIncident();

  useEffect(() => {
    if (paramCode) {
      const code = paramCode.toUpperCase();
      vacc.updateField('animalCode', code);
      treat.updateField('animalCode', code);
      inc.updateField('animalCode', code);
    }
  }, [paramCode]);

  const activeCode =
    healthType === 'vacunacion' ? vacc.formData.animalCode
    : healthType === 'tratamiento' ? treat.formData.animalCode
    : inc.formData.animalCode;

  const activeDate =
    healthType === 'vacunacion' ? vacc.formData.eventDate
    : healthType === 'tratamiento' ? treat.formData.eventDate
    : inc.formData.eventDate;

  const activeError =
    healthType === 'vacunacion' ? vacc.error
    : healthType === 'tratamiento' ? treat.error
    : inc.error;

  const activeLoading =
    healthType === 'vacunacion' ? vacc.loading
    : healthType === 'tratamiento' ? treat.loading
    : inc.loading;

  const setSharedCode = (code: string) => {
    vacc.updateField('animalCode', code);
    treat.updateField('animalCode', code);
    inc.updateField('animalCode', code);
  };

  const setSharedDate = (date: string) => {
    vacc.updateField('eventDate', date);
    treat.updateField('eventDate', date);
    inc.updateField('eventDate', date);
  };

  const handleBack = () => {
    if (from === 'registros') {
      router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    let ok = false;
    let successMsg = '';

    if (healthType === 'vacunacion') {
      ok = await vacc.saveRecord();
      if (ok) {
        const count = vacc.formData.vaccines.filter(v => v.vaccineName.trim()).length;
        successMsg = `${count} vacuna${count > 1 ? 's' : ''} registrada${count > 1 ? 's' : ''} para ${vacc.formData.animalCode}.`;
      }
    } else if (healthType === 'tratamiento') {
      ok = await treat.saveRecord();
      if (ok) {
        const count = treat.formData.meds.filter(m => m.medication.trim()).length;
        successMsg = `${count} medicamento${count > 1 ? 's' : ''} registrado${count > 1 ? 's' : ''} para ${treat.formData.animalCode}.`;
      }
    } else {
      ok = await inc.saveRecord();
      if (ok) {
        const qMsg = inc.formData.incidentType === 'quarantine' ? ' Animal en observación.' : '';
        successMsg = `Incidente registrado para ${inc.formData.animalCode}.${qMsg}`;
      }
    }

    if (ok) {
      Alert.alert('Registrado', successMsg, [
        {
          text: 'Nuevo registro',
          onPress: () => { vacc.resetForm(); treat.resetForm(); inc.resetForm(); },
        },
        { text: 'Volver', onPress: handleBack },
      ]);
    }
  };

  const activeType = HEALTH_TYPES.find(t => t.id === healthType)!;

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Registrar Sanidad</Text>
          <Text style={styles.subtitle}>Sanidad del rodeo</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: activeType.color + '20' }]}>
          <Ionicons name={activeType.icon} size={22} color={activeType.color} />
        </View>
      </View>

      {/* Selector de tipo */}
      <View style={local.typeSelector}>
        {HEALTH_TYPES.map((t) => {
          const isActive = healthType === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[local.typeBtn, isActive && { backgroundColor: t.color }]}
              onPress={() => setHealthType(t.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={t.icon} size={15} color={isActive ? '#fff' : t.color} />
              <Text style={[local.typeBtnText, { color: isActive ? '#fff' : t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animal + Fecha (comunes a todos los tipos) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Animal</Text>
          <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setIsPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: activeCode ? Colors.textPrimary : Colors.textDisabled }}>
              {activeCode || 'Buscar animal...'}
            </Text>
            <Ionicons name="search" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>

          <Text style={styles.label}>FECHA *</Text>
          <DateSelector value={activeDate} onChange={setSharedDate} label="" />
        </View>

        {/* ── Vacunación ───────────────────────────────────── */}
        {healthType === 'vacunacion' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vacunas aplicadas</Text>

            {vacc.formData.vaccines.map((entry) => (
              <VaccineRow
                key={entry.id}
                entry={entry}
                onNameChange={(name) => vacc.setVaccineName(entry.id, name)}
                onDoseChange={(dose) => vacc.updateVaccine(entry.id, 'dose', dose)}
                onRemove={() => vacc.removeVaccine(entry.id)}
                canRemove={vacc.formData.vaccines.length > 1}
              />
            ))}

            <TouchableOpacity style={local.addBtn} onPress={vacc.addVaccine}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={local.addBtnTxt}>Agregar otra vacuna</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 8 }]}>RESPONSABLE</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del veterinario o encargado"
              value={vacc.formData.responsible}
              onChangeText={(v) => vacc.updateField('responsible', v)}
            />

            <Text style={styles.label}>OBSERVACIONES</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Notas adicionales..."
              value={vacc.formData.notes}
              onChangeText={(v) => vacc.updateField('notes', v)}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* ── Tratamiento ──────────────────────────────────── */}
        {healthType === 'tratamiento' && (
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
        )}

        {/* ── Incidente Sanitario ──────────────────────────── */}
        {healthType === 'incidente' && (
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
        )}

        {activeError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBoxText}>{activeError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, activeLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={activeLoading}
          activeOpacity={0.85}
        >
          {activeLoading ? (
            <Text style={styles.saveButtonText}>Guardando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Registrar {activeType.label}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AnimalPickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={setSharedCode}
      />
    </KeyboardAvoidingView>
  );
}

const local = StyleSheet.create({
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
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
