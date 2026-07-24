import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
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
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getUserData, logout } from '../../../../../hooks/auth/use-Auth';

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
        label: 'Mi Estancia',
        Icon: BarnIcon,
        route: '/views/(tabs)/admin/Ranch/Pastures/PasturesMenu',
    },
    {
        label: 'Pesos',
        Icon: WeightsBarIcon,
        route: '/views/(tabs)/admin/weights/WeightsScreen',
    },
];

export default function ManagementScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('');
    const [ranchName, setRanchName] = useState('---');
    const [isOnline, setIsOnline] = useState(true);

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
                <TouchableOpacity style={styles.salirBtn} onPress={handleLogout} activeOpacity={0.75}>
                    <Text style={styles.salirText}>Salir</Text>
                </TouchableOpacity>
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
                    {TILES.map((tile) => (
                        <TouchableOpacity
                            key={tile.label}
                            style={styles.tile}
                            onPress={() => router.push(tile.route as any)}
                            activeOpacity={0.82}
                        >
                            <tile.Icon size={64} color="white" />
                            <Text style={styles.tileLabel}>{tile.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: Spacing.tabBarHeight + 20 }} />
            </ScrollView>
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
