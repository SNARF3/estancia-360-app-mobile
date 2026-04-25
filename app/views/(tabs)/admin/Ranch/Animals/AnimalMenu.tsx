import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { ScreenContainer } from '../../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import { useAnimalClassification } from '../../../../../../hooks/Animals/offline/use-AnimalClassification';
import {
    useGetDiagnoses,
    useGetParturitions,
    useGetRearingSelections,
    useGetServices,
    useGetWeanings,
    type DiagnosisRecord,
    type ParturitionRecord,
    type RearingSelectionRecord,
    type ServiceRecord,
    type WeaningRecord,
} from '../../../../../../hooks/Animals/offline/use-AnimalHistory';
import { Animal, useGetListAnimals } from '../../../../../../hooks/Animals/offline/use-GetListAnimals';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'todos' | 'servicios' | 'gestaciones' | 'partos' | 'destetes';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'todos', label: 'Todos', icon: 'grid-outline' },
    { key: 'servicios', label: 'Servicios', icon: 'heart-outline' },
    { key: 'gestaciones', label: 'Gestación', icon: 'analytics-outline' },
    { key: 'partos', label: 'Partos', icon: 'fitness-outline' },
    { key: 'destetes', label: 'Destetes', icon: 'git-branch-outline' },
];

// ─── Acciones del menú contextual ─────────────────────────────────────────────

const ANIMAL_ACTIONS: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    paramKey: string;
}[] = [
        { label: 'Registrar Servicio', icon: 'heart', route: '/views/(tabs)/admin/Ranch/breeding/BreedingServiceForm', paramKey: 'animalCode' },
        { label: 'Diagnóstico Gestación', icon: 'analytics', route: '/views/(tabs)/admin/Ranch/breeding/GestationDiagnosisForm', paramKey: 'animalCode' },
        { label: 'Registrar Parto', icon: 'fitness', route: '/views/(tabs)/admin/Ranch/breeding/ParturitionForm', paramKey: 'animalCode' },
        { label: 'Registrar Destete', icon: 'git-branch', route: '/views/(tabs)/admin/Ranch/breeding/WeaningForm', paramKey: 'criaCode' },

    ];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

