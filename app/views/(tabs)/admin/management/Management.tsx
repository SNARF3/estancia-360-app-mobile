import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    BarnIcon,
    HerdIcon,
    NotebookIcon,
    WeightsBarIcon,
} from '../../../../../components/icons/AppIcons';
import { TutorialOverlay } from '../../../../../components/onboarding/TutorialOverlay';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getUserData, logout } from '../../../../../hooks/auth/use-Auth';
import { useSafeRouter } from '../../../../../hooks/navigation/use-SafeRouter';
import { getTutorialTarget } from '../../../../../hooks/onboarding/tutorialTargets';
import { TutorialStep, useTutorial } from '../../../../../hooks/onboarding/use-Tutorial';

const TILE_BG = Colors.primaryButton;

const TILES = [
    {
        label: 'Mis Animales',
        Icon: HerdIcon,
        route: '/views/(tabs)/admin/Ranch/Animals/AnimalMenu',
    },
    {
        label: 'Registrar Datos',
        Icon: NotebookIcon,
        route: '/views/(tabs)/admin/Registros/RegistrosMenu',
    },
    {
        label: 'Potreros y Lotes',
        Icon: BarnIcon,
        route: '/views/(tabs)/admin/Ranch/Pastures/PasturesMenu',
    },
    {
        label: 'Pesos',
        Icon: WeightsBarIcon,
        route: '/views/(tabs)/admin/weights/WeightsScreen',
    },
];

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        key: 'animals',
        title: 'Mis Animales',
        description: 'El inventario completo de tu hacienda: alta, baja y detalle de cada animal.',
    },
    {
        key: 'records',
        title: 'Registrar Datos',
        description: 'Cargá eventos de Cría, Recría, Engorde, Sanidad y Movimientos, uno por uno o con cargas masivas desde Excel.',
    },
    {
        key: 'ranch',
        title: 'Potreros y Lotes',
        description: 'Administrá los potreros y lotes de tu estancia: dónde está cada grupo de animales.',
    },
    {
        key: 'weights',
        title: 'Pesos',
        description: 'El resumen de todos los pesajes que cargaste.',
    },
    {
        key: 'tab-management',
        title: 'Mi Estancia',
        description: 'Esta barra de abajo te acompaña en toda la app. Este ícono te trae siempre acá, al inicio.',
        resolveRef: () => getTutorialTarget('tabbar_management'),
    },
    {
        key: 'tab-registros',
        title: 'Registros',
        description: 'Acceso directo a Registrar Datos, sin pasar por el inicio.',
        resolveRef: () => getTutorialTarget('tabbar_Registros'),
    },
    {
        key: 'tab-sync',
        title: 'Sync',
        description: 'Sincronizá lo que cargaste offline con el servidor cuando tengas conexión.',
        resolveRef: () => getTutorialTarget('tabbar_sync'),
    },
    {
        key: 'tab-usuario',
        title: 'Perfil',
        description: 'Tus datos, los de tu estancia, y acá abajo siempre vas a poder volver a ver este tutorial.',
        resolveRef: () => getTutorialTarget('tabbar_usuario'),
    },
];

export default function ManagementScreen() {
    const router = useRouter();
    const safeRouter = useSafeRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ startTutorial?: string }>();
    const [userName, setUserName] = useState('');
    const [ranchName, setRanchName] = useState('---');
    const [isOnline, setIsOnline] = useState(true);
    const tutorial = useTutorial('admin_management', TUTORIAL_STEPS);

    // Relanzado desde el botón "Ver tutorial" del Perfil (que navega con ?startTutorial=1).
    useEffect(() => {
        if (params.startTutorial === '1') {
            tutorial.start();
            router.setParams({ startTutorial: undefined } as any);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.startTutorial]);

    useEffect(() => {
        getUserData().then(data => {
            if (!data) return;
            setUserName(data.fullname || data.email || 'Usuario');
            if (data.ranch_name) setRanchName(data.ranch_name);
        });
        const unsub = NetInfo.addEventListener(state => {
            setIsOnline(!!state.isConnected);
        });
        return unsub;
    }, []);

    const handleLogout = async () => {
        await logout();
        router.replace('/views/auth/Inicio' as any);
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
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.helpBtn}
                        onPress={tutorial.start}
                        activeOpacity={0.75}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="help-circle-outline" size={22} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.salirBtn} onPress={handleLogout} activeOpacity={0.75}>
                        <Text style={styles.salirText}>Salir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Bienvenida */}
                <View style={styles.welcome}>
                    <Text style={styles.welcomeTitle}>
                        Bienvenido, {userName}
                    </Text>
                    <Text style={styles.welcomeRanch}>Estancia: {ranchName}</Text>
                </View>

                {/* Tiles */}
                <View style={styles.tilesContainer}>
                    {TILES.map((tile, index) => (
                        <View key={tile.label} ref={tutorial.refs[index]} collapsable={false}>
                            <TouchableOpacity
                                style={styles.tile}
                                onPress={() => safeRouter.push(tile.route as any)}
                                activeOpacity={0.82}
                            >
                                <tile.Icon size={64} color="white" />
                                <Text style={styles.tileLabel}>{tile.label}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>

            <TutorialOverlay
                visible={tutorial.visible}
                step={tutorial.step}
                stepIndex={tutorial.stepIndex}
                totalSteps={tutorial.totalSteps}
                targetLayout={tutorial.targetLayout}
                onNext={tutorial.next}
                onSkip={tutorial.skip}
            />
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
    onlineBadge: {
        borderColor: Colors.primary,
        backgroundColor: Colors.successLight,
    },
    offlineBadge: {
        borderColor: Colors.textSecondary,
        backgroundColor: 'transparent',
    },
    statusText: {
        fontSize: 13,
        fontFamily: Typography.fontPrimary,
        fontWeight: '700',
    },
    onlineText: { color: Colors.primary },
    offlineText: { color: Colors.textSecondary },

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    helpBtn: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.circular,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.textSecondary,
    },
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
        paddingTop: Spacing.md,
    },

    welcome: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.sm,
    },
    welcomeTitle: {
        fontFamily: Typography.fontPrimary,
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },
    welcomeRanch: {
        fontFamily: Typography.fontPrimary,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
    },

    tilesContainer: {
        gap: Spacing.md,
    },
    tile: {
        width: '100%',
        height: 120,
        backgroundColor: TILE_BG,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...Shadows.floatingButton,
    },
    tileLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
        textAlign: 'center',
    },
});
