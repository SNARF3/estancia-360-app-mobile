import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { classifyAnimal } from '../../../../../../hooks/Animals/use-AnimalClasification';

export default function DetailAnimalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const breed = useMemo(() => params.breed ? JSON.parse(params.breed as string) : {}, [params.breed]);
    const status = useMemo(() => params.status ? JSON.parse(params.status as string) : {}, [params.status]);

    const getBool = (val: any) => val === 'true' || val === true;

    // Clasificación visual calculada desde los params
    const classification = useMemo(() => classifyAnimal({
        sex: params.sex as string,
        birthdate: params.birthdate as string,
        isCastrated: getBool(params.isCastrated),
        isSterilized: getBool(params.isSterilized),
        hasCalved: getBool(params.hasCalved),
    }), [params]);

    const handleBack = () => router.back();

    const InfoRow = ({
        label,
        value,
        icon,
        isBool = false,
    }: {
        label: string;
        value: any;
        icon: any;
        isBool?: boolean;
    }) => (
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                {isBool ? (
                    <View style={[
                        styles.booleanTag,
                        { backgroundColor: getBool(value) ? Colors.successLight : Colors.errorLight }
                    ]}>
                        <Text style={{
                            color: getBool(value) ? Colors.success : Colors.error,
                            fontSize: 12,
                            fontWeight: '800',
                        }}>
                            {getBool(value) ? 'SÍ' : 'NO'}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.value}>{value || 'No registrado'}</Text>
                )}
            </View>
        </View>
    );

    const isOk = status.name === 'OK';
    const statusColor = isOk ? Colors.success : Colors.error;
    const statusBg = isOk ? Colors.successLight : Colors.errorLight;

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header con fondo igual a background, como AnimalMenu */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ficha del Animal</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScreenContainer scrollable={true} style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* ── Tarjeta principal ─────────────────────────────────── */}
                    <View style={styles.mainCard}>
                        {/* Fila superior: estado sanitario + clasificación */}
                        <View style={styles.badgeRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                    {status.name || 'S/E'}
                                </Text>
                            </View>
                            <View style={[styles.categoryBadge, { backgroundColor: classification.backgroundColor }]}>
                                <Text style={[styles.categoryBadgeText, { color: classification.color }]}>
                                    {classification.category.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Código del animal */}
                        <Text style={styles.animalCode}>{params.code}</Text>
                        <Text style={styles.breedName}>{breed.name || 'Raza no definida'}</Text>

                        {/* ── Bloque de clasificación destacado ─────────────── */}
                        <View style={[styles.classificationBlock, { backgroundColor: classification.backgroundColor, borderColor: classification.color + '40' }]}>
                            <View style={styles.classificationIconWrap}>
                                <Ionicons
                                    name={
                                        classification.category === 'Ternero' ? 'egg-outline' :
                                            classification.category === 'Destetado' ? 'leaf-outline' :
                                                'ribbon-outline'
                                    }
                                    size={22}
                                    color={classification.color}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.classificationCategory, { color: classification.color }]}>
                                    {classification.category}
                                </Text>
                                <Text style={[styles.classificationLabel, { color: classification.color }]}>
                                    {classification.label}
                                </Text>
                            </View>
                        </View>

                        {/* Stats rápidos */}
                        <View style={styles.quickStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>PESO</Text>
                                <Text style={styles.statValue}>{params.weight} kg</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>SEXO</Text>
                                <Text style={styles.statValue}>{params.sex === 'M' ? '♂ Macho' : '♀ Hembra'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Genealogía ────────────────────────────────────────── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeader}>GENEALOGÍA Y REGISTRO</Text>
                        <InfoRow
                            label="Fecha Nac."
                            value={new Date(params.birthdate as string).toLocaleDateString()}
                            icon="calendar-sharp"
                        />
                        <InfoRow label="ID Madre" value={params.idMother as string} icon="female-sharp" />
                        <InfoRow label="ID Padre" value={params.idFather as string} icon="male-sharp" />
                    </View>

                    {/* ── Estado reproductivo ───────────────────────────────── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionHeader}>ESTADO REPRODUCTIVO</Text>
                        <InfoRow label="Castrado" value={params.isCastrated} icon="cut-outline" isBool />
                        <InfoRow label="Esterilizado" value={params.isSterilized} icon="medkit-outline" isBool />
                        {params.sex === 'F' && (
                            <InfoRow label="Ha parido" value={params.hasCalved} icon="git-branch-outline" isBool />
                        )}
                    </View>

                </ScrollView>
            </ScreenContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Colors.background },
    container: { flex: 1 },

    // Header igual que AnimalMenu (background, no blanco)
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
    },
    backButton: { padding: 5 },
    headerTitle: { ...Typography.h3, color: Colors.primary, fontWeight: '800' },

    scrollContent: { padding: Spacing.lg },

    // Main card
    mainCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.card,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
        alignSelf: 'stretch',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 5,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    categoryBadgeText: { fontSize: 11, fontWeight: '800' },

    breedName: { ...Typography.overline, color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 4 },
    animalCode: { ...Typography.h1, color: Colors.primary, fontSize: 40, fontWeight: '900' },

    // Bloque de clasificación
    classificationBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: Spacing.md,
        marginTop: Spacing.md,
        gap: Spacing.md,
    },
    classificationIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Colors.white + '80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    classificationCategory: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        opacity: 0.7,
    },
    classificationLabel: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 1,
    },

    // Quick stats
    quickStats: {
        flexDirection: 'row',
        marginTop: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        width: '100%',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },
    statLabel: { fontSize: 10, color: Colors.textDisabled, fontWeight: '700' },
    statValue: { fontSize: 16, color: Colors.primary, fontWeight: '800' },

    // Section cards
    sectionCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.card,
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        ...Typography.overline,
        color: Colors.primary,
        fontWeight: '900',
        marginBottom: Spacing.lg,
        fontSize: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
        paddingLeft: 10,
    },

    // Info rows
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    textContainer: { flex: 1 },
    label: { fontSize: 11, color: Colors.textDisabled, fontWeight: '700', textTransform: 'uppercase' },
    value: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
    booleanTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2,
    },
});