const SERVICE_LABELS: Record<string, string> = {
    natural: 'Monta Natural', artificial_insemination: 'IA', embryo_transfer: 'T. Embrionaria',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AnimalMenuScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [menuAnimal, setMenuAnimal] = useState<Animal | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const menuAnim = useRef(new Animated.Value(0)).current;

    const { animals, loading: lAni, refreshAnimals, meta } = useGetListAnimals();
    const classifiedAnimals = useAnimalClassification(animals);

    const { records: services, loading: lSvc, fetch: fetchSvc } = useGetServices();
    const { records: diagnoses, loading: lDiag, fetch: fetchDiag } = useGetDiagnoses();
    const { records: parturitions, loading: lPart, fetch: fetchPart } = useGetParturitions();
    const { records: weanings, loading: lWean, fetch: fetchWean } = useGetWeanings();
    const { records: selections, loading: lSel, fetch: fetchSel } = useGetRearingSelections();

    useEffect(() => {
        if (activeTab === 'servicios') fetchSvc();
        if (activeTab === 'gestaciones') fetchDiag();
        if (activeTab === 'partos') fetchPart();
        if (activeTab === 'destetes') fetchWean();
    }, [activeTab]);

    // ── Menú contextual ──────────────────────────────────────────────────────

    const openMenu = useCallback((animal: Animal) => {
        setMenuAnimal(animal);
        setMenuVisible(true);
        Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    }, []);

    const closeMenu = useCallback(() => {
        Animated.timing(menuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setMenuVisible(false);
            setMenuAnimal(null);
        });
    }, []);

    const handleAction = useCallback((route: string, paramKey: string) => {
        if (!menuAnimal) return;
        const code = menuAnimal.code;
        closeMenu();
        setTimeout(() => {
            router.push({ pathname: route as any, params: { [paramKey]: code } });
        }, 200);
    }, [menuAnimal]);

    // ── Lista de animales filtrada ───────────────────────────────────────────

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
            <TouchableOpacity style={styles.animalCard} activeOpacity={0.7}
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
                    <TouchableOpacity
                        style={styles.dotsBtn}
                        onPress={() => openMenu(item)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }, [openMenu]);

    // ── Tarjetas de historial ────────────────────────────────────────────────

    const renderService = ({ item }: { item: ServiceRecord }) => (
        <View style={styles.histCard}>
            <View style={[styles.histAccent, { backgroundColor: '#F59E0B' }]} />
            <View style={styles.histBody}>
                <View style={styles.histHeader}>
                    <Text style={styles.histAnimal}>{item.animal_code}</Text>
                    <Text style={styles.histDate}>{fmtDate(item.event_date)}</Text>
                </View>
                <Text style={styles.histType}>{SERVICE_LABELS[item.service_type] ?? item.service_type}</Text>
                {item.male_code && <Text style={styles.histDetail}>🐂 Macho: {item.male_code}</Text>}
                {item.semen_breed && <Text style={styles.histDetail}>🧬 Semen: {item.semen_breed}</Text>}
                {item.technician && <Text style={styles.histDetail}>👤 Técnico: {item.technician}</Text>}
            </View>
            {item.is_synced === 0 && <View style={styles.pendingDot} />}
        </View>
    );

    const renderDiagnosis = ({ item }: { item: DiagnosisRecord }) => {
        const isPrg = item.result === 'pregnant';
        const resColor = isPrg ? Colors.primary : '#EF4444';
        const resLabel = isPrg ? 'Preñada' : 'Vacía';
        return (
            <View style={styles.histCard}>
                <View style={[styles.histAccent, { backgroundColor: resColor }]} />
                <View style={styles.histBody}>
                    <View style={styles.histHeader}>
                        <Text style={styles.histAnimal}>{item.animal_code}</Text>
                        <Text style={styles.histDate}>{fmtDate(item.event_date)}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: resColor + '20', borderColor: resColor }]}>
                        <Text style={[styles.chipText, { color: resColor }]}>{resLabel}</Text>
                    </View>
                    <Text style={styles.histDetail}>Método: {item.method === 'palpation' ? 'Palpación' : 'Ecografía'}</Text>
                    {item.gestation_days && <Text style={styles.histDetail}>📅 {item.gestation_days} días gestación</Text>}
                    {item.estimated_birth && <Text style={styles.histDetail}>🍼 Parto est.: {fmtDate(item.estimated_birth)}</Text>}
                    {item.veterinarian && <Text style={styles.histDetail}>👤 {item.veterinarian}</Text>}
                </View>
                {item.is_synced === 0 && <View style={styles.pendingDot} />}
            </View>
        );
    };

    const renderParturition = ({ item }: { item: ParturitionRecord }) => {
        const alive = item.cria_status === 'alive';
        const c = alive ? Colors.primary : '#EF4444';
        return (
            <View style={styles.histCard}>
                <View style={[styles.histAccent, { backgroundColor: '#8B5CF6' }]} />
                <View style={styles.histBody}>
                    <View style={styles.histHeader}>
                        <Text style={styles.histAnimal}>{item.animal_code}</Text>
                        <Text style={styles.histDate}>{fmtDate(item.event_date)}</Text>
                    </View>
                    <Text style={styles.histType}>{item.birth_type === 'normal' ? 'Normal' : item.birth_type === 'assisted' ? 'Asistido' : 'Cesárea'}</Text>
                    <View style={[styles.chip, { backgroundColor: c + '20', borderColor: c }]}>
                        <Text style={[styles.chipText, { color: c }]}>Cría {alive ? 'Viva' : 'Muerta'}</Text>
                    </View>
                    {item.cria_code && <Text style={styles.histDetail}>🐄 Cría: {item.cria_code}</Text>}
                    {item.cria_weight && <Text style={styles.histDetail}>⚖️ {(item.cria_weight / 1000).toFixed(1)} kg</Text>}
                </View>
                {item.is_synced === 0 && <View style={styles.pendingDot} />}
            </View>
        );
    };

    const renderWeaning = ({ item }: { item: WeaningRecord }) => (
        <View style={styles.histCard}>
            <View style={[styles.histAccent, { backgroundColor: '#0EA5E9' }]} />
            <View style={styles.histBody}>
                <View style={styles.histHeader}>
                    <Text style={styles.histAnimal}>{item.cria_code}</Text>
                    <Text style={styles.histDate}>{fmtDate(item.event_date)}</Text>
                </View>
                <Text style={styles.histType}>Destete</Text>
                {item.weaning_weight && <Text style={styles.histDetail}>⚖️ {item.weaning_weight} kg</Text>}
                {item.weaning_age && <Text style={styles.histDetail}>📅 {item.weaning_age} días</Text>}
                {item.weaning_weight && item.weaning_age && (
                    <Text style={styles.histDetail}>
                        📈 GDP: {((item.weaning_weight / item.weaning_age) * 1000).toFixed(0)} g/día
                    </Text>
                )}
                {item.lot_dest_name && <Text style={styles.histDetail}>📍 {item.lot_dest_name}</Text>}
            </View>
            {item.is_synced === 0 && <View style={styles.pendingDot} />}
        </View>
    );

    const renderSelection = ({ item }: { item: RearingSelectionRecord }) => {
        const colors: Record<string, string> = { replacement: Colors.primary, fattening: '#F59E0B', sale: '#EF4444' };
        const labels: Record<string, string> = { replacement: 'Reposición', fattening: 'Engorde', sale: 'Venta' };
        const c = colors[item.destination] ?? Colors.textSecondary;
        return (
            <View style={styles.histCard}>
                <View style={[styles.histAccent, { backgroundColor: c }]} />
                <View style={styles.histBody}>
                    <View style={styles.histHeader}>
                        <Text style={styles.histAnimal}>{item.animal_code}</Text>
                        <Text style={styles.histDate}>{fmtDate(item.event_date)}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: c + '20', borderColor: c }]}>
                        <Text style={[styles.chipText, { color: c }]}>{labels[item.destination] ?? item.destination}</Text>
                    </View>
                    {item.weight_at_selection && <Text style={styles.histDetail}>⚖️ {item.weight_at_selection} kg</Text>}
                    {item.body_condition && <Text style={styles.histDetail}>💪 CC: {item.body_condition}/5</Text>}
                    {item.lot_dest_name && <Text style={styles.histDetail}>📍 {item.lot_dest_name}</Text>}
                </View>
                {item.is_synced === 0 && <View style={styles.pendingDot} />}
            </View>
        );
    };

    const Empty = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
        <View style={styles.empty}>
            <Ionicons name={icon} size={48} color={Colors.textDisabled} />
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    );

    // ── Contenido por tab ────────────────────────────────────────────────────

    const tabContent = () => {
        const commonProps = { contentContainerStyle: styles.listContent, showsVerticalScrollIndicator: false, ListFooterComponent: <View style={{ height: 100 }} /> };
        switch (activeTab) {
            case 'todos': return (
                <FlatList {...commonProps}
                    data={filteredAnimals} renderItem={renderAnimal} keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={lAni} onRefresh={refreshAnimals} colors={[Colors.primary]} />}
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
                    ListEmptyComponent={!lAni ? <Empty icon="clipboard-outline" text="No hay animales registrados" /> : null}
                />
            );
            case 'servicios': return (
                <FlatList {...commonProps} data={services} renderItem={renderService} keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={lSvc} onRefresh={() => fetchSvc()} colors={[Colors.primary]} />}
                    ListEmptyComponent={!lSvc ? <Empty icon="heart-outline" text="No hay servicios registrados" /> : null}
                />
            );
            case 'gestaciones': return (
                <FlatList {...commonProps} data={diagnoses} renderItem={renderDiagnosis} keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={lDiag} onRefresh={() => fetchDiag()} colors={[Colors.primary]} />}
                    ListEmptyComponent={!lDiag ? <Empty icon="analytics-outline" text="No hay diagnósticos registrados" /> : null}
                />
            );
            case 'partos': return (
                <FlatList {...commonProps} data={parturitions} renderItem={renderParturition} keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={lPart} onRefresh={() => fetchPart()} colors={[Colors.primary]} />}
                    ListEmptyComponent={!lPart ? <Empty icon="fitness-outline" text="No hay partos registrados" /> : null}
                />
            );
            case 'destetes': return (
                <FlatList {...commonProps} data={weanings} renderItem={renderWeaning} keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={lWean} onRefresh={() => fetchWean()} colors={[Colors.primary]} />}
                    ListEmptyComponent={!lWean ? <Empty icon="git-branch-outline" text="No hay destetes registrados" /> : null}
                />
            );
        }
    };

    // ── JSX ──────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Corral Virtual</Text>
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                            <TouchableOpacity
                                onPress={() => router.push('/views/(tabs)/admin/bulkImport/bulkImport' as any)}
                                style={styles.reloadBtn}
                            >
                                <Ionicons name="cloud-upload-outline" size={26} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={refreshAnimals} style={styles.reloadBtn}>
                                <Ionicons name="refresh" size={26} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {activeTab === 'todos' && (
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
                )}

                <FlatList
                    horizontal data={TABS} keyExtractor={t => t.key}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsRow}
                    renderItem={({ item: tab }) => {
                        const on = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                style={[styles.tab, on && styles.tabOn]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Ionicons name={tab.icon} size={13} color={on ? Colors.white : Colors.textSecondary} />
                                <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Contenido */}
            <ScreenContainer scrollable={false} style={styles.body}>
                {tabContent()}
                {activeTab === 'todos' && (
                    <TouchableOpacity style={styles.fab}
                        onPress={() => router.push('/views/(tabs)/admin/Ranch/Animals/AddAnimal')}
                    >
                        <Ionicons name="add" size={32} color={Colors.white} />
                        <Text style={styles.fabTxt}>NUEVO REGISTRO</Text>
                    </TouchableOpacity>
                )}
            </ScreenContainer>

            {/* Menú contextual */}
            <Modal visible={menuVisible} transparent animationType="none">
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <Animated.View style={[
                                styles.menu,
                                {
                                    opacity: menuAnim,
                                    transform: [{ scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                                },
                            ]}>
                                <View style={styles.menuHead}>
                                    <View style={styles.menuIcon}>
                                        <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.menuCode}>{menuAnimal?.code}</Text>
                                    <TouchableOpacity onPress={closeMenu}>
                                        <Ionicons name="close" size={22} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.menuSection}>REGISTRAR EVENTO</Text>

                                {ANIMAL_ACTIONS.map((a, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.menuItem, i < ANIMAL_ACTIONS.length - 1 && styles.menuBorder]}
                                        onPress={() => handleAction(a.route, a.paramKey)}
                                    >
                                        <View style={styles.menuItemIcon}>
                                            <Ionicons name={a.icon} size={18} color={Colors.primary} />
                                        </View>
                                        <Text style={styles.menuItemTxt}>{a.label}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    body: { flex: 1, paddingHorizontal: Spacing.lg },
    header: { backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 8, paddingHorizontal: Spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    backBtn: { marginRight: Spacing.md },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 24 },
    reloadBtn: { padding: 4 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, height: 48, ...Shadows.card, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
    searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },
    tabsRow: { paddingVertical: Spacing.xs, gap: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.xl, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
    tabOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabTxt: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
    tabTxtOn: { color: Colors.white },

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
    dotsBtn: { padding: 4 },

    histCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.card, overflow: 'hidden' },
    histAccent: { width: 5 },
    histBody: { flex: 1, padding: Spacing.md },
    histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    histAnimal: { fontSize: 16, fontWeight: '800', color: Colors.primary },
    histDate: { fontSize: 11, color: Colors.textSecondary },
    histType: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
    histDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
    chipText: { fontSize: 11, fontWeight: '800' },
    pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', position: 'absolute', top: 8, right: 8 },

    fab: { position: 'absolute', bottom: 30, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.primary, height: 60, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...Shadows.floatingButton, zIndex: 20 },
    fabTxt: { color: Colors.white, fontSize: 18, fontWeight: '800', marginLeft: 10 },

    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.md },
    emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    menu: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, paddingBottom: Platform.OS === 'ios' ? 34 : 20, ...Shadows.card },
    menuHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    menuIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    menuCode: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.primary },
    menuSection: { ...Typography.overline, color: Colors.textDisabled, fontWeight: '700', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
    menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    menuItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
    menuItemTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
});