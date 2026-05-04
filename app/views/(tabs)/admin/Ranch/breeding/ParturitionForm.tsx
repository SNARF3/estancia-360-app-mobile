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
    BIRTH_TYPE_LABELS,
    CRIA_STATUS_LABELS,
    MOTHER_CONDITION_LABELS,
} from '../../../../../../hooks/breeding/breeding.types';
import { useParturition } from '../../../../../../hooks/breeding/use-Parturition';
import { breedingFormStyles as styles } from './breedingFormStyles';

export default function ParturitionForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
    const params = useLocalSearchParams<{ animalCode?: string }>();
    const {
        formData,
        updateField,
        saveParturition,
        resetForm,
        loading,
        error,
        success,
    } = useParturition();

    useEffect(() => {
        if (params.animalCode) {
            updateField('animalCode', params.animalCode);
        }
    }, [params.animalCode]);

    const handleSave = async () => {
        const result = await saveParturition();
        if (result) {
            Alert.alert(
                'Parto Registrado',
                formData.cria_status === 'alive'
                    ? 'El parto ha sido registrado y la cría fue agregada al inventario automáticamente.'
                    : 'El parto ha sido registrado correctamente.',
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

    const birthTypes = Object.entries(BIRTH_TYPE_LABELS) as [string, string][];
    const criaStatuses = Object.entries(CRIA_STATUS_LABELS) as [string, string][];
    const motherConditions = Object.entries(MOTHER_CONDITION_LABELS) as [string, string][];

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Registro de Parto</Text>
                    <Text style={styles.subtitle}>Nacimiento de Cría</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#8B5CF615' }]}>
                    <Ionicons name="fitness" size={24} color="#8B5CF6" />
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
                    <Text style={styles.successBoxText}>Parto registrado exitosamente.</Text>
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
                    {/* Datos de la Madre */}
                    <Text style={styles.sectionTitle}>DATOS DE LA MADRE</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>CÓDIGO DE LA MADRE *</Text>
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
                            label="FECHA DEL PARTO"
                            value={formData.eventDate}
                            onChange={(date) => updateField('eventDate', date)}
                        />

                        <Text style={styles.label}>CONDICIÓN DE LA MADRE</Text>
                        <View style={styles.optionsContainer}>
                            {motherConditions.map(([key, label]) => {
                                const isSelected = formData.mother_condition === key;
                                const chipColor =
                                    key === 'good' ? Colors.primary :
                                        key === 'regular' ? Colors.secondary :
                                            Colors.error;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.optionChip,
                                            isSelected && { backgroundColor: chipColor, borderColor: chipColor },
                                        ]}
                                        onPress={() => updateField('mother_condition', key as any)}
                                    >
                                        <Text style={[
                                            styles.optionChipText,
                                            isSelected && styles.optionChipTextSelected,
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Estado de la Cría */}
                    <Text style={styles.sectionTitle}>ESTADO DE LA CRÍA</Text>
                    <View style={styles.card}>
                        <View style={styles.optionsContainer}>
                            {criaStatuses.map(([key, label]) => {
                                const isSelected = formData.cria_status === key;
                                const chipColor = key === 'alive' ? Colors.primary : Colors.error;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.optionChip,
                                            isSelected && { backgroundColor: chipColor, borderColor: chipColor },
                                        ]}
                                        onPress={() => updateField('cria_status', key as any)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Ionicons
                                                name={key === 'alive' ? 'heart' : 'heart-dislike'}
                                                size={14}
                                                color={isSelected ? Colors.white : chipColor}
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
                    </View>

                    {/* Datos de la Cría — solo si nació viva */}
                    {formData.cria_status === 'alive' && (
                        <>
                            <Text style={styles.sectionTitle}>DATOS DE LA CRÍA</Text>
                            <View style={styles.card}>
                                <Text style={styles.label}>CÓDIGO DE LA CRÍA *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: CRIA-001"
                                    value={formData.criaCode}
                                    onChangeText={(text) => updateField('criaCode', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                    autoCapitalize="characters"
                                />

                                <View style={styles.row}>
                                    <View style={styles.halfWidth}>
                                        <Text style={styles.label}>SEXO DE LA CRÍA *</Text>
                                        <View style={styles.toggleContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.toggleOption,
                                                    formData.cria_sex === 'M' && styles.toggleOptionSelected,
                                                ]}
                                                onPress={() => updateField('cria_sex', 'M')}
                                            >
                                                <Text style={[
                                                    styles.toggleText,
                                                    formData.cria_sex === 'M' && styles.toggleTextSelected,
                                                ]}>
                                                    MACHO
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.toggleOption,
                                                    formData.cria_sex === 'F' && styles.toggleOptionSelected,
                                                ]}
                                                onPress={() => updateField('cria_sex', 'F')}
                                            >
                                                <Text style={[
                                                    styles.toggleText,
                                                    formData.cria_sex === 'F' && styles.toggleTextSelected,
                                                ]}>
                                                    HEMBRA
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.halfWidth}>
                                        <Text style={styles.label}>PESO AL NACER (KG)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: 35"
                                            value={formData.cria_weight?.toString() ?? ''}
                                            onChangeText={(text) =>
                                                updateField('cria_weight', text ? parseFloat(text) : null)
                                            }
                                            keyboardType="numeric"
                                            placeholderTextColor={Colors.textDisabled}
                                        />
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Tipo de Parto */}
                    <Text style={styles.sectionTitle}>TIPO DE PARTO</Text>
                    <View style={styles.card}>
                        <View style={styles.optionsContainer}>
                            {birthTypes.map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.optionChip,
                                        formData.birth_type === key && styles.optionChipSelected,
                                    ]}
                                    onPress={() => updateField('birth_type', key as any)}
                                >
                                    <Text style={[
                                        styles.optionChipText,
                                        formData.birth_type === key && styles.optionChipTextSelected,
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Observaciones */}
                    <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Notas sobre el parto, complicaciones, etc..."
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
                            {formData.cria_status === 'alive'
                                ? 'La cría se registrará automáticamente en el inventario del hato.'
                                : 'Se registrará el parto sin crear un animal nuevo.'
                            }
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.saveButtonText}>REGISTRAR PARTO</Text>
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