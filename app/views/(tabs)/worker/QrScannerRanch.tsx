import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { Colors } from '../../../../constants/theme';
import { getToken, saveSession } from '../../../../hooks/auth/use-Auth';
import { getRequest } from '../../../../hooks/db.postre-connection/db.connection';
import { downloadFromServer } from '../../../../hooks/db.sqlite/sync';
import { decryptRanchQrPayload } from '../../../../hooks/security/qrEncryption';
import { useWorkerWithRanch } from '../../../../hooks/workers/use-WorkerWithRanch'; // Ajusta la ruta si es necesario

import { showMessage } from 'react-native-flash-message';

interface PendingRanch {
    ranchId: number;
    ranchName: string;
    userId: number;
    userIdRole: number;
    userEmail: string;
    userFullname: string;
}

export default function QrScannerRanch() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [pendingRanch, setPendingRanch] = useState<PendingRanch | null>(null);
    const [confirming, setConfirming] = useState(false);

    // Hook de vinculación
    const { linkWorkerToRanch } = useWorkerWithRanch();

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }: any) => {
        setScanned(true);
        console.log(`📡 QR Escaneado [${type}]`);

        try {
            // 1. Obtener ID del Usuario actual (Colaborador)
            const userDataStr = await AsyncStorage.getItem('user_data');
            if (!userDataStr) {
                showMessage({
                    message: "Error",
                    description: "No se encontró la sesión del usuario.",
                    type: "danger",
                });
                router.back();
                return;
            }

            const userData = JSON.parse(userDataStr);
            const userId = userData.idUser;

            if (!userId) {
                showMessage({
                    message: "Error",
                    description: "ID de usuario inválido en la sesión.",
                    type: "danger",
                });
                return;
            }

            // 2. Desencriptar el payload del QR (generado por QrWorkerGenerator.tsx)
            const decoded = decryptRanchQrPayload(data);

            if (!decoded) {
                showMessage({
                    message: "QR Inválido",
                    description: "El código escaneado no es un QR de estancia válido.",
                    type: "warning",
                });
                // Dar tiempo para leer el mensaje antes de permitir escanear de nuevo
                setTimeout(() => setScanned(false), 2000);
                return;
            }

            // 3. Mostrar la tarjeta de confirmación — no vinculamos todavía, eso pasa
            // recién en handleConfirmJoin() cuando el usuario toca "Confirmar".
            setPendingRanch({
                ranchId: decoded.ranchId,
                ranchName: decoded.ranchName,
                userId,
                userIdRole: userData.idRole,
                userEmail: userData.email,
                userFullname: userData.fullname,
            });

        } catch (error) {
            console.error(error);
            showMessage({
                message: "Error",
                description: "Ocurrió un error inesperado al procesar el código.",
                type: "danger",
            });
            setScanned(false);
        }
    };

    const handleCancelJoin = () => {
        setPendingRanch(null);
        setScanned(false);
    };

    const handleConfirmJoin = async () => {
        if (!pendingRanch) return;
        const { ranchId, userId, userIdRole, userEmail, userFullname } = pendingRanch;
        setConfirming(true);

        try {
            const success = await linkWorkerToRanch(userId, ranchId);

            if (success) {
                // Sin esto, la sesión local (AsyncStorage user_data + SQLite local_session)
                // se queda sin id_ranch hasta el próximo login manual — el resto de la app
                // (repositorios, pantallas de admin) depende de esa sesión para saber en qué
                // estancia operar, así que quedaría "vinculado" en el servidor pero inutilizable
                // en el dispositivo hasta cerrar sesión y volver a entrar.
                //
                // Bug real encontrado 2026-09-06: este bloque tragaba cualquier fallo (o
                // directamente lo saltaba si accessToken/ranch venían vacíos) y SEGUÍA
                // mostrando "¡Vinculación Exitosa!" + navegando, dejando al usuario creyendo
                // que todo salió bien cuando en realidad su sesión local quedó sin
                // actualizar. La vinculación en el servidor ya se hizo (success=true) y no
                // tiene sentido deshacerla — pero no hay que simular un éxito completo si el
                // guardado local falló.
                let sessionRefreshed = false;
                let confirmedRanchId: number | null = null;
                try {
                    const accessToken = await getToken();
                    const ranchResponse = await getRequest<any>(`ranches/${ranchId}`);
                    const ranch = ranchResponse?.data ?? ranchResponse;
                    const currentMember = ranch?.ranchUsers?.find((ru: any) => ru.user?.id === userId);

                    if (accessToken && ranch?.id) {
                        await saveSession({
                            accessToken,
                            idUser: userId,
                            idRole: userIdRole,
                            email: userEmail,
                            fullname: currentMember?.user?.fullname ?? userFullname,
                            id_ranch: ranch.id,
                            ranch_name: ranch.name,
                            production_types: (ranch.productionTypes ?? []).map((pt: any) => pt.idProductionType),
                            ranch_role: currentMember?.role?.id ?? 2,
                        });
                        sessionRefreshed = true;
                        confirmedRanchId = ranch.id;
                    }
                } catch (refreshError) {
                    console.error('No se pudo refrescar la sesión local tras vincular:', refreshError);
                }

                if (sessionRefreshed && confirmedRanchId) {
                    // El colaborador recién se vinculó — su SQLite local todavía no tiene
                    // ningún dato de esta estancia (animales, lotes, etc.). Sin este fullSync
                    // quedaría con acceso a Management pero todo vacío hasta entrar
                    // manualmente a Sync.
                    try {
                        await downloadFromServer(confirmedRanchId, { fullSync: true });
                    } catch (syncError) {
                        console.error('No se pudo descargar los datos de la estancia tras vincular:', syncError);
                    }

                    showMessage({
                        message: "¡Vinculación Exitosa!",
                        description: "Te has unido a la estancia correctamente.",
                        type: "success",
                    });
                    setPendingRanch(null);
                    setTimeout(() => router.replace('/views/(tabs)/admin/management/Management'), 1500);
                } else {
                    showMessage({
                        message: "Vinculación incompleta",
                        description: "Te uniste a la estancia, pero no se pudo actualizar tu sesión local. Cerrá sesión y volvé a entrar para verla.",
                        type: "warning",
                        duration: 5000,
                    });
                    setPendingRanch(null);
                    setTimeout(() => setScanned(false), 3000);
                }
            } else {
                // Si falla, permitimos escanear de nuevo
                showMessage({
                    message: "Error",
                    description: "No se pudo vincular a la estancia.",
                    type: "danger",
                });
                setPendingRanch(null);
                setTimeout(() => setScanned(false), 2000);
            }
        } catch (error) {
            console.error(error);
            showMessage({
                message: "Error",
                description: "Ocurrió un error inesperado al vincular.",
                type: "danger",
            });
            setPendingRanch(null);
            setScanned(false);
        } finally {
            setConfirming(false);
        }
    };

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginBottom: 20 }}>Necesitamos permiso para usar la cámara</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.buttonPermission}>
                    <Text style={{ color: 'white' }}>Conceder Permiso</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned || pendingRanch || confirming ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            {/* Overlay UI */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Escanear Estancia</Text>
                </View>

                <View style={styles.scanFrame}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                </View>

                <Text style={styles.instructions}>
                    Apunta la cámara al código QR de la estancia
                </Text>
            </View>

            {/* Tarjeta de confirmación — aparece tras desencriptar un QR válido, antes de
                llamar a la API. El usuario ve a qué estancia se va a unir y tiene que
                confirmar explícitamente. */}
            {pendingRanch && (
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <Ionicons name="business" size={40} color={Colors.primary} />
                        <Text style={styles.confirmTitle}>¿Unirte a esta estancia?</Text>
                        <Text style={styles.confirmRanchName}>{pendingRanch.ranchName}</Text>

                        {confirming ? (
                            <View style={styles.confirmLoadingRow}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                                <Text style={styles.confirmLoadingText}>Vinculando...</Text>
                            </View>
                        ) : (
                            <View style={styles.confirmButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.confirmButton, styles.confirmButtonCancel]}
                                    onPress={handleCancelJoin}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.confirmButtonCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmButton, styles.confirmButtonAccept]}
                                    onPress={handleConfirmJoin}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.confirmButtonAcceptText}>Confirmar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    buttonPermission: { padding: 20, backgroundColor: Colors.primaryButton, borderRadius: 10 },
    overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 50 },
    header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    closeButton: { position: 'absolute', left: 20, padding: 10 },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    scanFrame: { width: 280, height: 280, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    instructions: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },

    // Decoración del marco
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.primary },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.primary },

    // Tarjeta de confirmación
    confirmOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    confirmCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    confirmTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 8, textAlign: 'center' },
    confirmRanchName: { fontSize: 22, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 12 },
    confirmButtonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
    confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmButtonCancel: { backgroundColor: '#f0f0f0' },
    confirmButtonCancelText: { color: '#555', fontWeight: '600' },
    confirmButtonAccept: { backgroundColor: Colors.primaryButton },
    confirmButtonAcceptText: { color: 'white', fontWeight: '700' },
    confirmLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    confirmLoadingText: { color: '#555', fontWeight: '600' },
});