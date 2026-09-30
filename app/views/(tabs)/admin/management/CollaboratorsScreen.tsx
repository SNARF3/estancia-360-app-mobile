import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderText } from '../../../../../components/common/HeaderText';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getSession } from '../../../../../hooks/auth/use-Auth';
import { CollaboratorItem, useCollaborators } from '../../../../../hooks/collaborators/use-Collaborators';

// ranch_role: OWNER=1, WORKER=2, ADMINISTRATOR=3 — mismo mapeo que usuario.tsx.
const ROLE_LABELS: Record<number, string> = {
    1: 'Propietario',
    2: 'Colaborador',
    3: 'Administrador',
};

const OWNER_RANCH_ROLE = 1;

export default function CollaboratorsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [idRanch, setIdRanch] = useState<number | null>(null);
    const { collaborators, loading, error, fetchCollaborators, removeCollaborator } = useCollaborators();

    useFocusEffect(
        useCallback(() => {
            getSession().then(session => {
                if (!session?.id_ranch) return;
                const ranchId = Number(session.id_ranch);
                setIdRanch(ranchId);
                fetchCollaborators(ranchId);
            }).catch(() => {});
        }, [])
    );

    const handleRemove = (item: CollaboratorItem) => {
        if (!idRanch) return;
        Alert.alert(
            'Quitar colaborador',
            `¿Seguro que querés quitar a ${item.fullname} de la estancia?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Quitar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await removeCollaborator(idRanch, item.idUser);
                        if (!result.success) {
                            Alert.alert('No se pudo quitar', result.message ?? 'Ocurrió un error inesperado.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScreenContainer scrollable={false}>
            <View style={[styles.headerRow, { marginTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
                </TouchableOpacity>
                <HeaderText variant="h2">Gestión de Colaboradores</HeaderText>
            </View>

            <TouchableOpacity
                style={styles.addButton}
                activeOpacity={0.85}
                onPress={() => router.push('/views/(tabs)/admin/management/QrWorkerGenerator' as any)}
            >
                <Ionicons name="qr-code-outline" size={20} color={Colors.white} />
                <Text style={styles.addButtonText}>Agregar colaborador</Text>
            </TouchableOpacity>

            {loading && (
                <View style={styles.centerBlock}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            )}

            {!loading && error && (
                <View style={styles.centerBlock}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {!loading && !error && (
                <View style={styles.list}>
                    {collaborators.map((item) => (
                        <View key={item.idUser} style={styles.card}>
                            <View style={styles.cardIcon}>
                                <Ionicons name="person" size={22} color={Colors.primary} />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName} numberOfLines={1}>{item.fullname}</Text>
                                <Text style={styles.cardRole}>{ROLE_LABELS[item.roleId] ?? 'Miembro'}</Text>
                            </View>
                            {item.roleId !== OWNER_RANCH_ROLE && (
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleRemove(item)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close-circle" size={26} color={Colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {collaborators.length === 0 && (
                        <Text style={styles.emptyText}>Todavía no hay colaboradores en esta estancia.</Text>
                    )}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    backButton: {
        marginRight: Spacing.md,
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primaryButton,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
    },
    addButtonText: {
        color: Colors.white,
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    centerBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.md,
    },
    errorText: {
        color: Colors.textSecondary,
        textAlign: 'center',
        ...Typography.body,
    },
    list: {
        gap: Spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
        ...Shadows.card,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.iconBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        fontFamily: Typography.fontPrimary,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    cardRole: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    removeButton: {
        padding: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginTop: Spacing.xl,
        ...Typography.body,
    },
});
