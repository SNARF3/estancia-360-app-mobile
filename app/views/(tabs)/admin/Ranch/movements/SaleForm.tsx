import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalMultiPickerModal } from '../../../../../../components/common/AnimalMultiPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { useAnimalSale } from '../../../../../../hooks/movements/use-AnimalSale';
import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles';

export default function SaleForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { formData, updateField, addAnimals, removeAnimal, saveRecord, resetForm, loading, error } = useAnimalSale();
    const [pickerVisible, setPickerVisible] = useState(false);

    const handleSave = async () => {
        const count = formData.animals.length;
        const ok = await saveRecord();
        if (ok) {
            Alert.alert(
                'Venta registrada',
                `La venta de ${count} animal${count === 1 ? '' : 'es'} quedó pendiente de confirmación.`,
                [
                    { text: 'Nueva venta', onPress: resetForm },
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
                    <Text style={styles.title}>Registrar Venta</Text>
                    <Text style={styles.subtitle}>Movimientos del rodeo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.success + '20' }]}>
                    <Ionicons name="cash-outline" size={22} color={Colors.success} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Animales ({formData.animals.length})</Text>
                    {formData.animals.map((a) => (
                        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                            <Text style={{ fontSize: 16, color: Colors.textPrimary, fontWeight: 'bold' }}>{a.code}</Text>
                            <TouchableOpacity onPress={() => removeAnimal(a.id)}>
                                <Ionicons name="close-circle" size={22} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }]}
                        onPress={() => setPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: Colors.textDisabled }}>Agregar animales...</Text>
                        <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos de la Venta</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

                    <Text style={styles.label}>COMPRADOR *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del comprador o frigorífico"
                        value={formData.buyer}
                        onChangeText={(v) => updateField('buyer', v)}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>PRECIO TOTAL ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={formData.totalPrice}
                                onChangeText={(v) => updateField('totalPrice', v)}
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
                    style={[styles.saveButton, loading && styles.saveButtonDisabled, { backgroundColor: Colors.success }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Registrar Venta</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <AnimalMultiPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onConfirm={addAnimals}
                initialSelected={formData.animals.map((a) => a.code)}
            />
        </KeyboardAvoidingView>
    );
}
