import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { LotSelectorModal } from '../../../../../../components/common/LotSelectorModal';
import { Colors } from '../../../../../../constants/theme';
import { useGetAnimalsData } from '../../../../../../hooks/Animals/offline/use-GetAnimalsData';
import { useAnimalPurchase, type NewPurchaseAnimalRow } from '../../../../../../hooks/movements/use-AnimalPurchase';
import { breedingFormStyles as styles } from '../breeding/_breedingFormStyles';

const EMPTY_ANIMAL: NewPurchaseAnimalRow = {
    code: '', sex: 'F', idBreed: 0, breedName: '', idAnimalClass: 0, className: '',
    birthdate: new Date().toISOString().split('T')[0], weight: '', idLot: '', lotName: '',
};

function AddAnimalModal({
    visible, onClose, onAdd,
}: { visible: boolean; onClose: () => void; onAdd: (a: NewPurchaseAnimalRow) => void }) {
    const { breeds, animalClasses } = useGetAnimalsData();
    const [row, setRow] = useState<NewPurchaseAnimalRow>(EMPTY_ANIMAL);
    const [lotPickerVisible, setLotPickerVisible] = useState(false);
    const [rowError, setRowError] = useState<string | null>(null);

    const update = <K extends keyof NewPurchaseAnimalRow>(field: K, value: NewPurchaseAnimalRow[K]) => {
        setRow((prev) => ({ ...prev, [field]: value }));
        setRowError(null);
    };

    const selectBreed = (id: number, name: string) => setRow((prev) => ({ ...prev, idBreed: id, breedName: name }));
    const selectClass = (id: number, name: string) => setRow((prev) => ({ ...prev, idAnimalClass: id, className: name }));

    const filteredClasses = animalClasses.filter((c) => c.sex === row.sex);

    const handleAdd = () => {
        if (!row.code.trim()) { setRowError('El código es obligatorio.'); return; }
        if (!row.idBreed) { setRowError('Seleccioná la raza.'); return; }
        if (!row.idAnimalClass) { setRowError('Seleccioná la categoría.'); return; }
        if (!row.birthdate) { setRowError('La fecha de nacimiento es obligatoria.'); return; }
        onAdd(row);
        setRow(EMPTY_ANIMAL);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary }}>Nuevo animal</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <Text style={styles.label}>CÓDIGO *</Text>
                        <TextInput style={styles.input} placeholder="Código de caravana" value={row.code} onChangeText={(v) => update('code', v)} autoCapitalize="characters" />

                        <Text style={styles.label}>SEXO *</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            {(['F', 'M'] as const).map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, row.sex === s && styles.chipSelected]}
                                    onPress={() => update('sex', s)}
                                >
                                    <Text style={[styles.chipText, row.sex === s && styles.chipTextSelected]}>{s === 'F' ? 'Hembra' : 'Macho'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>RAZA *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {breeds.map((b) => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[styles.chip, row.idBreed === b.id && styles.chipSelected, { marginRight: 6 }]}
                                    onPress={() => selectBreed(b.id, b.name)}
                                >
                                    <Text style={[styles.chipText, row.idBreed === b.id && styles.chipTextSelected]}>{b.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>CATEGORÍA *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {filteredClasses.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.chip, row.idAnimalClass === c.id && styles.chipSelected, { marginRight: 6 }]}
                                    onPress={() => selectClass(c.id, c.name)}
                                >
                                    <Text style={[styles.chipText, row.idAnimalClass === c.id && styles.chipTextSelected]}>{c.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>FECHA DE NACIMIENTO *</Text>
                        <DateSelector value={row.birthdate} onChange={(d) => update('birthdate', d)} label="" />

                        <Text style={styles.label}>PESO (KG)</Text>
                        <TextInput style={styles.input} placeholder="0.00" value={row.weight} onChangeText={(v) => update('weight', v)} keyboardType="decimal-pad" />

                        <Text style={styles.label}>LOTE DE INGRESO</Text>
                        <TouchableOpacity
                            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                            onPress={() => setLotPickerVisible(true)}
                        >
                            <Text style={{ fontSize: 16, color: row.lotName ? Colors.textPrimary : Colors.textDisabled }}>{row.lotName || 'Seleccionar lote (opcional)...'}</Text>
                            <Ionicons name="location-outline" size={18} color={Colors.textDisabled} />
                        </TouchableOpacity>

                        {rowError && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                                <Text style={styles.errorBoxText}>{rowError}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#8B5CF6', marginTop: 12 }]} onPress={handleAdd}>
                            <Ionicons name="add-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Agregar a la compra</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
            <LotSelectorModal
                visible={lotPickerVisible}
                onClose={() => setLotPickerVisible(false)}
                onSelect={(lot) => { update('idLot', lot.id); update('lotName', lot.name); }}
                title="Seleccionar lote de ingreso"
            />
        </Modal>
    );
}

export default function PurchaseForm() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { formData, updateField, addAnimal, removeAnimal, saveRecord, resetForm, loading, error } = useAnimalPurchase();
    const [addAnimalVisible, setAddAnimalVisible] = useState(false);

    const handleSave = async () => {
        const count = formData.animals.length;
        const ok = await saveRecord();
        if (ok) {
            Alert.alert(
                'Compra registrada',
                `Se registró la compra de ${count} animal${count === 1 ? '' : 'es'}.`,
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
                    <Text style={styles.sectionTitle}>Animales nuevos ({formData.animals.length})</Text>
                    {formData.animals.map((a, i) => (
                        <View key={`${a.code}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < formData.animals.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
                            <View>
                                <Text style={{ fontSize: 16, color: Colors.textPrimary, fontWeight: 'bold' }}>{a.code}</Text>
                                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{a.breedName} · {a.className} · {a.sex === 'F' ? 'Hembra' : 'Macho'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeAnimal(i)}>
                                <Ionicons name="close-circle" size={22} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }]}
                        onPress={() => setAddAnimalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 16, color: Colors.textDisabled }}>Agregar animal nuevo...</Text>
                        <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
                    </TouchableOpacity>
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

            <AddAnimalModal visible={addAnimalVisible} onClose={() => setAddAnimalVisible(false)} onAdd={addAnimal} />
        </KeyboardAvoidingView>
    );
}
