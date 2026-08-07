import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    CowIcon,
    DnaIcon,
    HealthIcon,
    IncidentIcon,
    MovementsIcon,
    PlusAnimalIcon,
    ScaleIcon,
    TreatmentIcon,
} from '../../../../../components/icons/AppIcons';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';

// ─── Helpers de navegación ────────────────────────────────────────────────────

function handleReproduccion(router: ReturnType<typeof useRouter>) {
    Alert.alert('Reproducción', '¿Qué deseas registrar?', [
        { text: 'Servicio reproductivo', onPress: () => router.push('/views/(tabs)/admin/Ranch/breeding/BreedingServiceForm?from=registros' as any) },
        { text: 'Diagnóstico gestación', onPress: () => router.push('/views/(tabs)/admin/Ranch/breeding/GestationDiagnosisForm?from=registros' as any) },
        { text: 'Cancelar', style: 'cancel' },
    ]);
}

function handlePartos(router: ReturnType<typeof useRouter>) {
    Alert.alert('Partos', '¿Qué deseas registrar?', [
        { text: 'Registrar parto', onPress: () => router.push('/views/(tabs)/admin/Ranch/breeding/ParturitionForm?from=registros' as any) },
        { text: 'Registrar destete', onPress: () => router.push('/views/(tabs)/admin/Ranch/breeding/WeaningForm?from=registros' as any) },
        { text: 'Cancelar', style: 'cancel' },
    ]);
}

// ─── Tiles de la grilla ───────────────────────────────────────────────────────

interface GridTile {
    label: string;
    Icon: React.ComponentType<{ color?: string; size?: number }>;
    onPress: (router: ReturnType<typeof useRouter>) => void;
}

const GRID_TILES: GridTile[] = [
    {
        label: 'Reproducción',
        Icon: DnaIcon,
        onPress: (r) => handleReproduccion(r),
    },
    {
        label: 'Partos',
        Icon: CowIcon,
        onPress: (r) => handlePartos(r),
    },
    {
        label: 'Pesajes',
        Icon: ScaleIcon,
        onPress: (r) => r.push('/views/(tabs)/admin/Ranch/rearing/WeightRecordForm?from=registros' as any),
    },
    {
        label: 'Nuevo Animal',
        Icon: PlusAnimalIcon,
        onPress: (r) => r.push('/views/(tabs)/admin/Ranch/Animals/AddAnimal?from=registros' as any),
    },
    {
        label: 'Sanidad',
        Icon: HealthIcon,
        onPress: (r) => r.push('/views/(tabs)/admin/Ranch/health/SaludForm?from=registros' as any),
    },
    {
        label: 'Movimientos',
        Icon: MovementsIcon,
        onPress: (r) => r.push('/views/(tabs)/admin/Ranch/movements/MovimientosMenu?from=registros' as any),
    },
];

// ─── Botones de cargas masivas ────────────────────────────────────────────────

interface BulkItem {
    label: string;
    Icon: React.ComponentType<{ color?: string; size?: number }>;
    route?: string;
}

const BULK_ITEMS: BulkItem[] = [
    {
        label: 'Animales',
        Icon: CowIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportAnimals',
    },
    {
        label: 'Pesaje',
        Icon: ScaleIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportWeights',
    },
    {
        label: 'Vacunaciones',
        Icon: HealthIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportVaccinations',
    },
    {
        label: 'Tratamientos',
        Icon: TreatmentIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportTreatments',
    },
    {
        label: 'Incidentes Sanitarios',
        Icon: IncidentIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportIncidents',
    },
    {
        label: 'Gestación',
        Icon: DnaIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportGestation',
    },
    {
        label: 'Movimientos',
        Icon: MovementsIcon,
        route: '/views/(tabs)/admin/bulkImport/BulkImportMovements',
    },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RegistrosMenuScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.title}>Registros</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Registros Individuales ─── */}
                <Text style={styles.sectionTitle}>Registros Individuales</Text>

                <View style={styles.grid}>
                    {GRID_TILES.map((tile) => (
                        <TouchableOpacity
                            key={tile.label}
                            style={styles.tile}
                            onPress={() => tile.onPress(router)}
                            activeOpacity={0.82}
                        >
                            <tile.Icon size={56} color="white" />
                            <Text style={styles.tileLabel}>{tile.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Cargas masivas ─── */}
                <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Cargas masivas</Text>

                <View style={styles.bulkList}>
                    {BULK_ITEMS.map((item) => {
                        const available = !!item.route;
                        return (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.bulkBtn, !available && styles.bulkBtnDisabled]}
                                onPress={() => available && router.push(item.route as any)}
                                activeOpacity={available ? 0.82 : 1}
                            >
                                <item.Icon size={40} color="white" />
                                <Text style={styles.bulkLabel}>{item.label}</Text>
                                {!available && (
                                    <View style={styles.prontoBadge}>
                                        <Text style={styles.prontoText}>PRONTO</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const TILE_BG = Colors.primary + 'BF'; // rgba(51,108,54,0.75) — mismo verde del Figma

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    // ── Header ──────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
    },
    backBtn: { padding: 2 },
    title: {
        fontFamily: Typography.fontPrimary,
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },

    // ── Sección ──────────────────────────────────────────────────────────────────
    sectionTitle: {
        fontFamily: Typography.fontPrimary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },

    // ── Grid de tiles ────────────────────────────────────────────────────────────
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 13,
        justifyContent: 'center',
        marginBottom: -Spacing.md,
    },
    tile: {
        width: '46%',
        aspectRatio: 1,
        backgroundColor: TILE_BG,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingBottom: 18,
        ...Shadows.card,
    },
    tileLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.white,
        textAlign: 'center',
        paddingHorizontal: 8,
    },

    // ── Cargas masivas ───────────────────────────────────────────────────────────
    bulkList: {
        gap: Spacing.md,
    },
    bulkBtn: {
        backgroundColor: TILE_BG,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
        ...Shadows.card,
    },
    bulkBtnDisabled: {
        opacity: 0.65,
    },
    bulkLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.white,
        flex: 1,
        textAlign: 'center',
    },
    prontoBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    prontoText: {
        fontSize: 9,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 0.5,
    },
});
