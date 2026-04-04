import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { DateSelector } from '../../../../../../components/common/DateSelector';
import { Colors } from '../../../../../../constants/theme';
import { useWeaning } from '../../../../../../hooks/breeding/use-Weaning';
import { breedingFormStyles as styles } from './breedingFormStyles';

export default function WeaningForm() {
    const router = useRouter();
    const params = useLocalSearchParams<{ criaCode?: string }>();
    const {
        formData,
        updateField,
        saveWeaning,
        resetForm,
        loading,
        error,
        success,
    } = useWeaning();

    useEffect(() => {
        if (params.criaCode) {
            updateField('criaCode', params.criaCode);
        }
    }, [params.criaCode]);

    const handleSave = async () => {
        const result = await saveWeaning();
        if (result) {
            Alert.alert(
                'Destete Registrado',
                'El destete ha sido registrado correctamente. La cría pasó a etapa Recría.',
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

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Registro de Destete</Text>
                    <Text style={styles.subtitle}>Separación de Cría</Text>
                </View>
                <View style={[styles.headerIcon, { backgroundColor: '#0EA5E915' }]}>
                    <Ionicons name="git-branch" size={24} color="#0EA5E9" />
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
                    <Text style={styles.successBoxText}>Destete registrado exitosamente.</Text>
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
                    {/* Datos de la Cría — es la protagonista del destete */}
                    <Text style={styles.sectionTitle}>DATOS DE LA CRÍA</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>CÓDIGO DE LA CRÍA *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: CRIA-001"
                            value={formData.criaCode}
                            onChangeText={(text) => updateField('criaCode', text)}
                            placeholderTextColor={Colors.textDisabled}
                            autoCapitalize="characters"
                        />

                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>PESO AL DESTETE (KG)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 180"
                                    value={formData.weaning_weight?.toString() ?? ''}
                                    onChangeText={(text) =>
                                        updateField('weaning_weight', text ? parseFloat(text) : null)
                                    }
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Text style={styles.label}>EDAD (DÍAS)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 210"
                                    value={formData.weaning_age?.toString() ?? ''}
                                    onChangeText={(text) =>
                                        updateField('weaning_age', text ? parseInt(text) : null)
                                    }
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                        </View>

                        {/* Indicador GDP */}
                        {formData.weaning_weight && formData.weaning_age ? (
                            <View style={styles.badgeRow}>
                                <View style={[styles.badgeDot, { backgroundColor: '#0EA5E9' }]} />
                                <Text style={styles.badgeText}>
                                    GDP estimada: {((formData.weaning_weight / formData.weaning_age) * 1000).toFixed(0)} g/día
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Destino */}
                    <Text style={styles.sectionTitle}>DESTINO</Text>
                    <View style={styles.card}>
                        <DateSelector
                            label="FECHA DEL DESTETE"
                            value={formData.eventDate}
                            onChange={(date) => updateField('eventDate', date)}
                        />

                        <Text style={styles.label}>LOTE DE DESTINO *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Lote Recría 1"
                            value={formData.lotDestName}
                            onChangeText={(text) => updateField('lotDestName', text)}
                            placeholderTextColor={Colors.textDisabled}
                        />
                    </View>

                    {/* Observaciones */}
                    <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Notas sobre el destete..."
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
                            Al registrar el destete, la cría pasará automáticamente a etapa Recría
                            y será asignada al lote indicado.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.saveButtonText}>REGISTRAR DESTETE</Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}