import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarnIcon } from '../../../../components/icons/AppIcons';
import { SyncLoadingOverlay } from '../../../../components/common/SyncLoadingOverlay';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../constants/theme';
import { getSession, getUserData, SessionParams } from '../../../../hooks/auth/use-Auth';
import { useLogoutWithSync } from '../../../../hooks/auth/use-LogoutWithSync';
import { getDb } from '../../../../hooks/db.sqlite/db-pool';
import { countActiveAnimals } from '../../../../hooks/db.sqlite/repositories/animals';
import { getEffectiveCapacity, useSubscription } from '../../../../hooks/subscriptions/use-Subscription';

const ROLE_LABELS: Record<number, string> = {
    1: 'Ganadero',
    2: 'Trabajador',
    3: 'Administrador',
};

export default function UsuarioScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [userData, setUserData] = useState<SessionParams | null>(null);
    const [roleName, setRoleName] = useState('Usuario');
    const [animalCount, setAnimalCount] = useState<number | null>(null);
    const [hectareas, setHectareas] = useState<number | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [idRanch, setIdRanch] = useState<string | undefined>(undefined);
    const [planHeadcount, setPlanHeadcount] = useState<number | null>(null);
    const { subscription } = useSubscription(idRanch);
    const planCapacity = getEffectiveCapacity(subscription);
    const { confirmLogout, loggingOut, syncPhase, syncProgress } = useLogoutWithSync();

    useFocusEffect(
        useCallback(() => {
            getUserData().then((data) => {
                if (!data) return;
                setUserData(data);
                setRoleName((data.ranch_role != null ? ROLE_LABELS[data.ranch_role] : undefined) ?? 'Usuario');
            });

            getSession().then(async session => {
                if (!session) return;
                setIdRanch(session.id_ranch);
                const db = await getDb();
                // La columna real es id_status (no "status"); esta query fallaba siempre en
                // silencio (atrapada abajo) y el contador quedaba en "---" para siempre.
                const animals = await db.getFirstAsync<{ count: number }>(
                    'SELECT COUNT(*) as count FROM ranch_animals WHERE id_ranch = ? AND id_status = 1',
                    [session.id_ranch]
                );
                setAnimalCount(animals?.count ?? 0);
                const ha = await db.getFirstAsync<{ total: number }>(
                    'SELECT COALESCE(SUM(area_hectares), 0) as total FROM ranch_pastures WHERE id_ranch = ?',
                    [session.id_ranch]
                );
                setHectareas(ha?.total ?? 0);
                // Mismo conteo que usa el guard de capacidad (id_productive_status != Baja) —
                // a propósito distinto del animalCount de arriba (que filtra por id_status,
                // un campo distinto), porque la barra de uso tiene que reflejar EXACTO lo
                // mismo que el backend usa para bloquear altas, si no confunde al usuario.
                setPlanHeadcount(await countActiveAnimals(session.id_ranch));
            }).catch(() => {});

            const unsub = NetInfo.addEventListener(state => {
                setIsOnline(!!state.isConnected);
            });
            return unsub;
        }, [])
    );

    const handleViewTutorial = () => {
        router.push('/views/(tabs)/admin/management/Management?startTutorial=1' as any);
    };

    const handleManageCollaborators = () => {
        router.push('/views/(tabs)/admin/management/CollaboratorsScreen' as any);
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
                    <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.salirBtn} onPress={confirmLogout} activeOpacity={0.75}>
                    <Text style={styles.salirText}>Salir</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Aviso de límite de plan alcanzado */}
                {planHeadcount !== null && planCapacity != null && planHeadcount >= planCapacity && (
                    <View style={styles.limitBanner}>
                        <Ionicons name="alert-circle" size={20} color={Colors.error} />
                        <Text style={styles.limitBannerText}>
                            Alcanzaste el límite de tu plan ({planHeadcount}/{planCapacity} animales).
                            Actualizá tu plan o no vas a poder subir más animales.
                        </Text>
                    </View>
                )}

                {/* Avatar + nombre + rol */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={44} color={Colors.white} />
                    </View>
                    <Text style={styles.userName}>{userData?.fullname || 'Usuario'}</Text>
                    <Text style={styles.userRole}>{roleName}</Text>
                </View>

                {/* Tarjeta de estancia */}
                {userData?.ranch_name && (
                    <View style={styles.ranchCard}>
                        <View style={styles.ranchTop}>
                            <View style={styles.ranchIconWrap}>
                                <BarnIcon size={36} color={Colors.secondary} />
                            </View>
                            <View style={styles.ranchInfo}>
                                <Text style={styles.ranchLabel}>Estancia</Text>
                                <Text style={styles.ranchName}>{userData.ranch_name}</Text>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statChip}>
                                <Ionicons name="paw" size={18} color={Colors.primary} />
                                <View>
                                    <Text style={styles.statLabel}>Animales</Text>
                                    <Text style={styles.statValue}>
                                        {animalCount !== null ? animalCount : '---'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.statChip}>
                                <Ionicons name="leaf" size={18} color={Colors.accent} />
                                <View>
                                    <Text style={styles.statLabel}>Hectáreas</Text>
                                    <Text style={styles.statValue}>
                                        {hectareas !== null ? hectareas.toFixed(1) : '---'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Uso del plan */}
                        {subscription && planHeadcount !== null && (
                            <View style={styles.usageBlock}>
                                <View style={styles.usageHeader}>
                                    <Text style={styles.usageLabel}>Plan {subscription.plan.name}</Text>
                                    <Text style={styles.usageCount}>
                                        {planHeadcount}{planCapacity != null ? ` / ${planCapacity}` : ''} animales
                                    </Text>
                                </View>
                                {planCapacity != null && (
                                    <View style={styles.usageBarTrack}>
                                        <View
                                            style={[
                                                styles.usageBarFill,
                                                {
                                                    width: `${Math.min(100, (planHeadcount / planCapacity) * 100)}%`,
                                                    backgroundColor:
                                                        planHeadcount >= planCapacity
                                                            ? Colors.error
                                                            : planHeadcount / planCapacity >= 0.8
                                                                ? Colors.warning
                                                                : Colors.primary,
                                                },
                                            ]}
                                        />
                                    </View>
                                )}
                                {planCapacity == null && (
                                    <Text style={styles.usageUnlimited}>Sin límite de animales</Text>
                                )}
                                {(subscription.effectiveStatus === 'expired' || subscription.effectiveStatus === 'cancelled') && (
                                    <Text style={styles.usageWarningDanger}>
                                        Plan vencido — capacidad limitada a la del plan Free hasta renovar
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Información personal */}
                <Text style={styles.sectionTitle}>Información personal</Text>

                <View style={styles.infoCard}>
                    {[
                        { label: 'Nombre completo', value: userData?.fullname || '---' },
                        { label: 'Email', value: userData?.email || '---' },
                        { label: 'Teléfono', value: '---' },
                        { label: 'Rol', value: roleName },
                    ].map((row, i, arr) => (
                        <View
                            key={row.label}
                            style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}
                        >
                            <Text style={styles.infoLabel}>{row.label}</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Ver tutorial */}
                <TouchableOpacity style={styles.tutorialBtn} onPress={handleViewTutorial} activeOpacity={0.8}>
                    <Ionicons name="help-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.tutorialBtnText}>Ver tutorial</Text>
                </TouchableOpacity>

                {/* Gestión de Colaboradores — solo el dueño de la estancia */}
                {userData?.ranch_role === 1 && (
                    <TouchableOpacity style={styles.tutorialBtn} onPress={handleManageCollaborators} activeOpacity={0.8}>
                        <Ionicons name="people-outline" size={18} color={Colors.primary} />
                        <Text style={styles.tutorialBtnText}>Gestión de Colaboradores</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.version}>Estancia360 v2.0</Text>
                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>

            <SyncLoadingOverlay visible={loggingOut} phase={syncPhase} progress={syncProgress} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    statusBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1.5,
    },
    onlineBadge: { borderColor: Colors.primary, backgroundColor: Colors.successLight },
    offlineBadge: { borderColor: Colors.textSecondary, backgroundColor: 'transparent' },
    statusText: { fontSize: 13, fontFamily: Typography.fontPrimary, fontWeight: '700' },
    onlineText: { color: Colors.primary },
    offlineText: { color: Colors.textSecondary },
    salirBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1.5,
        borderColor: Colors.textSecondary,
    },
    salirText: {
        fontSize: 13,
        fontFamily: Typography.fontPrimary,
        fontWeight: '700',
        color: Colors.textSecondary,
    },

    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
    },

    // ── Aviso de límite de plan ───────────────────────────────────────────────
    limitBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.errorLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.error + '40',
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    limitBannerText: {
        flex: 1,
        fontFamily: Typography.fontSecondary,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },

    // ── Perfil ────────────────────────────────────────────────────────────────
    profileHeader: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Colors.primaryButton,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...Shadows.floatingButton,
    },
    userName: {
        fontFamily: Typography.fontPrimary,
        fontSize: 26,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },
    userRole: {
        fontFamily: Typography.fontSecondary,
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
    },

    // ── Tarjeta estancia ──────────────────────────────────────────────────────
    ranchCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadows.card,
        gap: Spacing.md,
    },
    ranchTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    ranchIconWrap: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.iconBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ranchInfo: { flex: 1 },
    ranchLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    ranchName: {
        fontFamily: Typography.fontPrimary,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    statChip: {
        flex: 1,
        backgroundColor: Colors.iconBg,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    statLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 11,
        color: Colors.textSecondary,
    },
    statValue: {
        fontFamily: Typography.fontPrimary,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // ── Uso del plan ──────────────────────────────────────────────────────────
    usageBlock: {
        gap: 6,
    },
    usageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    usageLabel: {
        fontFamily: Typography.fontPrimary,
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    usageCount: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    usageBarTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.iconBg,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    usageUnlimited: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    usageWarningDanger: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.error,
        fontWeight: '600',
    },

    // ── Información personal ──────────────────────────────────────────────────
    sectionTitle: {
        fontFamily: Typography.fontPrimary,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    infoCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
        ...Shadows.card,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 16,
    },
    infoRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    infoLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    infoValue: {
        fontFamily: Typography.fontPrimary,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        maxWidth: '60%',
        textAlign: 'right',
    },

    // ── Acciones ──────────────────────────────────────────────────────────────
    tutorialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        backgroundColor: Colors.white,
        marginBottom: Spacing.md,
        ...Shadows.card,
    },
    tutorialBtnText: {
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    version: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textDisabled,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
});
