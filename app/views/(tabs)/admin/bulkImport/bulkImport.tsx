// views/BulkImport/BulkImportMenu.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert, ScrollView, StatusBar,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';

interface ImportOption {
    title: string; subtitle: string;
    icon: keyof typeof Ionicons.glyphMap; color: string;
    route: string | null; available: boolean; columns: string[];
}

const OPTIONS: ImportOption[] = [
    {
        title: 'Animales', subtitle: 'Inventario inicial o actualización masiva',
        icon: 'paw', color: Colors.primary,
        route: '/views/(tabs)/admin/bulkImport/BulkImportAnimals', available: true,
        columns: ['CÓDIGO DEL ANIMAL', 'SEXO', 'CATEGORÍA', 'RAZA',
            'FECHA DE NACIMIENTO (DD/MM/YYYY)', 'EDAD EN MESES (Opcional)', 'LOTE ACTUAL (Opcional)', 'PESO ACTUAL'],
    },
    {
        title: 'Registros de Pesaje', subtitle: 'Historial de pesos y condición corporal',
        icon: 'barbell-outline', color: '#F59E0B',
        route: '/views/(tabs)/admin/bulkImport/BulkImportWeights', available: true,
        columns: ['CÓDIGO ANIMAL', 'FECHA PESAJE (DD/MM/YYYY)', 'PESO (KG)', 'CONDICIÓN CORPORAL (1-5)', 'OBSERVACIONES'],
    },
    {
        title: 'Gestaciones', subtitle: 'Importar diagnósticos de gestación',
        icon: 'analytics-outline', color: '#8B5CF6',
        route: null, available: false, columns: [],
    },
];

export default function BulkImportMenu() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [expanded, setExpanded] = React.useState<number | null>(null);

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
            <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.replace('/views/(tabs)/admin/management/Management' as any)} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={s.titleWrap}>
                    <Text style={s.title}>Carga Masiva</Text>
                    <Text style={s.subtitle}>Importar datos desde Excel</Text>
                </View>
            </View>

            <ScrollView style={s.body} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                <View style={s.infoBox}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
                    <Text style={s.infoText}>
                        Seleccioná el tipo de datos a importar. Mantené presionada una opción
                        para ver las columnas requeridas en la plantilla.
                    </Text>
                </View>

                <Text style={s.sectionLabel}>TIPO DE IMPORTACIÓN</Text>

                {OPTIONS.map((opt, i) => (
                    <View key={i}>
                        <TouchableOpacity
                            style={[s.card, !opt.available && s.cardDisabled]}
                            activeOpacity={opt.available ? 0.85 : 1}
                            onPress={() => {
                                if (!opt.available) {
                                    Alert.alert('Próximamente', `"${opt.title}" estará disponible pronto.`);
                                    return;
                                }
                                router.push(opt.route as any);
                            }}
                            onLongPress={() => setExpanded(expanded === i ? null : i)}
                        >
                            <View style={[s.iconWrap, { backgroundColor: opt.color + '15' }]}>
                                <Ionicons name={opt.icon} size={26} color={opt.available ? opt.color : Colors.textDisabled} />
                            </View>
                            <View style={s.cardText}>
                                <Text style={[s.cardTitle, !opt.available && s.textDisabled]}>{opt.title}</Text>
                                <Text style={s.cardSub}>{opt.subtitle}</Text>
                            </View>
                            {opt.available
                                ? <Ionicons name="chevron-forward" size={20} color={opt.color} />
                                : <View style={s.soonBadge}><Text style={s.soonText}>Pronto</Text></View>
                            }
                        </TouchableOpacity>

                        {expanded === i && opt.columns.length > 0 && (
                            <View style={[s.colBox, { borderColor: opt.color + '40' }]}>
                                <Text style={[s.colTitle, { color: opt.color }]}>Columnas requeridas:</Text>
                                {opt.columns.map((c, ci) => (
                                    <View key={ci} style={s.colRow}>
                                        <View style={[s.colDot, { backgroundColor: opt.color }]} />
                                        <Text style={s.colTxt}>{c}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background, gap: Spacing.md },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    body: { flex: 1, paddingHorizontal: Spacing.lg },
    content: { paddingTop: Spacing.sm },
    infoBox: { flexDirection: 'row', backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.xl, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 20 },
    sectionLabel: { ...Typography.overline, color: Colors.textSecondary, fontWeight: '800', marginBottom: Spacing.md, letterSpacing: 1 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md, ...Shadows.card, borderWidth: 1, borderColor: Colors.border },
    cardDisabled: { opacity: 0.65 },
    iconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
    cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    textDisabled: { color: Colors.textDisabled },
    soonBadge: { backgroundColor: Colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    soonText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
    colBox: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: -Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    colTitle: { fontSize: 11, fontWeight: '800', marginBottom: 8 },
    colRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    colDot: { width: 5, height: 5, borderRadius: 3 },
    colTxt: { fontSize: 12, color: Colors.textSecondary },
    tipBox: { backgroundColor: '#EFF6FF', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.lg, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
    tipTitle: { fontSize: 13, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
    tipBody: { fontSize: 12, color: '#1E3A8A', lineHeight: 18 },
});