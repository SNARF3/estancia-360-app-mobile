import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalMultiPickerModal } from '../../../../../../components/common/AnimalMultiPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { useAnimalRanchExit } from '../../../../../../hooks/movements/use-AnimalRanchExit';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

export default function RanchExitForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { formData, updateField, addAnimals, removeAnimal, saveRecord, resetForm, loading, error } = useAnimalRanchExit();
    const [pickerVisible, setPickerVisible] = useState(false);

    const handleSave = async () => {
        const count = formData.animals.length;
        Alert.alert(
            'Confirmar salida',
            `${count} animal${count === 1 ? '' : 'es'} saldrá${count === 1 ? '' : 'n'} definitivamente hacia "${formData.destinationRanch}". Esta acción es IRREVERSIBLE. ¿Continuar?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar salida', style: 'destructive', onPress: async () => {
                        const ok = await saveRecord();
                        if (ok) {
                            Alert.alert('Salida registrada', `${count} animal${count === 1 ? '' : 'es'} registrado${count === 1 ? '' : 's'} como salida a otra estancia.`, [
                                { text: 'Nueva salida', onPress: resetForm },
                                { text: 'Volver', onPress: () => router.back() },
                            ]);
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
                    <Text style={styles.title}>Salida a Otra Estancia</Text>
                    <Text style={styles.subtitle}>Movimientos del rodeo</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="exit-outline" size={22} color="#F59E0B" />
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
                        <Ionicons name="add-circle-outline" size={20} color="#F59E0B" />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos de la Salida</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={formData.eventDate} onChange={(d) => updateField('eventDate', d)} label="" />

                    <Text style={styles.label}>ESTANCIA DESTINO *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre de la estancia receptora"
                        value={formData.destinationRanch}
                        onChangeText={(v) => updateField('destinationRanch', v)}
                    />

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
                    style={[styles.saveButton, loading && styles.saveButtonDisabled, { backgroundColor: '#F59E0B' }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Registrar Salida</Text>
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
