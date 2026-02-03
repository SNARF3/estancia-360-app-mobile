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
import { useWorkerWithRanch } from '../../../../hooks/workers/use-WorkerWithRanch'; // Ajusta la ruta si es necesario

import { showMessage } from 'react-native-flash-message';
export default function QrScannerRanch() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    // Hook de vinculación
    const { linkWorkerToRanch, loading } = useWorkerWithRanch();

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }: any) => {
        setScanned(true);
        console.log(`📡 QR Escaneado [${type}]: ${data}`);

        try {
            // 1. Obtener ID del Usuario actual (Worker)
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
            console.log("🔍 Datos de usuario recuperados:", userData);

            // Ajuste para usar la propiedad correcta 'idUser'
            const userId = userData.idUser;

            if (!userId) {
                showMessage({
                    message: "Error",
                    description: "ID de usuario inválido en la sesión.",
                    type: "danger",
                });
                return;
            }

            // 2. Parsear data del QR
            // Asumimos que el QR es un JSON: { "idRanch": 3 } o simplemente el número "3"
            let ranchIdParsed: number;

            try {
                // Intento A: Es un JSON
                const parsedData = JSON.parse(data);
                ranchIdParsed = Number(parsedData.ranchId || parsedData.idRanch || parsedData.id);
            } catch (e) {
                // Intento B: Es solo un número o string plano
                ranchIdParsed = Number(data);
            }

            if (!ranchIdParsed || isNaN(ranchIdParsed)) {
                showMessage({
                    message: "QR Inválido",
                    description: "El código escaneado no contiene una ID de estancia válida.",
                    type: "warning",
                });
                // Dar tiempo para leer el mensaje antes de permitir escanear de nuevo
                setTimeout(() => setScanned(false), 2000);
                return;
            }

            // 3. Llamar a la API
            const success = await linkWorkerToRanch(userId, ranchIdParsed);

            if (success) {
                showMessage({
                    message: "¡Vinculación Exitosa!",
                    description: "Te has unido a la estancia correctamente.",
                    type: "success",
                });
                setTimeout(() => router.replace('/views/(tabs)/worker/WorkerManagement'), 1500);
            } else {
                // Si falla, permitimos escanear de nuevo
                showMessage({
                    message: "Error",
                    description: "No se pudo vincular a la estancia.",
                    type: "danger",
                });
                setTimeout(() => setScanned(false), 2000);
            }

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
                onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
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

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Vinculando...</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    buttonPermission: { padding: 20, backgroundColor: Colors.primary, borderRadius: 10 },
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

    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'white', marginTop: 10, fontWeight: 'bold' }
});