import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';

export default function RanchMenu() {
    const router = useRouter();

    const handleBack = () => {
        // Navigate back to Management screen
        router.push('/views/admin/management/Management');
    };

    const handleNavigation = (route: string) => {
        router.push(route as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>GANADERO PRO</Text>
                </View>
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>RESUMEN DEL DÍA</Text>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <Text style={[styles.summaryNumber, { color: Colors.primary }]}>3</Text>
                        <Text style={styles.summaryLabel}>Partos pendientes</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={[styles.summaryNumber, { color: Colors.secondary }]}>5</Text>
                        <Text style={styles.summaryLabel}>Alertas sanitarias</Text>
                    </View>
                </View>

                {/* Mis Animales - Main Card */}
                <TouchableOpacity
                    style={styles.mainCard}
                    onPress={() => handleNavigation('/views/(tabs)/admin/Ranch/Animals/AnimalMenu')}
                    activeOpacity={0.9}
                >
                    <View style={styles.mainIconContainer}>
                        <Ionicons name="nutrition" size={40} color={Colors.white} />
                    </View>
                    <Text style={styles.mainCardTitle}>Mis Animales</Text>
                    <Text style={styles.mainCardSubtitle}>Inventario & Hojas de Vida</Text>
                </TouchableOpacity>
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <TouchableOpacity style={styles.gridCard} onPress={() => handleNavigation('/views/UnderConstruction')}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="pulse" size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Reproducción</Text>
                            <Text style={styles.gridSubtitle}>Kanban y Partos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridCard} onPress={() => handleNavigation('/views/UnderConstruction')}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="flask" size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Mis Terneros</Text>
                            <Text style={styles.gridSubtitle}>Crecimiento</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.gridRow}>
                        <TouchableOpacity style={styles.gridCard} onPress={() => handleNavigation('/views/UnderConstruction')}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="medkit" size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Sanidad</Text>
                            <Text style={styles.gridSubtitle}>Vacunas y Tratamientos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridCard} onPress={() => handleNavigation('/views/UnderConstruction')}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="swap-horizontal" size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Movimientos</Text>
                            <Text style={styles.gridSubtitle}>Traslados y Ventas</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: Spacing.lg }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 15,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        color: Colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: Typography.fontPrimary,
    },
    profileCircle: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        borderWidth: 1.5,
        borderColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitials: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: Typography.fontPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.tabBarPadding,
        paddingTop: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: Typography.fontPrimary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    summaryCard: {
        backgroundColor: Colors.white,
        width: '48%',
        padding: 15,
        borderRadius: BorderRadius.md,
        ...Shadows.card,
    },
    summaryNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: Spacing.xs,
        fontFamily: Typography.fontPrimary,
    },
    summaryLabel: {
        fontSize: 14,
        color: Colors.textSecondary, // Was #777
        fontFamily: Typography.body.fontFamily,
    },
    mainCard: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        padding: 24,
        alignItems: 'center',
        marginBottom: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    mainIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    mainCardTitle: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: Spacing.xs,
        fontFamily: Typography.fontPrimary,
    },
    mainCardSubtitle: {
        color: Colors.white,
        fontSize: 14,
        fontFamily: Typography.body.fontFamily,
    },
    gridContainer: {
        gap: Spacing.md,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    gridCard: {
        backgroundColor: Colors.white,
        width: '48%',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.card,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    iconWrapper: {
        marginBottom: 15,
    },
    gridTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
        textAlign: 'center',
        fontFamily: Typography.fontPrimary,
    },
    gridSubtitle: {
        fontSize: 12,
        color: Colors.textDisabled,
        textAlign: 'center',
        fontFamily: Typography.bodySmall.fontFamily,
    },
});
