import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../../../../constants/theme';
import { usePendingSales } from '../../../../../../hooks/movements/use-PendingSales';
import { breedingFormStyles as styles } from '../breeding/_breedingFormStyles';

export default function PendingSalesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { sales, loading, error, load, decide, cancel } = usePendingSales();

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const handleDecide = (idMovementAnimal: string, code: string, status: 'accepted' | 'rejected') => {
        const label = status === 'accepted' ? 'aceptar' : 'rechazar';
        const warning = status === 'accepted' ? ' Esta acción es IRREVERSIBLE (el animal queda vendido).' : '';
        Alert.alert(
            status === 'accepted' ? 'Confirmar venta' : 'Rechazar venta',
            `¿Seguro que querés ${label} la venta de ${code}?${warning}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: label === 'aceptar' ? 'Aceptar' : 'Rechazar', style: status === 'accepted' ? 'default' : 'destructive', onPress: () => decide(idMovementAnimal, status) },
            ]
        );
    };

    const handleCancelMovement = (idMovement: string, counterpartName: string | null) => {
        Alert.alert(
            'Cancelar venta',
            `¿Seguro que querés cancelar toda la venta a ${counterpartName || 'este comprador'}? Los animales que ya fueron aceptados individualmente no se ven afectados (son irreversibles); el resto vuelve a su estado anterior.`,
            [
                { text: 'Volver', style: 'cancel' },
                { text: 'Cancelar venta', style: 'destructive', onPress: () => cancel(idMovement) },
            ]
        );
    };

    return (
        <View style={styles.mainContainer}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Ventas Pendientes</Text>
                    <Text style={styles.subtitle}>Confirmar o rechazar por animal</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: Colors.success + '20' }]}>
                    <Ionicons name="time-outline" size={22} color={Colors.success} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            >
                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color={Colors.error} />
                        <Text style={styles.errorBoxText}>{error}</Text>
                    </View>
                )}

                {!loading && sales.length === 0 && (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                        <Ionicons name="checkmark-done-circle-outline" size={48} color={Colors.textDisabled} />
                        <Text style={{ marginTop: 12, color: Colors.textSecondary, textAlign: 'center' }}>
                            No hay ventas pendientes de confirmación.
                        </Text>
                    </View>
                )}

                {sales.map((sale) => (
                    <View key={sale.id_movement} style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>{sale.counterpart_name || 'Sin comprador'}</Text>
                                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
                                    {new Date(sale.movement_date).toLocaleDateString('es-BO')}
                                    {sale.total_price ? ` · $${sale.total_price}` : ''}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={{ padding: 8, backgroundColor: Colors.error + '15', borderRadius: 8 }}
                                onPress={() => handleCancelMovement(sale.id_movement, sale.counterpart_name)}
                            >
                                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                            </TouchableOpacity>
                        </View>

                        {sale.animals.map((a) => (
                            <View key={a.id_movement_animal} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary }}>{a.code}</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        style={{ padding: 8, backgroundColor: Colors.error + '15', borderRadius: 8 }}
                                        onPress={() => handleDecide(a.id_movement_animal, a.code, 'rejected')}
                                    >
                                        <Ionicons name="close" size={20} color={Colors.error} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ padding: 8, backgroundColor: Colors.success + '15', borderRadius: 8 }}
                                        onPress={() => handleDecide(a.id_movement_animal, a.code, 'accepted')}
                                    >
                                        <Ionicons name="checkmark" size={20} color={Colors.success} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
