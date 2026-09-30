import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { HeaderText } from '../../../../../components/common/HeaderText';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { Colors, Spacing, Typography } from '../../../../../constants/theme';
import { getSession } from '../../../../../hooks/auth/use-Auth';
import { encryptRanchQrPayload } from '../../../../../hooks/security/qrEncryption';

interface RanchQrInfo {
    id: number;
    name: string;
}

export default function QrWorkerGenerator() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [ranch, setRanch] = useState<RanchQrInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Los datos de la estancia salen de SQLite local (local_session), no de una llamada
        // de red — así el QR se puede generar sin conexión.
        getSession().then(session => {
            if (!session?.id_ranch || !session.ranch_name) {
                setError('No hay datos de estancia disponibles');
            } else {
                setRanch({ id: Number(session.id_ranch), name: session.ranch_name });
            }
            setLoading(false);
        }).catch(() => {
            setError('No hay datos de estancia disponibles');
            setLoading(false);
        });
    }, []);

    const qrPayload = ranch ? encryptRanchQrPayload({ ranchId: ranch.id, ranchName: ranch.name }) : '';

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Cargando datos de la estancia...</Text>
            </View>
        );
    }

    if (error || !ranch) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={Colors.error} />
                <Text style={styles.errorText}>{error || 'No hay datos de estancia disponibles'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScreenContainer scrollable={true}>
            {/* Header con botón de volver */}
            <View style={[styles.headerRow, { marginTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
                </TouchableOpacity>
                <HeaderText variant="h2">Agregar Colaborador</HeaderText>
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>
                    Pedile a tu colaborador que escanee este código QR desde su aplicación para unirse a:
                </Text>

                <Text style={styles.ranchName}>{ranch.name}</Text>

                {/* Contenedor del QR */}
                <View style={styles.qrContainer}>
                    <View style={styles.qrFrame}>
                        <QRCode
                            value={qrPayload}
                            size={220}
                            color={Colors.black}
                            backgroundColor="white"
                            logo={require('../../../../../assets/estancia360/icon-light.png')}
                            logoSize={40}
                            logoBackgroundColor='white'
                            logoMargin={2}
                        />
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={24} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Este código es único para tu estancia. No lo compartas con personas ajenas a tu equipo.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.lg,
        paddingTop: 100, // Bajamos también el contenido de carga/error
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    backButton: {
        marginRight: Spacing.md,
        padding: 4, // Área de toque un poco más grande
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Colors.textSecondary,
        ...Typography.body,
    },
    errorText: {
        marginTop: Spacing.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        ...Typography.body,
    },
    retryButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        backgroundColor: Colors.primaryButton,
        borderRadius: 8,
    },
    retryText: {
        color: Colors.white,
        ...Typography.body,
        fontWeight: '600',
    },
    description: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
        ...Typography.body,
        paddingHorizontal: Spacing.md,
    },
    ranchName: {
        ...Typography.h1,
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },
    qrContainer: {
        marginBottom: Spacing.xxl,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    qrFrame: {
        padding: Spacing.xl,
        backgroundColor: 'white',
        borderRadius: 24,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '15', // 15% opacidad
        padding: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: Spacing.xl,
        width: '100%',
    },
    infoText: {
        flex: 1,
        marginLeft: Spacing.md,
        color: Colors.textPrimary,
        ...Typography.bodySmall,
        lineHeight: 18,
    },
});