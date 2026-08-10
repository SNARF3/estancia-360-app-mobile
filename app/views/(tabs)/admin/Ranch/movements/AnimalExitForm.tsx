import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { type ExitReason, useAnimalExit } from '../../../../../../hooks/movements/use-AnimalExit';
import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles';

const REASON_OPTIONS: { value: ExitReason; label: string; icon: string; color: string }[] = [
    { value: 'death',   label: 'Muerte',    icon: 'skull-outline',     color: '#EF4444' },
    { value: 'discard', label: 'Descarte',  icon: 'remove-circle-outline', color: '#F97316' },
    { value: 'loss',    label: 'Pérdida',   icon: 'help-circle-outline', color: '#EAB308' },
    { value: 'other',   label: 'Otro',      icon: 'ellipsis-horizontal-circle-outline', color: Colors.textSecondary },
];

export default function AnimalExitForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { animalCode: paramCode } = useLocalSearchParams<{ animalCode?: string }>();
    const { formData, updateField, saveRecord, resetForm, loading, error } = useAnimalExit();
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        if (paramCode) updateField('animalCode', paramCode.toUpperCase());
    }, [paramCode]);

    const handleSave = async () => {
        Alert.alert(
            'Confirmar baja',
            `¿Seguro que querés dar de baja a ${formData.animalCode || 'este animal'}? Esta acción es irreversible.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar baja', style: 'destructive',
                    onPress: async () => {
                        const ok = await saveRecord();
                        if (ok) {
                            Alert.alert(
                                'Baja registrada',
                                `El animal ${formData.animalCode} fue dado de baja.`,
                                [
                                    { text: 'Nueva baja', onPress: resetForm },
                                    { text: 'Volver', onPress: () => router.back() },
                                ]
                            );
                        }
                    },
                },
            ]
        );
    };

    return (
        <KeyboardAvoidingView style={styles.mainContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Registrar Baja</Text>
                    <Text style={styles.subtitle}>Muerte, descarte o pérdida</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.error + '20' }]}>
                    <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Animal</Text>
                    <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: formData.animalCode ? Colors.textPrimary : Colors.textDisabled }}>
                            {formData.animalCode || 'Buscar animal...'}
                        </Text>
                        <Ionicons name="search" size={18} color={Colors.textDisabled} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos de la Baja</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

                    <Text style={styles.label}>MOTIVO *</Text>
                    <View style={local.reasonGrid}>
                        {REASON_OPTIONS.map(opt => {
                            const selected = formData.reason === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[local.reasonCard, selected && { borderColor: opt.color, backgroundColor: opt.color + '12' }]}
                                    onPress={() => updateField('reason', opt.value)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name={opt.icon as any} size={24} color={selected ? opt.color : Colors.textDisabled} />
                                    <Text style={[local.reasonLabel, selected && { color: opt.color, fontWeight: '700' }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>
                        OBSERVACIONES {formData.reason === 'other' ? '*' : ''}
                    </Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder={formData.reason === 'other' ? 'Descripción obligatoria...' : 'Notas adicionales...'}
                        value={formData.notes}
                        onChangeText={(v) => updateField('notes', v)}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color={Colors.error} />
                        <Text style={styles.errorBoxText}>{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled, { backgroundColor: Colors.error }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                    ) : (
                        <>
                            <Ionicons name="close-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Registrar Baja</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <AnimalPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(code) => updateField('animalCode', code)}
            />
        </KeyboardAvoidingView>
    );
}

const local = StyleSheet.create({
    reasonGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
    },
    reasonCard: {
        width: '47%', alignItems: 'center', paddingVertical: 14,
        borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: '#FAFAFA', gap: 6,
    },
    reasonLabel: {
        fontSize: 13, color: Colors.textSecondary, fontWeight: '500',
    },
});
