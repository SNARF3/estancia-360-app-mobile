import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalPickerModal } from '../../../../../../components/common/AnimalPickerModal';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { getSession } from '../../../../../../hooks/auth/use-Auth';
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';
import { registerSale } from '../../../../../../hooks/db.sqlite/repositories/events';
import { breedingFormStyles as styles } from '../breeding/breedingFormStyles';

export default function SaleForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { animalCode: paramCode } = useLocalSearchParams<{ animalCode?: string }>();

    const [animalCode, setAnimalCode] = useState('');
    const [buyer, setBuyer] = useState('');
    const [destination, setDestination] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [pricePerKg, setPricePerKg] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        if (paramCode) setAnimalCode(paramCode.toUpperCase());
    }, [paramCode]);

    const handleSave = async () => {
        setError(null);
        if (!animalCode.trim()) { setError('El código del animal es obligatorio.'); return; }
        if (!eventDate) { setError('La fecha es obligatoria.'); return; }

        setLoading(true);
        try {
            const session = await getSession();
            if (!session) throw new Error('No hay sesión activa.');
            const db = await getDb();

            const animal = await db.getFirstAsync<{ id: string }>(
                `SELECT id FROM ranch_animals WHERE id_ranch = ? AND code = ? COLLATE NOCASE LIMIT 1`,
                [session.id_ranch, animalCode.trim()]
            );
            if (!animal) { setError(`No se encontró el animal "${animalCode}".`); setLoading(false); return; }

            await registerSale({
                id_user: session.id_user,
                id_ranch_animal: animal.id,
                buyer: buyer || undefined,
                destination: destination || undefined,
                sale_price: salePrice ? parseFloat(salePrice) : undefined,
                price_per_kg: pricePerKg ? parseFloat(pricePerKg) : undefined,
                event_date: new Date(eventDate).toISOString(),
                notes: notes || undefined,
            });

            Alert.alert(
                'Venta registrada',
                `La venta de ${animalCode} fue registrada exitosamente.`,
                [
                    { text: 'Nueva venta', onPress: () => { setAnimalCode(''); setBuyer(''); setDestination(''); setSalePrice(''); setPricePerKg(''); setNotes(''); setError(null); } },
                    { text: 'Volver', onPress: () => router.back() },
                ]
            );
        } catch (e: any) {
            setError(e.message ?? 'Error al registrar la venta.');
        } finally {
            setLoading(false);
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
                    <Text style={styles.sectionTitle}>Animal</Text>
                    <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: animalCode ? Colors.textPrimary : Colors.textDisabled }}>
                            {animalCode || 'Buscar animal...'}
                        </Text>
                        <Ionicons name="search" size={18} color={Colors.textDisabled} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Datos de la Venta</Text>

                    <Text style={styles.label}>FECHA *</Text>
                    <DateSelector value={eventDate} onChange={setEventDate} label="" />

                    <Text style={styles.label}>COMPRADOR</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del comprador o frigorífico"
                        value={buyer}
                        onChangeText={setBuyer}
                    />

                    <Text style={styles.label}>DESTINO</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Frigorífico, estancia, mercado..."
                        value={destination}
                        onChangeText={setDestination}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>PRECIO TOTAL ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={salePrice}
                                onChangeText={setSalePrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>PRECIO / KG ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={pricePerKg}
                                onChangeText={setPricePerKg}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>OBSERVACIONES</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Notas adicionales..."
                        value={notes}
                        onChangeText={setNotes}
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

            <AnimalPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(code) => setAnimalCode(code)}
            />
        </KeyboardAvoidingView>
    );
}
