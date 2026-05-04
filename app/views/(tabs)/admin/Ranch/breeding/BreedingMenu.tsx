import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';

export default function BreedingMenu() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleBack = () => router.push('/views/(tabs)/admin/management/Management' as any);
    const handleMisAnimales = () => router.push('/views/(tabs)/admin/Ranch/Animals/AnimalMenu' as any);
    const handleProximamente = (titulo: string) =>
        Alert.alert('Próximamente', `"${titulo}" estará disponible pronto.`);

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Gestión de Cría</Text>
                        <View style={styles.headerBadge}>
                            <Ionicons name="pulse" size={20} color={Colors.white} />
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Mis Animales — Tarjeta principal ── */}
                <TouchableOpacity
                    style={styles.misAnimalesCard}
                    activeOpacity={0.85}
                    onPress={handleMisAnimales}
                >
                    <View style={styles.misAnimalesIconCircle}>
                        {/* Ícono de vaca usando texto SVG-like con Ionicons disponibles */}
                        <Ionicons name="receipt-outline" size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.misAnimalesText}>
                        <Text style={styles.misAnimalesTitle}>Mis Animales</Text>
                        <Text style={styles.misAnimalesSubtitle}>Inventario & Hojas de Vida</Text>
                    </View>
                    <View style={styles.misAnimalesChevron}>
                        <Ionicons name="chevron-forward" size={22} color={Colors.white} />
                    </View>
                </TouchableOpacity>

                {/* ── Herramientas — disponibles próximamente ── */}
                <Text style={styles.sectionTitle}>HERRAMIENTAS</Text>

                <View style={styles.toolsColumn}>
                    <TouchableOpacity
                        style={styles.toolRow}
                        activeOpacity={0.8}
                        onPress={() => router.push('/views/(tabs)/admin/bulkImport/bulkImport' as any)}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: Colors.primary + '15' }]}>
                            <Ionicons name="file-tray-stacked" size={22} color={Colors.primary} />
                        </View>
                        <View style={styles.toolText}>
                            <Text style={styles.toolTitle}>Carga Masiva</Text>
                            <Text style={styles.toolSubtitle}>Importar animales desde archivo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>

                    <View style={styles.toolDivider} />

                    <TouchableOpacity
                        style={styles.toolRow}
                        activeOpacity={0.8}
                        onPress={() => handleProximamente('Sincronizar con la nube')}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: '#336c3615' }]}>
                            <Ionicons name="cloud-upload" size={22} color="#336c36" />
                        </View>
                        <View style={styles.toolText}>
                            <Text style={styles.toolTitle}>Sincronizar con la nube</Text>
                            <Text style={styles.toolSubtitle}>Enviar cambios al servidor</Text>
                        </View>
                        <View style={styles.toolBadge}>
                            <Text style={styles.toolBadgeText}>Pronto</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Info ── */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Los registros se guardan localmente y se sincronizarán
                        automáticamente cuando haya conexión a internet.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Colors.background },
    header: {
        backgroundColor: Colors.background,
        paddingBottom: 10,
        paddingHorizontal: Spacing.lg,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    backButton: { marginRight: Spacing.md },
    headerTitle: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },
    titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerBadge: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
        ...Shadows.card,
    },
    container: { flex: 1, paddingHorizontal: Spacing.lg },
    scrollContent: { paddingTop: Spacing.xs, paddingBottom: Spacing.xxl },

    // ── Mis Animales ──
    misAnimalesCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadows.floatingButton,
    },
    misAnimalesIconCircle: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: Colors.white + '20',
        justifyContent: 'center', alignItems: 'center',
        marginRight: Spacing.md,
    },
    misAnimalesText: { flex: 1 },
    misAnimalesTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, fontFamily: Typography.fontPrimary },
    misAnimalesSubtitle: { fontSize: 12, color: Colors.white + 'BB', fontFamily: Typography.fontSecondary, marginTop: 3 },
    misAnimalesChevron: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.white + '20',
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Section ──
    sectionTitle: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '800',
        marginBottom: Spacing.md,
        letterSpacing: 1,
    },

    // ── Tools ──
    toolsColumn: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    toolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    toolDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
    toolIcon: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    toolText: { flex: 1 },
    toolTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: Typography.fontPrimary },
    toolSubtitle: { fontSize: 11, color: Colors.textSecondary, fontFamily: Typography.fontSecondary, marginTop: 2 },
    toolBadge: {
        backgroundColor: Colors.border,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6,
    },
    toolBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    // ── Info ──
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '10',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.xl,
        alignItems: 'flex-start',
        gap: 10,
    },
    infoText: {
        fontSize: 13, color: Colors.primary, flex: 1,
        lineHeight: 20, fontFamily: Typography.fontSecondary,
    },
});