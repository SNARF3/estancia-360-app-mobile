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
import { Colors, Spacing, Typography } from '../../../constants/theme';

// HOOKS (La lógica de negocio viene de aquí)
import { useRegisterRanch } from '../../../hooks/auth/use-RegisterRanch';
import { useUserRegisterLogic } from '../../../hooks/auth/use-UserRegisterLogic'; // <--- Importamos lógica de usuario
import { LocationItem, useLocationData } from '../../../hooks/constants/use-LotationData';

const PRODUCTION_TYPES = [
    { id: 1, name: 'Cría' }
];

// --- Select Component Reutilizable (Sin cambios) ---
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

export default function RegisterRanchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // 1. Obtener datos crudos pasados desde la pantalla anterior
    const rawUserData = params.userData ? JSON.parse(params.userData as string) : null;
    const roleId = rawUserData?.roleId || 2; // Por defecto dueño

    // 2. Instanciar Hooks
    const { countries, regions, cities, loading: loadingLocs, fetchCountries, fetchRegions, fetchCities } = useLocationData();
    const { registerRanch, loading: loadingRanch } = useRegisterRanch();

    // Instanciamos el hook de lógica de usuario
    // NOTA: Usamos este hook para registrar al usuario antes de registrar la estancia
    const {
        handleInputChange,
        handleRegister,
        loading: loadingUser
    } = useUserRegisterLogic(roleId);

    // Estados Locales para el formulario de Estancia
    const [ranchName, setRanchName] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<LocationItem | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<LocationItem | null>(null);
    const [selectedCity, setSelectedCity] = useState<LocationItem | null>(null);
    const [selectedProduction, setSelectedProduction] = useState<any>(null);

    // Efecto de inicialización: Cargar países y "Hidratar" el hook de usuario
    useEffect(() => {
        if (!rawUserData) {
            Alert.alert('Error crítico', 'No se recibieron datos del usuario.');
            router.back();
            return;
        }

        // Cargamos ubicaciones
        fetchCountries();

        // IMPORTANTE: Pasamos los datos recibidos por params al estado interno del hook useUserRegisterLogic
        // Esto "prepara" el hook para que cuando llamemos a handleRegister, tenga los datos listos.
        Object.keys(rawUserData).forEach((key) => {
            // Mapeamos los campos que coinciden con la interfaz del hook
            handleInputChange(key as any, rawUserData[key]);
        });

    }, []);

    // Manejo de selectores de ubicación
    const handleSelectCountry = (c: LocationItem) => {
        setSelectedCountry(c); setSelectedRegion(null); setSelectedCity(null); fetchRegions(c.id);
    };
    const handleSelectRegion = (r: LocationItem) => {
        setSelectedRegion(r); setSelectedCity(null); fetchCities(r.id);
    };

    // --- PROCESO DE REGISTRO ORQUESTADO ---
    const handleFinalRegister = async () => {
        // 1. Validaciones locales de estancia
        if (!ranchName || !selectedCountry || !selectedRegion || !selectedCity || !selectedProduction) {
            showMessage({ message: 'Faltan datos', description: 'Completa todos los campos de la estancia.', type: 'warning' });
            return;
        }

        try {
            console.log(' [Paso 1] Registrando Usuario usando el Hook...');

            // 2. Llamamos al hook de usuario para registrar
            // El hook se encarga de conectar a la BD y validaciones de usuario
            const userResponse = await handleRegister();

            // Verificamos si nos devolvió un usuario válido
            // Ajusta 'userResponse?.user?.id' según la estructura exacta que retorne tu hook actualizado
            const createdUserId = userResponse?.user?.id;

            if (!createdUserId) {
                // Si el hook no lanza error pero tampoco devuelve ID, detenemos
                console.error("No se obtuvo ID del usuario", userResponse);
                return;
            }

            console.log('Usuario creado ID:', createdUserId);
            console.log('[Paso 2] Registrando Estancia usando el Hook...');

            // 3. Preparamos payload de estancia
            const ranchPayload = {
                idUser: createdUserId,
                idCity: selectedCity.id,
                idProductionType: selectedProduction.id,
                name: ranchName
            };

            // 4. Llamamos al hook de estancia
            await registerRanch(ranchPayload);

            console.log('✅ Estancia creada exitosamente.');

            // 5. Finalización
            showMessage({ message: '¡Registro Exitoso!', description: 'Bienvenido a Estancia 360', type: 'success' });
            await AsyncStorage.removeItem('selectedRoleId');

            // Navegación segura
            setTimeout(() => router.replace('/views/auth/Login'), 1500);

        } catch (error: any) {
            console.error('❌ Error en el proceso orquestado:', error);
            // Nota: El manejo de errores UI (Alertas/Toast) ya suele estar dentro de los hooks,
            // pero si necesitas algo específico, lo pones aquí.
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
                    <CustomSelect
                        label="Tipo de Producción"
                        value={selectedProduction?.name}
                        options={PRODUCTION_TYPES}
                        onSelect={setSelectedProduction}
                        disabled={isSubmitting}
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
    optionText: { ...Typography.body, textAlign: 'center', color: Colors.textPrimary },
});