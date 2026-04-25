import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
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
import { Colors } from '../../../../../../constants/theme';
import { SERVICE_TYPE_LABELS } from '../../../../../../hooks/breeding/breeding.types';
import { useBreedingService } from '../../../../../../hooks/breeding/use-BreedingService';
import { breedingFormStyles as styles } from './breedingFormStyles';

export default function BreedingServiceForm() {
    const router = useRouter();
    const params = useLocalSearchParams<{ animalCode?: string }>();
    const {
        formData,
        updateField,
        saveService,
        resetForm,
        loading,
        error,
        success,
    } = useBreedingService();

    useEffect(() => {
        if (params.animalCode) {
            updateField('animalCode', params.animalCode);
        }
    }, [params.animalCode]);

    const handleSave = async () => {
        const result = await saveService();
        if (result) {
            Alert.alert(
                'Servicio Registrado',
                'El servicio reproductivo ha sido registrado correctamente.',
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

    const serviceTypes = Object.entries(SERVICE_TYPE_LABELS) as [string, string][];

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Servicio Reproductivo</Text>
                    <Text style={styles.subtitle}>Monta o Inseminación</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.secondary + '15' }]}>
                    <Ionicons name="heart-circle" size={24} color={Colors.secondary} />
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
                    <Text style={styles.successBoxText}>Servicio registrado exitosamente.</Text>
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
                        <Text style={styles.label}>CÓDIGO DE LA HEMBRA *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: GP-0012"
                            value={formData.animalCode}
                            onChangeText={(text) => updateField('animalCode', text)}
                            placeholderTextColor={Colors.textDisabled}
                            autoCapitalize="characters"
                        />

                        <DateSelector
                            label="FECHA DEL SERVICIO"
                            value={formData.eventDate}
                            onChange={(date) => updateField('eventDate', date)}
                        />
                    </View>

                    {/* Tipo de Servicio */}
                    <Text style={styles.sectionTitle}>TIPO DE SERVICIO</Text>
                    <View style={styles.card}>
                        <View style={styles.optionsContainer}>
                            {serviceTypes.map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.optionChip,
                                        formData.service_type === key && styles.optionChipSelected,
                                    ]}
                                    onPress={() => updateField('service_type', key as any)}
                                >
                                    <Text style={[
                                        styles.optionChipText,
                                        formData.service_type === key && styles.optionChipTextSelected,
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Monta natural → pedir código del macho */}
                        {formData.service_type === 'natural' && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.label}>CÓDIGO DEL MACHO *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: TORO-001"
                                    value={formData.maleAnimalCode ?? ''}
                                    onChangeText={(text) => updateField('maleAnimalCode', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                    autoCapitalize="characters"
                                />
                            </>
                        )}

                        {/* IA → raza semen + técnico */}
                        {formData.service_type === 'artificial_insemination' && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.label}>RAZA DEL SEMEN *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Angus, Brahman"
                                    value={formData.semen_breed ?? ''}
                                    onChangeText={(text) => updateField('semen_breed', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                />
                                <Text style={styles.label}>TÉCNICO</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nombre del técnico"
                                    value={formData.technician ?? ''}
                                    onChangeText={(text) => updateField('technician', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </>
                        )}

                        {/* Embrión → raza + técnico */}
                        {formData.service_type === 'embryo_transfer' && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.label}>RAZA DEL EMBRIÓN</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Hereford"
                                    value={formData.semen_breed ?? ''}
                                    onChangeText={(text) => updateField('semen_breed', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                />
                                <Text style={styles.label}>TÉCNICO</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nombre del técnico"
                                    value={formData.technician ?? ''}
                                    onChangeText={(text) => updateField('technician', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </>
                        )}
                    </View>

                    {/* Info Adicional */}
                    <Text style={styles.sectionTitle}>INFORMACIÓN ADICIONAL</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>LOTE REPRODUCTIVO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Lote A - Primavera 2026"
                            value={formData.reproductive_lot ?? ''}
                            onChangeText={(text) => updateField('reproductive_lot', text)}
                            placeholderTextColor={Colors.textDisabled}
                        />
                        <Text style={styles.label}>OBSERVACIONES</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Notas adicionales sobre el servicio..."
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
                            El servicio quedará vinculado al historial reproductivo del animal.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.saveButtonText}>REGISTRAR SERVICIO</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}