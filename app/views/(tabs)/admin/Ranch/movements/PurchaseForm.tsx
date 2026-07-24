import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { useAnimalPurchase } from '../../../../../../hooks/movements/use-AnimalPurchase';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';
import { useState } from 'react';

export default function PurchaseForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { animalCode: paramCode } = useLocalSearchParams<{ animalCode?: string }>();
    const { formData, updateField, saveRecord, resetForm, loading, error } = useAnimalPurchase();
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        if (paramCode) updateField('animalCode', paramCode.toUpperCase());
    }, [paramCode]);

    const handleSave = async () => {
        const ok = await saveRecord();
        if (ok) {
            Alert.alert(
                'Compra registrada',
                `La compra de ${formData.animalCode} fue registrada exitosamente.`,
                [
                    { text: 'Nueva compra', onPress: resetForm },
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
                    <Text style={styles.title}>Registrar Compra</Text>
                    <Text style={styles.subtitle}>Movimientos del rodeo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="cart-outline" size={22} color="#8B5CF6" />
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
                    <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
                        El animal debe estar previamente registrado en el inventario.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos de la Compra</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

                    <Text style={styles.label}>PROVEEDOR / ORIGEN</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del vendedor o estancia origen"
                        value={formData.supplier}
                        onChangeText={(v) => updateField('supplier', v)}
                    />

                    <Text style={styles.label}>PROCEDENCIA</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Localidad, provincia..."
                        value={formData.origin}
                        onChangeText={(v) => updateField('origin', v)}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>PRECIO TOTAL ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={formData.purchasePrice}
                                onChangeText={(v) => updateField('purchasePrice', v)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>PRECIO / KG ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={formData.pricePerKg}
                                onChangeText={(v) => updateField('pricePerKg', v)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

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
                    style={[styles.saveButton, loading && styles.saveButtonDisabled, { backgroundColor: '#8B5CF6' }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Registrar Compra</Text>
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
