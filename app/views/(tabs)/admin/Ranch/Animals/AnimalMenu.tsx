import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { useAnimalClassification } from '../../../../../../hooks/Animals/use-AnimalClasification';
import { Animal, useGetListAnimals } from '../../../../../../hooks/Animals/use-GetListAnimals';

export default function AnimalMenuScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const { animals, loading, refreshAnimals, meta } = useGetListAnimals();

    // Animales con clasificación visual adjunta
    const classifiedAnimals = useAnimalClassification(animals);

    useFocusEffect(
        useCallback(() => {
            refreshAnimals();
        }, [])
    );

    const handlePressAnimal = (animal: Animal) => {
        router.push({
            pathname: '/views/(tabs)/admin/Ranch/Animals/DetailAnimal',
            params: {
                ...animal,
                breed: JSON.stringify(animal.breed),
                status: JSON.stringify(animal.status),
                isCastrated: String(animal.isCastrated),
                isSterilized: String(animal.isSterilized),
                hasCalved: String(animal.hasCalved),
            } as any
        });
    };

    const handleBack = () => router.back();
    const handleNewRegistration = () => router.push('/views/(tabs)/admin/Ranch/Animals/AddAnimal');

    const filteredAnimals = useMemo(() => {
        if (!searchQuery) return classifiedAnimals;
        const query = searchQuery.toLowerCase();
        return classifiedAnimals.filter(animal =>
            animal.code.toLowerCase().includes(query) ||
            animal.breed.name.toLowerCase().includes(query) ||
            animal.classification.label.toLowerCase().includes(query)
        );
    }, [classifiedAnimals, searchQuery]);

    const renderAnimalItem = ({ item }: { item: typeof filteredAnimals[0] }) => {
        const isOk = item.status.name === 'OK';
        const statusColor = isOk ? Colors.success : Colors.error;
        const statusBg = isOk ? Colors.successLight : Colors.errorLight;
        const { classification } = item;

        return (
            <TouchableOpacity
                style={styles.animalCard}
                activeOpacity={0.7}
                onPress={() => handlePressAnimal(item)}
            >
                {/* Barra lateral de estado sanitario */}
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

                <View style={styles.animalInfo}>
                    {/* Clasificación visual arriba del código */}
                    <View style={[styles.classificationBadge, { backgroundColor: classification.backgroundColor }]}>
                        <Text style={[styles.classificationText, { color: classification.color }]}>
                            {classification.label.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.animalCode}>{item.code}</Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="paw-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.locationText}>{item.breed.name}</Text>
                        <Text style={styles.dotSeparator}>·</Text>
                        <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.locationText}>{new Date(item.birthdate).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {item.status.name}
                        </Text>
                    </View>
                    <View style={[styles.categoryPill, { backgroundColor: classification.backgroundColor }]}>
                        <Text style={[styles.categoryPillText, { color: classification.color }]}>
                            {item.classification.category.toUpperCase()}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                </View>
            </TouchableOpacity>
        );
    };

    const ListHeader = () => (
        <>
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>STOCK TOTAL</Text>
                    <Text style={styles.summaryValue}>{meta?.total || (animals?.length || 0)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.summaryLabel}>PÁGINAS</Text>
                    <Text style={styles.summaryValue}>
                        {meta?.pages || 1} <Text style={styles.summaryValueSuffix}>Total</Text>
                    </Text>
                </View>
            </View>
            <Text style={styles.sectionTitle}>MIS ANIMALES</Text>
        </>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Corral Virtual</Text>
                        <TouchableOpacity onPress={refreshAnimals} style={styles.reloadButton}>
                            <Ionicons name="refresh" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por arete, raza o tipo..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.textDisabled}
                    />
                    <Ionicons name="search" size={24} color={Colors.primary} style={styles.searchIcon} />
                </View>
            </View>

            <ScreenContainer scrollable={false} style={styles.container}>
                <FlatList
                    data={filteredAnimals}
                    renderItem={renderAnimalItem}
                    keyExtractor={(item) => item.id.toString()}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={refreshAnimals} colors={[Colors.primary]} />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="clipboard-outline" size={48} color={Colors.textDisabled} />
                                <Text style={styles.emptyText}>No hay animales registrados</Text>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={<View style={{ height: 100 }} />}
                />
                <TouchableOpacity style={styles.fab} onPress={handleNewRegistration}>
                    <Ionicons name="add" size={32} color={Colors.white} />
                    <Text style={styles.fabText}>NUEVO REGISTRO</Text>
                </TouchableOpacity>
            </ScreenContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Colors.background },
    container: { flex: 1, paddingHorizontal: Spacing.lg },
    header: {
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 10,
        paddingHorizontal: Spacing.lg,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    backButton: { marginRight: Spacing.md },
    headerTitle: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },
    titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reloadButton: { padding: 4 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.lg,
        height: 55,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },
    searchIcon: { marginLeft: Spacing.sm },

    // Summary card
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginTop: Spacing.xs,
        ...Shadows.card,
    },
    summaryDivider: { width: 1, height: '80%', backgroundColor: Colors.white + '30' },
    summaryItem: { flex: 1 },
    summaryLabel: { ...Typography.overline, color: Colors.white + 'BB', fontWeight: '700', marginBottom: 4 },
    summaryValue: { fontSize: 28, fontWeight: '800', color: Colors.white },
    summaryValueSuffix: { fontSize: 18, fontWeight: '600', color: Colors.white + 'CC' },

    sectionTitle: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '800',
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
        letterSpacing: 1,
    },
    listContent: { paddingBottom: Spacing.xl },

    // Animal card
    animalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadows.card,
        minHeight: 90,
    },
    statusIndicator: { width: 5, height: '70%', borderRadius: 5, marginRight: Spacing.md },
    animalInfo: { flex: 1 },
    classificationBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 3,
    },
    classificationText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    animalCode: { ...Typography.h2, color: Colors.primary, fontSize: 20, fontWeight: '800', marginBottom: 2 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3 },
    locationText: { ...Typography.bodySmall, color: Colors.textSecondary, fontSize: 11 },
    dotSeparator: { color: Colors.textDisabled, fontSize: 11, marginHorizontal: 2 },

    // Card right side
    cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 70, paddingVertical: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    categoryPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 30,
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: Colors.primary,
        height: 60,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.floatingButton,
        zIndex: 20,
    },
    fabText: { color: Colors.white, fontSize: 18, fontWeight: '800', marginLeft: 10 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.md },
    emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});