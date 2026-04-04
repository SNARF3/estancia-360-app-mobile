import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { BorderRadius, Colors, Spacing, Typography } from '../../../../../../constants/theme';
import {
    BODY_CONDITION_LABELS,
    DESTINATION_LABELS,
} from '../../../../../../hooks/breeding/breeding.types';
import { useRearingSelection } from '../../../../../../hooks/breeding/use-RearingSelection';
import { breedingFormStyles as styles } from './breedingFormStyles';

export default function RearingSelectionForm() {
    const router = useRouter();
    const params = useLocalSearchParams<{ animalCode?: string }>();
    const {
        formData,
        updateField,
        saveSelection,
        resetForm,
        loading,
        error,
        success,
    } = useRearingSelection();

    useEffect(() => {
        if (params.animalCode) {
            updateField('animalCode', params.animalCode);
        }
    }, [params.animalCode]);

    const handleSave = async () => {
        const result = await saveSelection();
        if (result) {
            const destMsg =
                formData.destination === 'fattening' ? 'El animal fue enviado a Engorde.' :
                    formData.destination === 'sale' ? 'El animal fue registrado para venta.' :
                        'El animal fue marcado como reposición.';
            Alert.alert(
                'Selección Registrada',
                destMsg,
                [
                    { text: 'Nuevo Registro', onPress: resetForm },
                    {
                        text: 'Volver',
                        onPress: () => { resetForm(); router.back(); },
                    },
                ]
            );
        }
    };

    const destinations = Object.entries(DESTINATION_LABELS) as [string, string][];
    const bodyConditions = Object.entries(BODY_CONDITION_LABELS) as [string, string][];

    const getDestinationColor = (key: string) => {
        switch (key) {
            case 'replacement': return Colors.primary;
            case 'fattening': return Colors.secondary;
            case 'sale': return '#F59E0B';
            default: return Colors.textSecondary;
        }
    };

    const getDestinationIcon = (key: string): keyof typeof Ionicons.glyphMap => {
        switch (key) {
            case 'replacement': return 'swap-horizontal';
            case 'fattening': return 'restaurant';
            case 'sale': return 'cash';
            default: return 'help';
        }
    };

    // El lote de destino es obligatorio para fattening y replacement
    const needsLot = formData.destination === 'fattening' || formData.destination === 'replacement';

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Selección de Recría</Text>
                    <Text style={styles.subtitle}>Clasificación y Destino</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Ionicons name="ribbon" size={24} color="#F59E0B" />
                </View>
            </View>

            {/* Error / Success */}
            {error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={styles.errorBoxText}>{error}</Text>
                </View>
            )}
            {success && (
                <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.successBoxText}>Selección registrada exitosamente.</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Datos del Animal */}
                    <Text style={styles.sectionTitle}>DATOS DEL ANIMAL</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>CÓDIGO DEL ANIMAL *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: CRIA-001"
                            value={formData.animalCode}
                            onChangeText={(text) => updateField('animalCode', text)}
                            placeholderTextColor={Colors.textDisabled}
                            autoCapitalize="characters"
                        />
                        <DateSelector
                            label="FECHA DE SELECCIÓN"
                            value={formData.eventDate}
                            onChange={(date) => updateField('eventDate', date)}
                        />
                    </View>

                    {/* Destino */}
                    <Text style={styles.sectionTitle}>DESTINO *</Text>
                    <View style={styles.card}>
                        {destinations.map(([key, label]) => {
                            const isSelected = formData.destination === key;
                            const color = getDestinationColor(key);
                            const icon = getDestinationIcon(key);
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        localStyles.destinationCard,
                                        isSelected && { borderColor: color, backgroundColor: color + '08' },
                                    ]}
                                    onPress={() => updateField('destination', key as any)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[localStyles.destinationIcon, { backgroundColor: color + '15' }]}>
                                        <Ionicons name={icon} size={22} color={color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[localStyles.destinationTitle, isSelected && { color }]}>
                                            {label}
                                        </Text>
                                        <Text style={localStyles.destinationDesc}>
                                            {key === 'replacement' ? 'Animal queda como reemplazo en el hato' :
                                                key === 'fattening' ? 'Se envía a lote de engorde' :
                                                    'Destinado para venta'}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={22} color={color} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        {/* Lote de destino — solo si aplica */}
                        {needsLot && (
                            <>
                                <Text style={styles.label}>LOTE DE DESTINO *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={
                                        formData.destination === 'fattening'
                                            ? 'Ej: Lote Engorde 2'
                                            : 'Ej: Lote Reposición'
                                    }
                                    value={formData.lotDestName ?? ''}
                                    onChangeText={(text) => updateField('lotDestName', text)}
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </>
                        )}
                    </View>

                    {/* Evaluación Zootécnica */}
                    <Text style={styles.sectionTitle}>EVALUACIÓN ZOOTÉCNICA</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>PESO (KG)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 250"
                                    value={formData.weight_at_selection?.toString() ?? ''}
                                    onChangeText={(text) =>
                                        updateField('weight_at_selection', text ? parseFloat(text) : null)
                                    }
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>EDAD (DÍAS)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 365"
                                    value={formData.age_days?.toString() ?? ''}
                                    onChangeText={(text) =>
                                        updateField('age_days', text ? parseInt(text) : null)
                                    }
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>CONDICIÓN CORPORAL (1-5)</Text>
                        <View style={localStyles.bodyConditionRow}>
                            {bodyConditions.map(([key]) => {
                                const numKey = parseInt(key);
                                const isSelected = formData.body_condition === numKey;
                                const bcColors = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];
                                const bcColor = bcColors[numKey - 1];
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            localStyles.bcChip,
                                            isSelected && { backgroundColor: bcColor, borderColor: bcColor },
                                        ]}
                                        onPress={() => updateField('body_condition', numKey)}
                                    >
                                        <Text style={[
                                            localStyles.bcChipText,
                                            isSelected && { color: Colors.white },
                                        ]}>
                                            {key}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {formData.body_condition ? (
                            <View style={styles.badgeRow}>
                                <View style={[
                                    styles.badgeDot,
                                    { backgroundColor: ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'][(formData.body_condition ?? 1) - 1] },
                                ]} />
                                <Text style={styles.badgeText}>
                                    {BODY_CONDITION_LABELS[formData.body_condition]}
                                </Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>PUNTAJE GENÉTICO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 85.50"
                            value={formData.genetic_score?.toString() ?? ''}
                            onChangeText={(text) =>
                                updateField('genetic_score', text ? parseFloat(text) : null)
                            }
                            keyboardType="numeric"
                            placeholderTextColor={Colors.textDisabled}
                        />
                    </View>

                    {/* Observaciones */}
                    <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Notas sobre la selección, criterios aplicados..."
                            value={formData.notes ?? ''}
                            onChangeText={(text) => updateField('notes', text)}
                            placeholderTextColor={Colors.textDisabled}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            La selección determinará el destino productivo del animal en el hato.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.saveButtonText}>REGISTRAR SELECCIÓN</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const localStyles = StyleSheet.create({
    destinationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
        gap: 12,
    },
    destinationIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    destinationTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontFamily: Typography.fontPrimary,
    },
    destinationDesc: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontFamily: Typography.fontSecondary,
        marginTop: 2,
    },
    bodyConditionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
        gap: 8,
    },
    bcChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    bcChipText: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textSecondary,
        fontFamily: Typography.fontPrimary,
    },
});