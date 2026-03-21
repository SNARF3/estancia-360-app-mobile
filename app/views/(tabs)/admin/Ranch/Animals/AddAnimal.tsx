import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { useAnimalRegister } from '../../../../../../hooks/Animals/use-AnimalRegister';
import { AnimalBreed, useGetAnimalsData } from '../../../../../../hooks/Animals/use-GetAnimalsData';
import { Animal, useGetListAnimals } from '../../../../../../hooks/Animals/use-GetListAnimals';

export default function AddAnimalScreen() {
    const router = useRouter();
    const { breeds, loading: loadingBreeds } = useGetAnimalsData();
    const { animals, loading: loadingAnimals } = useGetListAnimals();
    const { registerAnimal, loading: registering } = useAnimalRegister();

    const initialFormData = {
        code: '',
        codeMother: null as string | null,
        codeFather: null as string | null,
        idBreed: null as number | null,
        idStatus: 1, // "OK" by default
        birthdate: new Date().toISOString().split('T')[0],
        weight: '',
        sex: 'F' as 'M' | 'F',
        isCastrated: false,
        isSterilized: false,
        hasCalved: false
    };

    const [formData, setFormData] = useState(initialFormData);

    const [breedModalVisible, setBreedModalVisible] = useState(false);
    const [motherModalVisible, setMotherModalVisible] = useState(false);
    const [fatherModalVisible, setFatherModalVisible] = useState(false);

    const [selectedBreedName, setSelectedBreedName] = useState('Seleccionar raza');
    const [searchQuery, setSearchQuery] = useState('');

    const mothers = useMemo(() => {
        return animals.filter(a => a.sex === 'F');
    }, [animals]);

    const fathers = useMemo(() => {
        return animals.filter(a => a.sex === 'M');
    }, [animals]);

    const filteredMothers = mothers.filter(a =>
        (a.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFathers = fathers.filter(a =>
        (a.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = async () => {
        if (!formData.code || !formData.idBreed || !formData.weight) {
            Alert.alert('Error', 'Por favor complete todos los campos obligatorios.');
            return;
        }

        const success = await registerAnimal({
            code: formData.code,
            codeMother: formData.codeMother,
            codeFather: formData.codeFather,
            idBreed: formData.idBreed,
            idStatus: formData.idStatus,
            birthdate: formData.birthdate,
            weight: parseFloat(formData.weight),
            sex: formData.sex,
            isCastrated: formData.isCastrated,
            isSterilized: formData.isSterilized,
            hasCalved: formData.hasCalved
        });

        if (success) {
            Alert.alert('Registro Exitoso', 'El animal ha sido registrado correctamente.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setFormData(initialFormData);
                        setSelectedBreedName('Seleccionar raza');
                        router.back();
                    }
                }
            ]);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Sex-based validations
            if (field === 'sex') {
                if (value === 'F') {
                    newData.isCastrated = false;
                } else {
                    newData.isSterilized = false;
                    newData.hasCalved = false;
                }
            }

            return newData;
        });
    };

    const selectBreed = (breed: AnimalBreed) => {
        updateField('idBreed', breed.id);
        setSelectedBreedName(breed.name);
        setBreedModalVisible(false);
    };

    const selectMother = (animal: Animal | null) => {
        updateField('codeMother', animal ? animal.code : null);
        setMotherModalVisible(false);
        setSearchQuery('');
    };

    const selectFather = (animal: Animal | null) => {
        updateField('codeFather', animal ? animal.code : null);
        setFatherModalVisible(false);
        setSearchQuery('');
    };

    return (
        <View style={styles.mainContainer}>
            <ScreenContainer scrollable={false} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Nuevo Registro</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.card}>
                            <Text style={styles.label}>NÚMERO DE ARETE / CÓDIGO *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: GP-1234"
                                value={formData.code}
                                onChangeText={(text) => updateField('code', text)}
                                placeholderTextColor={Colors.textDisabled}
                            />

                            <View style={styles.row}>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.label}>GÉNERO *</Text>
                                    <View style={styles.genderContainer}>
                                        <TouchableOpacity
                                            style={[styles.genderOption, formData.sex === 'M' && styles.genderOptionSelected]}
                                            onPress={() => updateField('sex', 'M')}
                                        >
                                            <Text style={[styles.genderText, formData.sex === 'M' && styles.genderTextSelected]}>MACHO</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.genderOption, formData.sex === 'F' && styles.genderOptionSelected]}
                                            onPress={() => updateField('sex', 'F')}
                                        >
                                            <Text style={[styles.genderText, formData.sex === 'F' && styles.genderTextSelected]}>HEMBRA</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.label}>PESO (KG) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: 450"
                                        value={formData.weight}
                                        onChangeText={(text) => updateField('weight', text)}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textDisabled}
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>RAZA *</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setBreedModalVisible(true)}
                            >
                                <Text style={{ color: formData.idBreed ? Colors.textPrimary : Colors.textDisabled }}>
                                    {selectedBreedName}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={Colors.textDisabled} />
                            </TouchableOpacity>

                            <DateSelector
                                label="FECHA DE NACIMIENTO"
                                value={formData.birthdate}
                                onChange={(date) => updateField('birthdate', date)}
                            />
                        </View>

                        <Text style={styles.sectionTitle}>GENEALOGÍA</Text>
                        <View style={styles.card}>
                            <Text style={styles.label}>MADRE</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setMotherModalVisible(true)}
                            >
                                <Text style={{ color: formData.codeMother ? Colors.textPrimary : Colors.textDisabled }}>
                                    {formData.codeMother || 'Seleccionar madre (opcional)'}
                                </Text>
                                <Ionicons name="search" size={20} color={Colors.textDisabled} />
                            </TouchableOpacity>

                            <Text style={styles.label}>PADRE</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setFatherModalVisible(true)}
                            >
                                <Text style={{ color: formData.codeFather ? Colors.textPrimary : Colors.textDisabled }}>
                                    {formData.codeFather || 'Seleccionar padre (opcional)'}
                                </Text>
                                <Ionicons name="search" size={20} color={Colors.textDisabled} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>ESTADO Y SALUD</Text>
                        <View style={styles.card}>
                            {formData.sex === 'M' && (
                                <View style={styles.flagRow}>
                                    <View>
                                        <Text style={styles.flagLabel}>¿Está castrado?</Text>
                                        <Text style={styles.flagSublabel}>Solo aplica para machos</Text>
                                    </View>
                                    <Switch
                                        value={formData.isCastrated}
                                        onValueChange={(val) => updateField('isCastrated', val)}
                                        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                        thumbColor={formData.isCastrated ? Colors.primary : Colors.white}
                                    />
                                </View>
                            )}

                            {formData.sex === 'F' && (
                                <>
                                    <View style={styles.flagRow}>
                                        <View>
                                            <Text style={styles.flagLabel}>¿Está esterilizada?</Text>
                                            <Text style={styles.flagSublabel}>Solo aplica para hembras</Text>
                                        </View>
                                        <Switch
                                            value={formData.isSterilized}
                                            onValueChange={(val) => updateField('isSterilized', val)}
                                            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                            thumbColor={formData.isSterilized ? Colors.primary : Colors.white}
                                        />
                                    </View>
                                    <View style={[styles.flagRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
                                        <View>
                                            <Text style={styles.flagLabel}>¿Ha parido anteriormente?</Text>
                                        </View>
                                        <Switch
                                            value={formData.hasCalved}
                                            onValueChange={(val) => updateField('hasCalved', val)}
                                            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                            thumbColor={formData.hasCalved ? Colors.primary : Colors.white}
                                        />
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                            <Text style={styles.infoText}>
                                El estado de salud se establecerá como "Activo" por defecto al registrar.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, (registering) && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={registering}
                        >
                            {registering ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.saveButtonText}>GUARDAR ANIMAL</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ScreenContainer>

            {/* Selection Modals */}
            <SelectionModal
                visible={breedModalVisible}
                onClose={() => setBreedModalVisible(false)}
                title="Seleccionar Raza"
                data={breeds}
                loading={loadingBreeds}
                onSelect={selectBreed}
                selectedValue={formData.idBreed}
            />

            <SelectionModal
                visible={motherModalVisible}
                onClose={() => setMotherModalVisible(false)}
                title="Seleccionar Madre"
                data={filteredMothers}
                loading={loadingAnimals}
                onSelect={selectMother}
                selectedValue={formData.codeMother}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                isAnimal={true}
                allowNull={true}
            />

            <SelectionModal
                visible={fatherModalVisible}
                onClose={() => setFatherModalVisible(false)}
                title="Seleccionar Padre"
                data={filteredFathers}
                loading={loadingAnimals}
                onSelect={selectFather}
                selectedValue={formData.codeFather}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                isAnimal={true}
                allowNull={true}
            />
        </View>
    );
}

interface SelectionModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    loading: boolean;
    onSelect: (item: any) => void;
    selectedValue: any;
    searchQuery?: string;
    onSearch?: ((text: string) => void) | null;
    isAnimal?: boolean;
    allowNull?: boolean;
}

function SelectionModal({
    visible,
    onClose,
    title,
    data,
    loading,
    onSelect,
    selectedValue,
    searchQuery = '',
    onSearch = null,
    isAnimal = false,
    allowNull = false
}: SelectionModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {onSearch && (
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={Colors.textDisabled} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar por código..."
                                value={searchQuery}
                                onChangeText={onSearch}
                                placeholderTextColor={Colors.textDisabled}
                            />
                        </View>
                    )}

                    {loading ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ margin: Spacing.xl }} />
                    ) : (
                        <ScrollView>
                            {allowNull && (
                                <TouchableOpacity
                                    style={styles.breedItem}
                                    onPress={() => onSelect(null)}
                                >
                                    <Text style={[styles.breedItemText, { color: Colors.primary, fontWeight: '700' }]}>DESCONOCIDO (NULL)</Text>
                                    {!selectedValue && (
                                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            {data && data.length > 0 ? (
                                data.map((item: any) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.breedItem}
                                        onPress={() => onSelect(item)}
                                    >
                                        <View>
                                            <Text style={styles.breedItemText}>{isAnimal ? item.code : item.name}</Text>
                                            {isAnimal && (
                                                <Text style={styles.breedItemSubtext}>
                                                    Raza: {item.breed?.name} | Peso: {item.weight}kg
                                                </Text>
                                            )}
                                        </View>
                                        {(isAnimal ? selectedValue === item.code : selectedValue === item.id) && (
                                            <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                                    <Text style={styles.breedItemText}>No se encontraron resultados</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 15,
    },
    backButton: {
        padding: 5,
        marginRight: Spacing.sm,
    },
    title: {
        ...Typography.h2,
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 24,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.overline,
        color: Colors.primary,
        fontWeight: '800',
        marginBottom: Spacing.xs,
        marginLeft: 4,
        letterSpacing: 1.5,
    },
    label: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '700',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    genderContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderOptionSelected: {
        backgroundColor: Colors.primary,
    },
    genderText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    genderTextSelected: {
        color: Colors.white,
    },
    flagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    flagLabel: {
        ...Typography.body,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    flagSublabel: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
        fontSize: 11,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.successLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    infoText: {
        ...Typography.bodySmall,
        color: Colors.success,
        marginLeft: Spacing.sm,
        flex: 1,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        height: 60,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
        ...Shadows.floatingButton,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.textDisabled,
    },
    saveButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
        ...Shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalTitle: {
        ...Typography.h3,
        color: Colors.primary,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: Spacing.sm,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    breedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    breedItemText: {
        ...Typography.body,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    breedItemSubtext: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});

