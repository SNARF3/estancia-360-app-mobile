import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { useAnimalRegister } from '../../../../../../hooks/Animals/offline/use-AnimalRegister';
import { AnimalBreed } from '../../../../../../hooks/Animals/offline/use-GetAnimalsData';
import { Animal, useGetListAnimals } from '../../../../../../hooks/Animals/offline/use-GetListAnimals';
import { getDb } from '../../../../../../hooks/db.sqlite/db-pool';

export default function AddAnimalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { from } = useLocalSearchParams<{ from?: string }>();

    const handleBack = () => {
        if (from === 'registros') {
            router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
        } else {
            router.back();
        }
    };
    // const { breeds, loading: loadingBreeds } = useGetAnimalsData();
    const [breeds] = useState<any[]>([]); // Placeholder for types
    const loadingBreeds = false;
    const { animals, loading: loadingAnimals } = useGetListAnimals();
    const { registerAnimal, loading: registering, error: registerError } = useAnimalRegister();

    const initialFormData = {
        code: '',
        codeMother: null as string | null,
        codeFather: null as string | null,
        idBreed: 1, // Default breed ID
        birthdate: new Date().toISOString().split('T')[0],
        weight: '',
        sex: 'F' as 'M' | 'F',
        isCastrated: false,
        isSterilized: false,
        hasCalved: false,
        idAnimalClass: null as number | null,
    };

    const [formData, setFormData] = useState(initialFormData);
    const [breedModalVisible, setBreedModalVisible] = useState(false);
    const [motherModalVisible, setMotherModalVisible] = useState(false);
    const [fatherModalVisible, setFatherModalVisible] = useState(false);
    const [selectedBreedName, setSelectedBreedName] = useState('VACA'); // Default name
    const [selectedClassName, setSelectedClassName] = useState('Seleccionar clase');
    const [searchQuery, setSearchQuery] = useState('');
    const [dbClasses, setDbClasses] = useState<{ id: number; name: string; sex: string | null }[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const db = await getDb();
                const rows = await db.getAllAsync<{ id: number; name: string; sex: string | null }>(
                    `SELECT id, name, sex FROM animal_classes WHERE is_active = 1 ORDER BY name`
                );
                setDbClasses(rows);
            } catch {}
        })();
    }, []);

    const mothers = useMemo(() => animals.filter(a => a.sex === 'F'), [animals]);
    const fathers = useMemo(() => animals.filter(a => a.sex === 'M'), [animals]);

    const filteredClasses = useMemo(() => {
        return dbClasses.filter(c => !c.sex || c.sex === formData.sex || c.sex === 'any');
    }, [dbClasses, formData.sex]);

    const filteredMothers = mothers.filter(a =>
        (a.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFathers = fathers.filter(a =>
        (a.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const updateField = (field: string, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'sex') {
                if (value === 'F') next.isCastrated = false;
                else { next.isSterilized = false; next.hasCalved = false; }
                // Reset class if sex changes
                next.idAnimalClass = null;
                setSelectedClassName('Seleccionar clase');
            }
            return next;
        });
    };

    const selectBreed = (breed: AnimalBreed) => {
        updateField('idBreed', breed.id);
        setSelectedBreedName(breed.name);
        setBreedModalVisible(false);
    };

    const [classModalVisible, setClassModalVisible] = useState(false);
    const [addClassExpanded, setAddClassExpanded] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassSex, setNewClassSex] = useState<'M' | 'F' | 'any'>('any');
    const [newClassPs, setNewClassPs] = useState(1);
    const [creatingClass, setCreatingClass] = useState(false);

    const selectClass = (ac: any) => {
        updateField('idAnimalClass', ac.id);
        setSelectedClassName(ac.name);
        const name = ac.name.toLowerCase();
        if (name.includes('castrado')) updateField('isCastrated', true);
        if (name.includes('esterilizada')) updateField('isSterilized', true);
        if (name.includes('vaca')) updateField('hasCalved', true);
        setClassModalVisible(false);
        setAddClassExpanded(false);
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        setCreatingClass(true);
        try {
            const db = await getDb();
            const result = await db.runAsync(
                `INSERT INTO animal_classes (name, sex, default_productive_status, is_active) VALUES (?,?,?,1)`,
                [newClassName.trim(), newClassSex === 'any' ? null : newClassSex, newClassPs]
            );
            const createdId = result.lastInsertRowId as number;
            const created = { id: createdId, name: newClassName.trim(), sex: newClassSex === 'any' ? null : newClassSex };
            setDbClasses(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            selectClass(created);
            setNewClassName('');
            setNewClassSex('any');
            setNewClassPs(1);
        } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo crear la clase.');
        } finally {
            setCreatingClass(false);
        }
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

    const handleSave = async () => {
        if (!formData.code.trim()) {
            Alert.alert('Error', 'El código/arete es obligatorio.');
            return;
        }
        /* 
        if (!formData.idBreed) {
            Alert.alert('Error', 'La raza es obligatoria.');
            return;
        } 
        */
        if (!formData.weight || isNaN(parseFloat(formData.weight))) {
            Alert.alert('Error', 'El peso es obligatorio.');
            return;
        }
        if (!formData.idAnimalClass) {
            Alert.alert('Error', 'La clase de animal es obligatoria.');
            return;
        }

        const success = await registerAnimal({
            code: formData.code,
            codeMother: formData.codeMother,
            codeFather: formData.codeFather,
            idBreed: formData.idBreed,
            idStatus: 1,
            birthdate: formData.birthdate,
            weight: parseFloat(formData.weight),
            sex: formData.sex,
            isCastrated: formData.isCastrated,
            isSterilized: formData.isSterilized,
            hasCalved: formData.hasCalved,
            id_animal_class: formData.idAnimalClass ?? undefined,
        });

        if (success) {
            Alert.alert(
                'Registro Exitoso',
                'El animal ha sido guardado localmente. Se sincronizará cuando haya conexión.',
                [{
                    text: 'OK',
                    onPress: () => {
                        setFormData(initialFormData);
                        setSelectedBreedName('VACA');
                        setSelectedClassName('Seleccionar clase');
                        handleBack();
                    },
                }]
            );
        } else if (registerError) {
            Alert.alert('Error', registerError);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <ScreenContainer scrollable={false} style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
                        {/* ── Datos principales ─────────────────────────── */}
                        <View style={styles.card}>
                            <Text style={styles.label}>NÚMERO DE ARETE / CÓDIGO *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: GP-1234"
                                value={formData.code}
                                onChangeText={(t) => updateField('code', t)}
                                placeholderTextColor={Colors.textDisabled}
                                autoCapitalize="characters"
                            />

                            <View style={styles.row}>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.label}>GÉNERO *</Text>
                                    <View style={styles.genderContainer}>
                                        <TouchableOpacity
                                            style={[styles.genderOption, formData.sex === 'M' && styles.genderOptionSelected]}
                                            onPress={() => updateField('sex', 'M')}
                                        >
                                            <Text style={[styles.genderText, formData.sex === 'M' && styles.genderTextSelected]}>
                                                MACHO
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.genderOption, formData.sex === 'F' && styles.genderOptionSelected]}
                                            onPress={() => updateField('sex', 'F')}
                                        >
                                            <Text style={[styles.genderText, formData.sex === 'F' && styles.genderTextSelected]}>
                                                HEMBRA
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.label}>PESO (KG) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej: 450"
                                        value={formData.weight}
                                        onChangeText={(t) => updateField('weight', t)}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textDisabled}
                                    />
                                </View>
                            </View>

                            {/*
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
                            */}

                            <DateSelector
                                label="FECHA DE NACIMIENTO"
                                value={formData.birthdate}
                                onChange={(date) => updateField('birthdate', date)}
                            />

                            <Text style={styles.label}>TIPO / CLASE DE ANIMAL *</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setClassModalVisible(true)}
                            >
                                <Text style={{ color: formData.idAnimalClass ? Colors.textPrimary : Colors.textDisabled }}>
                                    {selectedClassName}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={Colors.textDisabled} />
                            </TouchableOpacity>
                        </View>

                        {/* ── Genealogía ────────────────────────────────── */}
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

                        {/* ── Estado y Salud ────────────────────────────── */}
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
                                        onValueChange={(v) => updateField('isCastrated', v)}
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
                                            onValueChange={(v) => updateField('isSterilized', v)}
                                            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                            thumbColor={formData.isSterilized ? Colors.primary : Colors.white}
                                        />
                                    </View>
                                    <View style={[styles.flagRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 }]}>
                                        <Text style={styles.flagLabel}>¿Ha parido anteriormente?</Text>
                                        <Switch
                                            value={formData.hasCalved}
                                            onValueChange={(v) => updateField('hasCalved', v)}
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
                                El animal se guardará localmente y se sincronizará con el servidor cuando haya conexión.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, registering && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={registering}
                        >
                            {registering
                                ? <ActivityIndicator color={Colors.white} />
                                : <Text style={styles.saveButtonText}>GUARDAR ANIMAL</Text>
                            }
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ScreenContainer>

            {/* ── Modales de selección ──────────────────────────────── */}
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
                isAnimal
                allowNull
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
                isAnimal
                allowNull
            />
            {/* Modal de selección + creación de clase */}
            <Modal visible={classModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar Clase</Text>
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setAddClassExpanded(v => !v)}
                                    style={[styles.addClassToggle, addClassExpanded && styles.addClassToggleActive]}
                                >
                                    <Ionicons name={addClassExpanded ? 'remove' : 'add'} size={16} color={addClassExpanded ? Colors.white : Colors.primary} />
                                    <Text style={[styles.addClassToggleTxt, addClassExpanded && { color: Colors.white }]}>Nueva</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setClassModalVisible(false); setAddClassExpanded(false); }}>
                                    <Ionicons name="close" size={28} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {addClassExpanded && (
                            <View style={styles.addClassForm}>
                                <Text style={styles.addClassLabel}>NOMBRE DE LA CLASE</Text>
                                <TextInput
                                    style={styles.addClassInput}
                                    placeholder="Ej: Torillo, Vaquillona..."
                                    value={newClassName}
                                    onChangeText={setNewClassName}
                                    autoFocus
                                />
                                <Text style={styles.addClassLabel}>SEXO</Text>
                                <View style={styles.addClassPickers}>
                                    {([['M', 'Macho'], ['F', 'Hembra'], ['any', 'Ambos']] as const).map(([v, l]) => (
                                        <TouchableOpacity
                                            key={v}
                                            style={[styles.addClassChip, newClassSex === v && styles.addClassChipActive]}
                                            onPress={() => setNewClassSex(v)}
                                        >
                                            <Text style={[styles.addClassChipTxt, newClassSex === v && styles.addClassChipTxtActive]}>{l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.addClassLabel}>ETAPA PRODUCTIVA</Text>
                                <View style={styles.addClassPickers}>
                                    {([[ 1, 'Cría'], [2, 'Recría'], [3, 'Engorde']] as const).map(([v, l]) => (
                                        <TouchableOpacity
                                            key={v}
                                            style={[styles.addClassChip, newClassPs === v && styles.addClassChipActive]}
                                            onPress={() => setNewClassPs(v)}
                                        >
                                            <Text style={[styles.addClassChipTxt, newClassPs === v && styles.addClassChipTxtActive]}>{l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={[styles.addClassBtn, (!newClassName.trim() || creatingClass) && { opacity: 0.5 }]}
                                    onPress={handleCreateClass}
                                    disabled={!newClassName.trim() || creatingClass}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                                    <Text style={styles.addClassBtnTxt}>{creatingClass ? 'Creando...' : 'Crear y seleccionar'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <ScrollView>
                            {filteredClasses.length > 0 ? (
                                filteredClasses.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.breedItem}
                                        onPress={() => selectClass(item)}
                                    >
                                        <Text style={styles.breedItemText}>{item.name}</Text>
                                        {formData.idAnimalClass === item.id && (
                                            <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Text style={styles.breedItemText}>Sin clases disponibles</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Modal de selección ───────────────────────────────────────────────────────

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
    visible, onClose, title, data, loading, onSelect,
    selectedValue, searchQuery = '', onSearch = null, isAnimal = false, allowNull = false,
}: SelectionModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
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
                                <TouchableOpacity style={styles.breedItem} onPress={() => onSelect(null)}>
                                    <Text style={[styles.breedItemText, { color: Colors.primary, fontWeight: '700' }]}>
                                        DESCONOCIDO
                                    </Text>
                                    {!selectedValue && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                            {data.length > 0 ? (
                                data.map((item: any) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.breedItem}
                                        onPress={() => onSelect(item)}
                                    >
                                        <View>
                                            <Text style={styles.breedItemText}>
                                                {isAnimal ? item.code : item.name}
                                            </Text>
                                            {isAnimal && (
                                                <Text style={styles.breedItemSubtext}>
                                                    Raza: {item.breed?.name} | Peso: {item.weight ?? '—'}kg
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Colors.background },
    container: { flex: 1, paddingHorizontal: Spacing.lg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
    },
    backButton: { padding: 5, marginRight: Spacing.sm },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },
    scrollContent: { paddingBottom: 40 },
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
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfWidth: { width: '48%' },
    genderContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    genderOption: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    genderOptionSelected: { backgroundColor: Colors.primary },
    genderText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
    genderTextSelected: { color: Colors.white },
    flagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    flagLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
    flagSublabel: { ...Typography.bodySmall, color: Colors.textSecondary, fontSize: 11 },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.successLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    infoText: { ...Typography.bodySmall, color: Colors.success, marginLeft: Spacing.sm, flex: 1 },
    saveButton: { backgroundColor: Colors.primaryButton, height: 60, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, ...Shadows.floatingButton },
    saveButtonDisabled: { backgroundColor: Colors.textDisabled },
    saveButtonText: { color: Colors.white, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%', ...Shadows.card },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    modalTitle: { ...Typography.h3, color: Colors.primary, fontWeight: '800' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
    searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: Spacing.sm, fontSize: 16, color: Colors.textPrimary },
    breedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    breedItemText: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500' },
    breedItemSubtext: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },

    addClassToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.primary,
    },
    addClassToggleActive: { backgroundColor: Colors.primary },
    addClassToggleTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },

    addClassForm: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        gap: 4,
    },
    addClassLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, marginTop: 6 },
    addClassInput: {
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 15, color: Colors.textPrimary, marginTop: 4,
    },
    addClassPickers: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    addClassChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
    },
    addClassChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    addClassChipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    addClassChipTxtActive: { color: Colors.white },
    addClassBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: 10,
        paddingVertical: 10, marginTop: 10,
    },
    addClassBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
});