// views/BulkImport/BulkImportMenu.tsx
// Pantalla de selección del tipo de carga masiva

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';

interface ImportOption {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    route: string | null;
    available: boolean;
}

const OPTIONS: ImportOption[] = [
    {
        title: 'Animales',
        subtitle: 'Carga masiva desde plantilla Excel (.xlsx)',
        icon: 'paw',
        color: Colors.primary,
        route: '/views/(tabs)/admin/bulkImport/BulkImportAnimals',
        available: true,
    },
    {
        title: 'Gestaciones',
        subtitle: 'Importar diagnósticos de gestación',
        icon: 'analytics-outline',
        color: '#8B5CF6',
        route: null,
        available: false,
    },
    {
        title: 'Registros de Pesaje',
        subtitle: 'Importar historial de pesos',
        icon: 'barbell-outline',
        color: '#F59E0B',
        route: null,
        available: false,
    },
];

export default function BulkImportMenu() {
    const router = useRouter();

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>Carga Masiva</Text>
                    <Text style={styles.subtitle}>Importar datos desde Excel</Text>
                </View>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Instrucción */}
                <View style={styles.infoBox}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Seleccioná el tipo de datos que querés importar.
                        Descargá la plantilla Excel, completá los datos y cargá el archivo.
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>TIPO DE IMPORTACIÓN</Text>

                {OPTIONS.map((opt, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.card, !opt.available && styles.cardDisabled]}
                        activeOpacity={opt.available ? 0.8 : 1}
                        onPress={() => {
                            if (!opt.available) {
                                Alert.alert('Próximamente', `La importación de "${opt.title}" estará disponible pronto.`);
                                return;
                            }
                            router.push(opt.route as any);
                        }}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: opt.color + '15' }]}>
                            <Ionicons name={opt.icon} size={26} color={opt.available ? opt.color : Colors.textDisabled} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={[styles.cardTitle, !opt.available && styles.textDisabled]}>
                                {opt.title}
                            </Text>
                            <Text style={styles.cardSub}>{opt.subtitle}</Text>
                        </View>
                        {opt.available ? (
                            <Ionicons name="chevron-forward" size={20} color={opt.color} />
                        ) : (
                            <View style={styles.soonBadge}>
                                <Text style={styles.soonText}>Pronto</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Tip de plantilla */}
                <View style={styles.tipBox}>
                    <Text style={styles.tipTitle}>📋 Estructura de la plantilla</Text>
                    <Text style={styles.tipBody}>
                        La plantilla de animales debe tener las columnas:{'\n'}
                        CÓDIGO DEL ANIMAL · SEXO · CATEGORÍA · RAZA{'\n'}
                        FECHA DE NACIMIENTO · EDAD EN MESES · LOTE ACTUAL · PESO ACTUAL
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
        gap: Spacing.md,
    },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    body: { flex: 1, paddingHorizontal: Spacing.lg },
    content: { paddingTop: Spacing.sm },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
        alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 20 },

    sectionLabel: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '800',
        marginBottom: Spacing.md,
        letterSpacing: 1,
    },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        gap: Spacing.md,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardDisabled: { opacity: 0.65 },
    iconWrap: {
        width: 50, height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
    cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    textDisabled: { color: Colors.textDisabled },

    soonBadge: {
        backgroundColor: Colors.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    soonText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    tipBox: {
        backgroundColor: '#FEF9C3',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.lg,
        borderLeftWidth: 3,
        borderLeftColor: '#EAB308',
    },
    tipTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 6 },
    tipBody: { fontSize: 12, color: '#78350F', lineHeight: 20 },
});