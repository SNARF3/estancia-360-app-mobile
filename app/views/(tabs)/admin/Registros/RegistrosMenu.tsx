import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';

// ─── Registros individuales ───────────────────────────────────────────────────

const INDIVIDUAL_ITEMS: {
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    route: string;
}[] = [
    {
        label: 'Pesaje',
        description: 'Registrar peso y condición corporal',
        icon: 'scale',
        color: '#10B981',
        route: '/views/(tabs)/admin/Ranch/rearing/WeightRecordForm',
    },
    {
        label: 'Vacunación',
        description: 'Aplicación de vacuna al animal',
        icon: 'shield-checkmark',
        color: '#3B82F6',
        route: '/views/(tabs)/admin/Ranch/health/VaccinationForm',
    },
    {
        label: 'Tratamiento',
        description: 'Medicación, dosis y período de retiro',
        icon: 'bandage',
        color: '#F97316',
        route: '/views/(tabs)/admin/Ranch/health/TreatmentForm',
    },
    {
        label: 'Incidente Sanitario',
        description: 'Enfermedad detectada o cuarentena',
        icon: 'warning',
        color: '#EF4444',
        route: '/views/(tabs)/admin/Ranch/health/HealthIncidentForm',
    },
    {
        label: 'Servicio de Reproducción',
        description: 'Monta natural, IA o transferencia embrionaria',
        icon: 'heart',
        color: '#F59E0B',
        route: '/views/(tabs)/admin/Ranch/breeding/BreedingServiceForm',
    },
    {
        label: 'Diagnóstico de Gestación',
        description: 'Palpación o ecografía',
        icon: 'analytics',
        color: Colors.primary,
        route: '/views/(tabs)/admin/Ranch/breeding/GestationDiagnosisForm',
    },
    {
        label: 'Parto',
        description: 'Registro del nacimiento y estado de la cría',
        icon: 'fitness',
        color: '#8B5CF6',
        route: '/views/(tabs)/admin/Ranch/breeding/ParturitionForm',
    },
    {
        label: 'Destete',
        description: 'Separación de la cría de su madre',
        icon: 'git-branch',
        color: '#0EA5E9',
        route: '/views/(tabs)/admin/Ranch/breeding/WeaningForm',
    },
];

// ─── Cargas masivas ───────────────────────────────────────────────────────────

const BULK_ITEMS: {
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route?: string;
}[] = [
    {
        label: 'Importar Animales',
        description: 'Carga masiva desde Excel',
        icon: 'paw',
        route: '/views/(tabs)/admin/bulkImport/BulkImportAnimals',
    },
    {
        label: 'Importar Pesos',
        description: 'Registros de pesaje en lote',
        icon: 'scale',
        route: '/views/(tabs)/admin/bulkImport/BulkImportWeights',
    },
    {
        label: 'Importar Vacunaciones',
        description: 'Próximamente disponible',
        icon: 'shield-checkmark',
    },
    {
        label: 'Importar Servicios',
        description: 'Próximamente disponible',
        icon: 'heart',
    },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RegistrosMenuScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.replace('/views/(tabs)/admin/management/Management')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Registros</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ── Registros individuales ─────────────────────── */}
                <Text style={styles.sectionLabel}>REGISTROS INDIVIDUALES</Text>
                <Text style={styles.sectionHint}>Selecciona el tipo y luego ingresa el arete del animal</Text>

                {INDIVIDUAL_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={styles.itemRow}
                        onPress={() => router.push(item.route as any)}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.itemIcon, { backgroundColor: item.color + '18' }]}>
                            <Ionicons name={item.icon} size={22} color={item.color} />
                        </View>
                        <View style={styles.itemText}>
                            <Text style={styles.itemLabel}>{item.label}</Text>
                            <Text style={styles.itemDesc}>{item.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                    </TouchableOpacity>
                ))}

                {/* ── Cargas masivas ─────────────────────────────── */}
                <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>CARGAS MASIVAS</Text>
                <Text style={styles.sectionHint}>Importación desde archivo Excel</Text>

                {BULK_ITEMS.map((item) => {
                    const available = !!item.route;
                    return (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.itemRow, !available && styles.itemRowDisabled]}
                            onPress={() => available && router.push(item.route as any)}
                            activeOpacity={available ? 0.75 : 1}
                        >
                            <View style={[styles.itemIcon, { backgroundColor: available ? Colors.primary + '15' : Colors.border }]}>
                                <Ionicons name={item.icon} size={22} color={available ? Colors.primary : Colors.textDisabled} />
                            </View>
                            <View style={styles.itemText}>
                                <Text style={[styles.itemLabel, !available && styles.itemLabelDisabled]}>{item.label}</Text>
                                <Text style={styles.itemDesc}>{item.description}</Text>
                            </View>
                            {available
                                ? <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                                : <View style={styles.prontoBadge}><Text style={styles.prontoText}>PRONTO</Text></View>
                            }
                        </TouchableOpacity>
                    );
                })}

                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
    },
    backBtn: { padding: 4 },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },

    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

    sectionLabel: {
        ...Typography.overline,
        color: Colors.primary,
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 4,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
        paddingLeft: 10,
    },
    sectionHint: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        marginLeft: 13,
    },

    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        ...Shadows.card,
        gap: Spacing.md,
    },
    itemRowDisabled: { opacity: 0.55 },
    itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemText: { flex: 1 },
    itemLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    itemLabelDisabled: { color: Colors.textSecondary },
    itemDesc: { fontSize: 12, color: Colors.textSecondary },

    prontoBadge: {
        backgroundColor: Colors.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    prontoText: { fontSize: 9, fontWeight: '900', color: Colors.textDisabled, letterSpacing: 0.5 },
});
