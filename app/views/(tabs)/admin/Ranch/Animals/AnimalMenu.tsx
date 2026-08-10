import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { useAnimalClassification } from '../../../../../../hooks/Animals/offline/use-AnimalClassification';
import { useGetListAnimals } from '../../../../../../hooks/Animals/offline/use-GetListAnimals';
import { useSafeRouter } from '../../../../../../hooks/navigation/use-SafeRouter';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AnimalMenuScreen() {
    const insets = useSafeAreaInsets();
    const router = useSafeRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const { animals, loading, refreshAnimals, meta } = useGetListAnimals();
    const classifiedAnimals = useAnimalClassification(animals);

    // ── Lista filtrada ───────────────────────────────────────────────────────

    const filteredAnimals = useMemo(() => {
        if (!searchQuery) return classifiedAnimals;
        const q = searchQuery.toLowerCase();
        return classifiedAnimals.filter(a =>
            a.code.toLowerCase().includes(q) ||
            a.breed.name.toLowerCase().includes(q) ||
            a.classification.label.toLowerCase().includes(q)
        );
    }, [classifiedAnimals, searchQuery]);

    // ── Tarjeta de animal ────────────────────────────────────────────────────

    const renderAnimal = useCallback(({ item }: { item: typeof filteredAnimals[0] }) => {
        const isOk = item.status.name === 'OK';
        const sColor = isOk ? Colors.success : Colors.error;
        const sBg = isOk ? Colors.successLight : Colors.errorLight;
        const { classification: cls } = item;
        return (
            <TouchableOpacity
                style={styles.animalCard}
                activeOpacity={0.7}
                onPress={() => router.push({
                    pathname: '/views/(tabs)/admin/Ranch/Animals/DetailAnimal',
                    params: {
                        id: item.id, code: item.code, sex: item.sex,
                        birthdate: item.birthdate, weight: item.weight?.toString() ?? '0',
                        origin: item.origin ?? '', id_animal_class: item.id_animal_class.toString(),
                        isCastrated: String(item.isCastrated), isSterilized: String(item.isSterilized),
                        hasCalved: String(item.hasCalved), idMother: item.idMother ?? '',
                        idFather: item.idFather ?? '', breed: JSON.stringify(item.breed),
                        status: JSON.stringify(item.status),
                    } as any,
                })}
            >
                <View style={[styles.statusBar, { backgroundColor: sColor }]} />
                <View style={styles.animalInfo}>
                    <View style={[styles.clsBadge, { backgroundColor: cls.backgroundColor }]}>
                        <Text style={[styles.clsText, { color: cls.color }]}>{cls.label.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.animalCode}>{item.code}</Text>
                    <View style={styles.rowGap}>
                        <Ionicons name="receipt-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.locationText}>{item.breed.name}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.locationText}>{new Date(item.birthdate).toLocaleDateString()}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <View style={[styles.sBadge, { backgroundColor: sBg }]}>
                        <Text style={[styles.sBadgeText, { color: sColor }]}>{item.status.name}</Text>
                    </View>
                    <View style={[styles.catPill, { backgroundColor: cls.backgroundColor }]}>
                        <Text style={[styles.catText, { color: cls.color }]}>{cls.category.toUpperCase()}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, []);

    // ── JSX ──────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.replace('/views/(tabs)/admin/management/Management')} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Mis Animales</Text>
                        <TouchableOpacity onPress={refreshAnimals} style={styles.reloadBtn}>
                            <Ionicons name="refresh" size={26} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por arete, raza o tipo..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.textDisabled}
                    />
                    <Ionicons name="search" size={22} color={Colors.primary} />
                </View>
            </View>

            {/* Lista */}
            <ScreenContainer scrollable={false} style={styles.body}>
                <FlatList
                    data={filteredAnimals}
                    renderItem={renderAnimal}
                    keyExtractor={i => i.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAnimals} colors={[Colors.primary]} />}
                    ListHeaderComponent={
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>STOCK TOTAL</Text>
                                <Text style={styles.summaryValue}>{meta.total}</Text>
                            </View>
                            <View style={styles.summaryDiv} />
                            <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
                                <Text style={styles.summaryLabel}>MOSTRANDO</Text>
                                <Text style={styles.summaryValue}>{filteredAnimals.length}</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.empty}>
                                <Ionicons name="clipboard-outline" size={48} color={Colors.textDisabled} />
                                <Text style={styles.emptyText}>No hay animales registrados</Text>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={<View style={{ height: 100 }} />}
                />

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/views/(tabs)/admin/Ranch/Animals/AddAnimal')}
                >
                    <Ionicons name="add" size={32} color={Colors.white} />
                    <Text style={styles.fabTxt}>NUEVO ANIMAL</Text>
                </TouchableOpacity>
            </ScreenContainer>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    body: { flex: 1, paddingHorizontal: Spacing.lg },
    header: { backgroundColor: Colors.background, paddingBottom: 8, paddingHorizontal: Spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    backBtn: { marginRight: Spacing.md },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },
    reloadBtn: { padding: 4 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, height: 48, ...Shadows.card, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
    searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

    summaryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card },
    summaryDiv: { width: 1, height: '80%', backgroundColor: Colors.white + '30' },
    summaryItem: { flex: 1 },
    summaryLabel: { ...Typography.overline, color: Colors.white + 'BB', fontWeight: '700', marginBottom: 4 },
    summaryValue: { fontSize: 28, fontWeight: '800', color: Colors.white },

    listContent: { paddingBottom: Spacing.xl },

    animalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.card, minHeight: 90 },
    statusBar: { width: 5, height: '70%', borderRadius: 5, marginRight: Spacing.md },
    animalInfo: { flex: 1 },
    clsBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, marginBottom: 3 },
    clsText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    animalCode: { ...Typography.h2, color: Colors.primary, fontSize: 20, fontWeight: '800', marginBottom: 2 },
    rowGap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3 },
    locationText: { ...Typography.bodySmall, color: Colors.textSecondary, fontSize: 11 },
    dot: { color: Colors.textDisabled, fontSize: 11, marginHorizontal: 2 },
    cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 70, paddingVertical: 2 },
    sBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
    sBadgeText: { fontSize: 10, fontWeight: '800' },
    catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    catText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

    fab: { position: 'absolute', bottom: 30, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.primaryButton, height: 60, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...Shadows.floatingButton, zIndex: 20 },
    fabTxt: { color: Colors.white, fontSize: 18, fontWeight: '800', marginLeft: 10 },

    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.md },
    emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
