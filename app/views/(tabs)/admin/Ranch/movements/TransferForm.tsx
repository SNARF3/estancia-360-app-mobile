import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { LotSelectorModal } from '../../../../../../components/common/LotSelectorModal';
import { Colors } from '../../../../../../constants/theme';
import { useAnimalTransfer } from '../../../../../../hooks/movements/use-AnimalTransfer';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

const REASON_OPTIONS: { value: string; label: string }[] = [
    { value: 'management', label: 'Manejo' },
    { value: 'breeding', label: 'Cría / Reproducción' },
    { value: 'rearing', label: 'Recría' },
    { value: 'fattening', label: 'Engorde' },
    { value: 'health', label: 'Sanidad' },
];

export default function TransferForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { animalCode: paramCode } = useLocalSearchParams<{ animalCode?: string }>();
    const { formData, updateField, saveRecord, resetForm, loading, error } = useAnimalTransfer();
    const [animalPickerVisible, setAnimalPickerVisible] = useState(false);
    const [lotPickerVisible, setLotPickerVisible] = useState(false);

    useEffect(() => {
        if (paramCode) updateField('animalCode', paramCode.toUpperCase());
    }, [paramCode]);

    const handleSave = async () => {
        const ok = await saveRecord();
        if (ok) {
            Alert.alert(
                'Traslado registrado',
                `${formData.animalCode} fue trasladado a ${formData.destLotName}.`,
                [
                    { text: 'Nuevo traslado', onPress: resetForm },
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
                    <Text style={styles.title}>Registrar Traslado</Text>
                    <Text style={styles.subtitle}>Movimientos del rodeo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name="swap-horizontal" size={22} color={Colors.primary} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Animal</Text>
                    <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setAnimalPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: formData.animalCode ? Colors.textPrimary : Colors.textDisabled }}>
                            {formData.animalCode || 'Buscar animal...'}
                        </Text>
                        <Ionicons name="search" size={18} color={Colors.textDisabled} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos del Traslado</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

                    <Text style={styles.label}>LOTE DESTINO *</Text>
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setLotPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: formData.destLotName ? Colors.textPrimary : Colors.textDisabled }}>
                            {formData.destLotName || 'Seleccionar lote...'}
                        </Text>
                        <Ionicons name="location-outline" size={18} color={Colors.textDisabled} />
                    </TouchableOpacity>

                    <Text style={styles.label}>MOTIVO</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {REASON_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.chip, formData.reason === opt.value && styles.chipSelected, { marginRight: 6 }]}
                                onPress={() => updateField('reason', formData.reason === opt.value ? '' : opt.value as any)}
                            >
                                <Text style={[styles.chipText, formData.reason === opt.value && styles.chipTextSelected]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

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
                            <Text style={styles.saveButtonText}>Registrar Traslado</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <AnimalPickerModal
                visible={animalPickerVisible}
                onClose={() => setAnimalPickerVisible(false)}
                onSelect={(code) => updateField('animalCode', code)}
            />
            <LotSelectorModal
                visible={lotPickerVisible}
                onClose={() => setLotPickerVisible(false)}
                onSelect={(lot) => {
                    updateField('destLotId', lot.id);
                    updateField('destLotName', lot.name);
                }}
                title="Seleccionar lote destino"
            />
        </KeyboardAvoidingView>
    );
}
