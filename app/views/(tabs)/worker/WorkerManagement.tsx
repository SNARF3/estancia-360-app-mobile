import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { HeaderText } from '../../../../components/common/HeaderText';
import { Colors, Spacing, Typography } from '../../../../constants/theme';

// Datos estáticos de ejemplo
const STATIC_JOBS = [
    { id: '1', title: 'Revisión de ganado', status: 'Pendiente', time: '08:00 AM', priority: 'Alta' },
    { id: '2', title: 'Limpieza de establos', status: 'En Progreso', time: '10:30 AM', priority: 'Media' },
    { id: '3', title: 'Vacunación Lote A', status: 'Completado', time: '02:00 PM', priority: 'Alta' },
    { id: '4', title: 'Reparación de cerca norte', status: 'Pendiente', time: '04:00 PM', priority: 'Baja' },
];

export default function WorkerManagementScreen() {
    const router = useRouter();

    const handleScanPress = () => {
        // Navegar a la pantalla del escáner creada arriba
        // Ajusta la ruta según donde guardes QrScannerRanch.tsx
        router.push('/views/worker/QrScannerRanch');
    };

    const renderJobItem = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.jobTitle}>{item.title}</Text>
                <View style={[
                    styles.badge,
                    item.status === 'Pendiente' ? styles.badgePending :
                        item.status === 'En Progreso' ? styles.badgeProgress : styles.badgeDone
                ]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.iconText}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>{item.time}</Text>
                </View>
                <View style={styles.iconText}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>{item.priority}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <HeaderText variant="h2">Mis Tareas</HeaderText>
                <Text style={styles.subtitle}>Gestión diaria de actividades</Text>
            </View>

            {/* Botón Principal de Acción: Escanear Estancia */}
            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.scanButton} onPress={handleScanPress} activeOpacity={0.8}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="qr-code-outline" size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.scanContent}>
                        <Text style={styles.scanTitle}>Unirse a una Estancia</Text>
                        <Text style={styles.scanSubtitle}>Escanea el código QR del dueño</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Lista de Trabajos</Text>

            <FlatList
                data={STATIC_JOBS}
                keyExtractor={(item) => item.id}
                renderItem={renderJobItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
    subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },

    // Botón de Escaneo
    actionContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    scanButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    scanContent: { flex: 1 },
    scanTitle: { ...Typography.h3, color: 'white', fontSize: 18 },
    scanSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },

    // Lista
    sectionTitle: { ...Typography.h3, marginLeft: Spacing.lg, marginBottom: Spacing.sm, color: Colors.textPrimary },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },

    // Tarjeta de Trabajo
    card: {
        backgroundColor: Colors.Surface,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    jobTitle: { ...Typography.body, fontWeight: 'bold', color: Colors.textPrimary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgePending: { backgroundColor: '#FFF4E5' }, // Naranja claro
    badgeProgress: { backgroundColor: '#E3F2FD' }, // Azul claro
    badgeDone: { backgroundColor: '#E8F5E9' }, // Verde claro
    badgeText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

    cardFooter: { flexDirection: 'row', gap: Spacing.lg },
    iconText: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { ...Typography.bodySmall, color: Colors.textSecondary }
});