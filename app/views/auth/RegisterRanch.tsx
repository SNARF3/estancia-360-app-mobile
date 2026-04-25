import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

// Componentes UI
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { constants } from '../../../constants/constants';
import { Colors, Spacing, Typography } from '../../../constants/theme';

// HOOKS
import { saveSession } from '../../../hooks/auth/use-Auth';
import { useRegisterRanch } from '../../../hooks/auth/use-RegisterRanch';
import { useUserRegisterLogic } from '../../../hooks/auth/use-UserRegisterLogic';
import { LocationItem, useLocationData } from '../../../hooks/constants/use-LotationData';

// --- Select Component Reutilizable ---
const CustomSelect = ({ label, value, options, onSelect, disabled = false, placeholder = "Seleccionar" }: any) => {
    const [modalVisible, setModalVisible] = useState(false);
    return (
        <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity
                style={[styles.selectButton, disabled && styles.disabledInput]}
                onPress={() => !disabled && setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.selectText, !value && { color: Colors.textSecondary }]}>
                    {value || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccionar {label}</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => { onSelect(item); setModalVisible(false); }}
                                >
                                    <Text style={styles.optionText}>{item.name || item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// --- MultiSelect Component Reutilizable ---
const MultiSelect = ({ label, selectedItems, options, onToggle, disabled = false, placeholder = "Seleccionar varios" }: any) => {
    const [modalVisible, setModalVisible] = useState(false);

    const isSelected = (id: number) => selectedItems.some((item: any) => item.id === id);

    const getDisplayText = () => {
        if (selectedItems.length === 0) return placeholder;
        if (selectedItems.length <= 2) return selectedItems.map((s: any) => s.name).join(', ');
        return `${selectedItems.length} seleccionados`;
    };

    return (
        <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity
                style={[styles.selectButton, disabled && styles.disabledInput]}
                onPress={() => !disabled && setModalVisible(true)}
                activeOpacity={0.7}
            >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                        numberOfLines={1}
                        style={[styles.selectText, selectedItems.length === 0 && { color: Colors.textSecondary }]}
                    >
                        {getDisplayText()}
                    </Text>
                </View>
                <Ionicons name="list" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{label}</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => {
                                const selected = isSelected(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[styles.optionItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                        onPress={() => onToggle(item)}
                                    >
                                        <Text style={[styles.optionText, selected && { color: Colors.primary, fontWeight: 'bold' }]}>
                                            {item.name}
                                        </Text>
                                        {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.doneButtonText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default function RegisterRanchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const rawUserData = params.userData ? JSON.parse(params.userData as string) : null;
    const roleId = rawUserData?.roleId || 2;

    const { countries, regions, cities, loading: loadingLocs, fetchCountries, fetchRegions, fetchCities } = useLocationData();
    const { registerRanch, loading: loadingRanch } = useRegisterRanch();
    const { handleInputChange, handleRegister, loading: loadingUser } = useUserRegisterLogic(roleId);

    // Estados Locales
    const [ranchName, setRanchName] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<LocationItem | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<LocationItem | null>(null);
    const [selectedCity, setSelectedCity] = useState<LocationItem | null>(null);
    const [selectedProductionTypes, setSelectedProductionTypes] = useState<any[]>([]);

    const toggleProductionType = (type: any) => {
        setSelectedProductionTypes(prev =>
            prev.some(it => it.id === type.id)
                ? prev.filter(it => it.id !== type.id)
                : [...prev, type]
        );
    };

    useEffect(() => {
        if (!rawUserData) {
            Alert.alert('Error crítico', 'No se recibieron datos del usuario.');
            router.back();
            return;
        }
        fetchCountries();
        Object.keys(rawUserData).forEach((key) => {
            handleInputChange(key as any, rawUserData[key]);
        });
    }, []);

    const handleSelectCountry = (c: LocationItem) => {
        setSelectedCountry(c); setSelectedRegion(null); setSelectedCity(null); fetchRegions(c.id);
    };
    const handleSelectRegion = (r: LocationItem) => {
        setSelectedRegion(r); setSelectedCity(null); fetchCities(r.id);
    };

    const handleFinalRegister = async () => {
        if (!ranchName || !selectedCountry || !selectedRegion || !selectedCity || selectedProductionTypes.length === 0) {
            showMessage({ message: 'Faltan datos', description: 'Completa todos los campos.', type: 'warning' });
            return;
        }

        try {
            console.log(' [Paso 1] Registrando Usuario...');
            const userRegisterResponse = await handleRegister();

            if (!userRegisterResponse?.user?.id) return;

            console.log('Usuario creado ID:', userRegisterResponse.user.id);
            console.log('[Paso 2] Registrando Estancia...');

            const ranchPayload = {
                idUser: userRegisterResponse.user.id,
                idCity: selectedCity.id,
                idProductionTypes: selectedProductionTypes.map(pt => pt.id),
                name: ranchName
            };

            const ranchRegisterResponse = await registerRanch(ranchPayload);

            if (ranchRegisterResponse && ranchRegisterResponse.ranch) {
                console.log('✅ Estancia creada exitosamente.');

                // Segun tu requerimiento, guardamos la sesión usando los datos directamente de las respuestas
                // NOTA: Si el backend no devuelve un accessToken en el registro, 
                // se debería invocar el login o usar un token temporal.
                // Por ahora, asumimos que el flujo guardará lo que tenga disponible.

                const user = userRegisterResponse.user;
                const ranch = ranchRegisterResponse.ranch;

                await saveSession({
                    accessToken: '',
                    idUser: user.id,
                    idRole: user.idRole,
                    email: user.email,
                    fullname: user.fullname,
                    id_ranch: ranch.id,
                    ranch_name: ranch.name,
                    production_types: ranch.productionTypes.map(pt => pt.productionType.id),
                    ranch_role: user.idRole,
                });

                showMessage({ message: '¡Registro Exitoso!', description: 'Bienvenido a Estancia 360', type: 'success' });
                await AsyncStorage.removeItem('selectedRoleId');

                // Si ya guardamos sesión, podemos ir directo al Home
                setTimeout(() => router.replace('/views/(tabs)/admin/management/Management'), 1500);
            }

        } catch (error: any) {
            console.error('❌ Error en el proceso:', error);
            const msg = error?.response?.data?.message || error.message || "Error desconocido";
            showMessage({ message: "Error", description: msg, type: "danger" });
        }
    };

    const isSubmitting = loadingUser || loadingRanch;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={34} color={Colors.primary} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <HeaderText variant="h2">Datos de la Estancia</HeaderText>
                    <Text style={styles.subtitle}>Para finalizar, registra los datos de tu propiedad.</Text>
                </View>

                <View style={styles.form}>
                    <InputField
                        label="Nombre de la Estancia"
                        placeholder="Ej. Hacienda La Esperanza"
                        value={ranchName}
                        onChangeText={setRanchName}
                        editable={!isSubmitting}
                    />
                    <CustomSelect
                        label="País"
                        value={selectedCountry?.name}
                        options={countries}
                        onSelect={handleSelectCountry}
                        disabled={isSubmitting || loadingLocs}
                        placeholder={loadingLocs ? "Cargando..." : "Seleccionar País"}
                    />
                    <CustomSelect
                        label="Región / Departamento"
                        value={selectedRegion?.name}
                        options={regions}
                        onSelect={handleSelectRegion}
                        disabled={!selectedCountry || isSubmitting}
                        placeholder="Seleccionar Región"
                    />
                    <CustomSelect
                        label="Ciudad / Municipio"
                        value={selectedCity?.name}
                        options={cities}
                        onSelect={setSelectedCity}
                        disabled={!selectedRegion || isSubmitting}
                        placeholder="Seleccionar Ciudad"
                    />
                    <MultiSelect
                        label="Tipo de Producción"
                        selectedItems={selectedProductionTypes}
                        options={constants.PRODUCTION_TYPES}
                        onToggle={toggleProductionType}
                        disabled={isSubmitting}
                        placeholder="Uno o varios tipos"
                    />
                </View>

                <View style={styles.actions}>
                    <ButtonPrimary
                        title={isSubmitting ? "Registrando..." : "Finalizar Registro"}
                        onPress={handleFinalRegister}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    backButton: { position: 'absolute', top: Spacing.xl + 10, left: Spacing.lg, zIndex: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl + 40, paddingBottom: Spacing.xl },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
    form: { marginBottom: Spacing.lg },
    actions: { marginTop: Spacing.md },
    inputLabel: { ...Typography.bodySmall, color: Colors.textPrimary, marginBottom: 8, fontWeight: '600' },
    selectButton: { backgroundColor: Colors.Surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50 },
    disabledInput: { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0', opacity: 0.7 },
    selectText: { ...Typography.body, color: Colors.textPrimary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.lg },
    modalContent: { backgroundColor: Colors.background, borderRadius: 16, padding: Spacing.lg, maxHeight: '60%' },
    modalTitle: { ...Typography.h3, textAlign: 'center', marginBottom: Spacing.lg, color: Colors.primary },
    optionItem: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    optionText: { ...Typography.body, textAlign: 'left', color: Colors.textPrimary },
    doneButton: { backgroundColor: Colors.primary, borderRadius: 12, padding: Spacing.md, marginTop: Spacing.md, alignItems: 'center' },
    doneButtonText: { ...Typography.body, fontWeight: 'bold', color: '#fff' },
});