import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import {
    DIAGNOSIS_METHOD_LABELS,
    DIAGNOSIS_RESULT_LABELS,
} from '../../../../../../hooks/breeding/breeding.types';
import { useGestationDiagnosis } from '../../../../../../hooks/breeding/use-GestationDiagnosis';
import { breedingFormStyles as styles } from './breedingFormStyles';

export default function GestationDiagnosisForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
    const params = useLocalSearchParams<{ animalCode?: string }>();
    const {
        formData,
        updateField,
        saveDiagnosis,
        resetForm,
        loading,
        error,
        success,
    } = useGestationDiagnosis();

    useEffect(() => {
        if (params.animalCode) {
            updateField('animalCode', params.animalCode);
        }
    }, [params.animalCode]);

    const handleSave = async () => {
        const result = await saveDiagnosis();
        if (result) {
            Alert.alert(
                'Diagnóstico Registrado',
                'El diagnóstico de gestación ha sido registrado correctamente.',
                [
                    { text: 'Nuevo Registro', onPress: resetForm },
                    {
                        text: 'Volver',
                        onPress: () => { resetForm(); router.back(); },
                    },
                ]
            );
        }
    };

    const methods = Object.entries(DIAGNOSIS_METHOD_LABELS) as [string, string][];
    const results = Object.entries(DIAGNOSIS_RESULT_LABELS) as [string, string][];

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Diagnóstico Gestación</Text>
                    <Text style={styles.subtitle}>Resultado Reproductivo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="analytics" size={24} color={Colors.primary} />
                </View>
            </View>

            {/* Error / Success */}
            {error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorBoxText}>{error}</Text>
                </View>
            )}
            {success && (
                <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.successBoxText}>Diagnóstico registrado exitosamente.</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Datos del Animal */}
                    <Text style={styles.sectionTitle}>DATOS DEL ANIMAL</Text>
                    <View style={styles.card}>
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
                        <DateSelector
                            label="FECHA DEL DIAGNÓSTICO"
                            value={formData.eventDate}
                            onChange={(date) => updateField('eventDate', date)}
                        />
                    </View>

                    {/* Método */}
                    <Text style={styles.sectionTitle}>MÉTODO DE DIAGNÓSTICO</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleContainer}>
                            {methods.map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.toggleOption,
                                        formData.method === key && styles.toggleOptionSelected,
                                    ]}
                                    onPress={() => updateField('method', key as any)}
                                >
                                    <Text style={[
                                        styles.toggleText,
                                        formData.method === key && styles.toggleTextSelected,
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>VETERINARIO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nombre del veterinario"
                            value={formData.veterinarian ?? ''}
                            onChangeText={(text) => updateField('veterinarian', text)}
                            placeholderTextColor={Colors.textDisabled}
                        />
                    </View>

                    {/* Resultado */}
                    <Text style={styles.sectionTitle}>RESULTADO</Text>
                    <View style={styles.card}>
                        <View style={styles.optionsContainer}>
                            {results.map(([key, label]) => {
                                const isPregnant = key === 'pregnant';
                                const isSelected = formData.result === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.optionChip,
                                            isSelected && {
                                                backgroundColor: isPregnant ? Colors.primary : Colors.error,
                                                borderColor: isPregnant ? Colors.primary : Colors.error,
                                            },
                                        ]}
                                        onPress={() => updateField('result', key as any)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Ionicons
                                                name={isPregnant ? 'checkmark-circle' : 'close-circle'}
                                                size={16}
                                                color={isSelected ? Colors.white : (isPregnant ? Colors.primary : Colors.error)}
                                            />
                                            <Text style={[
                                                styles.optionChipText,
                                                isSelected && styles.optionChipTextSelected,
                                            ]}>
                                                {label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Campos extra si está preñada */}
                        {formData.result === 'pregnant' && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.row}>
                                    <View style={styles.halfWidth}>
                                        <Text style={styles.label}>DÍAS DE GESTACIÓN *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: 90"
                                            value={formData.gestation_days?.toString() ?? ''}
                                            onChangeText={(text) =>
                                                updateField('gestation_days', text ? parseInt(text) : null)
                                            }
                                            keyboardType="numeric"
                                            placeholderTextColor={Colors.textDisabled}
                                        />
                                    </View>
                                    <View style={styles.halfWidth}>
                                        <DateSelector
                                            label="FECHA ESTIMADA PARTO"
                                            value={formData.estimated_birth ?? ''}
                                            onChange={(date) => updateField('estimated_birth', date)}
                                        />
                                    </View>
                                </View>

                                {formData.gestation_days ? (
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.badgeDot, { backgroundColor: Colors.primary }]} />
                                        <Text style={styles.badgeText}>
                                            {formData.gestation_days} días de gestación
                                        </Text>
                                    </View>
                                ) : null}
                            </>
                        )}
                    </View>

                    {/* Observaciones */}
                    <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Notas adicionales sobre el diagnóstico..."
                            value={formData.notes ?? ''}
                            onChangeText={(text) => updateField('notes', text)}
                            placeholderTextColor={Colors.textDisabled}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            El diagnóstico se vinculará automáticamente al último servicio registrado del animal.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.saveButtonText}>REGISTRAR DIAGNÓSTICO</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            
      <AnimalPickerModal
          visible={isPickerVisible}
          onClose={() => setIsPickerVisible(false)}
          onSelect={(code) => updateField('animalCode', code)}
      />
</KeyboardAvoidingView>
        </View>
    );
}