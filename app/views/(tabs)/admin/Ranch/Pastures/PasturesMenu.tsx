// views/Ranch/Pastures/PasturesScreen.tsx
// Lista de potreros con sus lotes y opción de crear/editar

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert, FlatList,
    KeyboardAvoidingView,
    Modal, Platform, RefreshControl,
    ScrollView, StatusBar, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';
import {
    LOT_TYPE_COLORS, LOT_TYPE_LABELS, useLots, usePastures,
    type CreateLotInput, type CreatePastureInput, type LotType, type Pasture,
} from '../../../../../../hooks/Ranch/use-Pastures';

// ─── Modal crear/editar potrero ───────────────────────────────────────────────

function PastureFormModal({
    visible, onClose, onSave, initial,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: CreatePastureInput) => Promise<boolean>;
    initial?: Partial<CreatePastureInput>;
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [area, setArea] = useState(initial?.area_hectares?.toString() ?? '');
    const [desc, setDesc] = useState(initial?.description ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (visible) {
            setName(initial?.name ?? '');
            setArea(initial?.area_hectares?.toString() ?? '');
            setDesc(initial?.description ?? '');
            setError(null);
        }
    }, [visible]);

    const handleSave = async () => {
        if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
        const areaNum = parseFloat(area.replace(',', '.'));
        if (isNaN(areaNum) || areaNum <= 0) { setError('Ingresá un área válida (número mayor a 0).'); return; }
        setLoading(true);
        const ok = await onSave({ name: name.trim(), area_hectares: areaNum, description: desc.trim() });
        setLoading(false);
        if (ok) onClose();
        else setError('No se pudo guardar. Intentá de nuevo.');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={ms.overlay}>
                    <View style={ms.sheet}>
                        <View style={ms.header}>
                            <Text style={ms.title}>{initial?.name ? 'Editar Potrero' : 'Nuevo Potrero'}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={26} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {error && (
                            <View style={ms.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                                <Text style={ms.errorTxt}>{error}</Text>
                            </View>
                        )}

                        <Text style={ms.label}>NOMBRE DEL POTRERO *</Text>
                        <TextInput style={ms.input} value={name} onChangeText={setName}
                            placeholder="Ej: Potrero Norte" placeholderTextColor={Colors.textDisabled} />

                        <Text style={ms.label}>ÁREA (HECTÁREAS) *</Text>
                        <TextInput style={ms.input} value={area} onChangeText={setArea}
                            placeholder="Ej: 25.5" keyboardType="numeric"
                            placeholderTextColor={Colors.textDisabled} />

                        <Text style={ms.label}>DESCRIPCIÓN</Text>
                        <TextInput style={[ms.input, ms.textarea]} value={desc} onChangeText={setDesc}
                            placeholder="Campo natural, alambrado, aguada..." multiline numberOfLines={3}
                            placeholderTextColor={Colors.textDisabled} />

                        <TouchableOpacity
                            style={[ms.saveBtn, loading && ms.saveBtnDisabled]}
                            onPress={handleSave} disabled={loading}
                        >
                            <Text style={ms.saveBtnTxt}>{loading ? 'Guardando...' : 'GUARDAR POTRERO'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Modal crear lote ─────────────────────────────────────────────────────────

const LOT_TYPES: LotType[] = ['cria', 'recria', 'engorde', 'reproductiva', 'general'];

function LotFormModal({
    visible, onClose, onSave, id_ranch_pasture, pastureName,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: CreateLotInput) => Promise<boolean>;
    id_ranch_pasture: string; pastureName: string;
}) {
    const [name, setName] = useState('');
    const [type, setType] = useState<LotType>('general');
    const [cap, setCap] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (visible) { setName(''); setType('general'); setCap(''); setError(null); }
    }, [visible]);

    const handleSave = async () => {
        if (!name.trim()) { setError('El nombre del lote es obligatorio.'); return; }
        const capacity = cap ? parseInt(cap) : undefined;
        setLoading(true);
        const ok = await onSave({ id_ranch_pasture, name: name.trim(), lot_type: type, capacity });
        setLoading(false);
        if (ok) onClose();
        else setError('No se pudo guardar el lote.');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={ms.overlay}>
                    <View style={ms.sheet}>
                        <View style={ms.header}>
                            <View>
                                <Text style={ms.title}>Nuevo Lote</Text>
                                <Text style={ms.subHeader}>en {pastureName}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={26} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {error && (
                            <View style={ms.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                                <Text style={ms.errorTxt}>{error}</Text>
                            </View>
                        )}

                        <Text style={ms.label}>NOMBRE DEL LOTE *</Text>
                        <TextInput style={ms.input} value={name} onChangeText={setName}
                            placeholder="Ej: Lote A, L1, Recría Norte"
                            placeholderTextColor={Colors.textDisabled} />

                        <Text style={ms.label}>TIPO DE LOTE *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {LOT_TYPES.map(t => {
                                    const on = type === t;
                                    const c = LOT_TYPE_COLORS[t];
                                    return (
                                        <TouchableOpacity key={t}
                                            style={[ms.typeChip, on && { backgroundColor: c, borderColor: c }]}
                                            onPress={() => setType(t)}
                                        >
                                            <Text style={[ms.typeChipTxt, on && { color: Colors.white }]}>
                                                {LOT_TYPE_LABELS[t]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <Text style={ms.label}>CAPACIDAD (ANIMALES) — OPCIONAL</Text>
                        <TextInput style={ms.input} value={cap} onChangeText={setCap}
                            placeholder="Ej: 50" keyboardType="numeric"
                            placeholderTextColor={Colors.textDisabled} />

                        <TouchableOpacity
                            style={[ms.saveBtn, loading && ms.saveBtnDisabled, { backgroundColor: LOT_TYPE_COLORS[type] }]}
                            onPress={handleSave} disabled={loading}
                        >
                            <Text style={ms.saveBtnTxt}>{loading ? 'Guardando...' : 'CREAR LOTE'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Tarjeta de potrero ───────────────────────────────────────────────────────

function PastureCard({
    pasture, onAddLot, onEdit, onDeactivate,
}: {
    pasture: Pasture;
    onAddLot: () => void;
    onEdit: () => void;
    onDeactivate: () => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const { lots, loading: lLots, fetchLots } = useLots(pasture.id);

    useFocusEffect(useCallback(() => { fetchLots(pasture.id); }, [pasture.id]));

    return (
        <View style={ps.card}>
            {/* Cabecera del potrero */}
            <TouchableOpacity style={ps.cardHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
                <View style={ps.pastureIconWrap}>
                    <Ionicons name="leaf" size={22} color={Colors.primary} />
                </View>
                <View style={ps.pastureInfo}>
                    <Text style={ps.pastureName}>{pasture.name}</Text>
                    <Text style={ps.pastureMeta}>
                        {pasture.area_hectares} ha · {pasture.lots_count} lote{pasture.lots_count !== 1 ? 's' : ''} · {pasture.animals_count} animales
                    </Text>
                </View>
                <View style={ps.pastureActions}>
                    <TouchableOpacity style={ps.actionBtn} onPress={onEdit}>
                        <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={ps.actionBtn} onPress={() => Alert.alert(
                        'Desactivar potrero',
                        '¿Seguro que querés desactivar este potrero? No podrá recibir nuevos animales.',
                        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Desactivar', style: 'destructive', onPress: onDeactivate }]
                    )}>
                        <Ionicons name="power-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
                </View>
            </TouchableOpacity>

            {/* Lotes */}
            {expanded && (
                <View style={ps.lotsContainer}>
                    {lots.map(lot => {
                        const c = LOT_TYPE_COLORS[lot.lot_type];
                        return (
                            <View key={lot.id} style={[ps.lotRow, { borderLeftColor: c }]}>
                                <View style={[ps.lotTypeBadge, { backgroundColor: c + '20' }]}>
                                    <Text style={[ps.lotTypeTxt, { color: c }]}>
                                        {LOT_TYPE_LABELS[lot.lot_type]}
                                    </Text>
                                </View>
                                <View style={ps.lotInfo}>
                                    <Text style={ps.lotName}>{lot.name}</Text>
                                    <Text style={ps.lotMeta}>
                                        {lot.animals_count} animal{lot.animals_count !== 1 ? 'es' : ''}
                                        {lot.capacity ? ` / cap. ${lot.capacity}` : ''}
                                    </Text>
                                </View>
                                {lot.capacity && lot.animals_count >= lot.capacity && (
                                    <View style={ps.fullBadge}>
                                        <Text style={ps.fullBadgeTxt}>LLENO</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    {lots.length === 0 && !lLots && (
                        <Text style={ps.noLots}>Sin lotes. Creá el primero.</Text>
                    )}

                    <TouchableOpacity style={ps.addLotBtn} onPress={onAddLot}>
                        <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                        <Text style={ps.addLotTxt}>Agregar lote</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function PasturesScreen() {
    const router = useRouter();
    const { pastures, loading, error, fetchPastures, createPasture, updatePasture, deactivatePasture } = usePastures();
    const { createLot } = useLots();

    const [showPastureModal, setShowPastureModal] = useState(false);
    const [editingPasture, setEditingPasture] = useState<Pasture | null>(null);
    const [showLotModal, setShowLotModal] = useState(false);
    const [activePastureForLot, setActivePastureForLot] = useState<Pasture | null>(null);

    useFocusEffect(useCallback(() => { fetchPastures(); }, []));

    const openAddLot = (pasture: Pasture) => {
        setActivePastureForLot(pasture);
        setShowLotModal(true);
    };

    const openEditPasture = (pasture: Pasture) => {
        setEditingPasture(pasture);
        setShowPastureModal(true);
    };

    const handleDeactivate = async (id: string) => {
        const ok = await deactivatePasture(id);
        if (!ok) Alert.alert('No se pudo desactivar', error ?? 'El potrero tiene animales activos.');
    };

    return (
        <View style={ps.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <View style={ps.header}>
                <TouchableOpacity onPress={() => router.replace('/views/(tabs)/admin/management/Management' as any)} style={ps.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <View style={ps.titleWrap}>
                    <Text style={ps.title}>Potreros</Text>
                    <Text style={ps.subtitle}>Potreros y lotes de la estancia</Text>
                </View>
                <TouchableOpacity
                    style={ps.addBtn}
                    onPress={() => { setEditingPasture(null); setShowPastureModal(true); }}
                >
                    <Ionicons name="add" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            {/* Resumen */}
            <View style={ps.summaryRow}>
                <View style={ps.summaryChip}>
                    <Text style={ps.sumNum}>{pastures.length}</Text>
                    <Text style={ps.sumLbl}>Potreros</Text>
                </View>
                <View style={ps.summaryChip}>
                    <Text style={ps.sumNum}>{pastures.reduce((a, p) => a + p.lots_count, 0)}</Text>
                    <Text style={ps.sumLbl}>Lotes</Text>
                </View>
                <View style={ps.summaryChip}>
                    <Text style={ps.sumNum}>{pastures.reduce((a, p) => a + p.animals_count, 0)}</Text>
                    <Text style={ps.sumLbl}>Animales</Text>
                </View>
                <View style={ps.summaryChip}>
                    <Text style={ps.sumNum}>{pastures.reduce((a, p) => a + p.area_hectares, 0).toFixed(0)}</Text>
                    <Text style={ps.sumLbl}>Hectáreas</Text>
                </View>
            </View>

            <FlatList
                data={pastures}
                keyExtractor={p => p.id}
                renderItem={({ item }) => (
                    <PastureCard
                        pasture={item}
                        onAddLot={() => openAddLot(item)}
                        onEdit={() => openEditPasture(item)}
                        onDeactivate={() => handleDeactivate(item.id)}
                    />
                )}
                contentContainerStyle={ps.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPastures} colors={[Colors.primary]} />}
                ListEmptyComponent={!loading ? (
                    <View style={ps.empty}>
                        <Ionicons name="leaf-outline" size={52} color={Colors.textDisabled} />
                        <Text style={ps.emptyTitle}>Sin potreros</Text>
                        <Text style={ps.emptySub}>Tocá el + para crear el primer potrero.</Text>
                    </View>
                ) : null}
                ListFooterComponent={<View style={{ height: 80 }} />}
            />

            {/* Modal potrero */}
            <PastureFormModal
                visible={showPastureModal}
                onClose={() => { setShowPastureModal(false); setEditingPasture(null); }}
                initial={editingPasture ?? undefined}
                onSave={async (data) => {
                    if (editingPasture) return updatePasture(editingPasture.id, data);
                    return createPasture(data);
                }}
            />

            {/* Modal lote */}
            {activePastureForLot && (
                <LotFormModal
                    visible={showLotModal}
                    onClose={() => { setShowLotModal(false); setActivePastureForLot(null); fetchPastures(); }}
                    id_ranch_pasture={activePastureForLot.id}
                    pastureName={activePastureForLot.name}
                    onSave={createLot}
                />
            )}
        </View>
    );
}

// ─── Estilos modal ────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    subHeader: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
    textarea: { height: 80, textAlignVertical: 'top' },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '15', borderRadius: BorderRadius.sm, padding: 10, marginBottom: Spacing.md },
    errorTxt: { fontSize: 13, color: Colors.error, flex: 1 },
    saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 4, ...Shadows.floatingButton },
    saveBtnDisabled: { backgroundColor: Colors.textDisabled },
    saveBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
    typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.xl, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
    typeChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
});

// ─── Estilos pantalla ─────────────────────────────────────────────────────────

const ps = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.background, gap: Spacing.md },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1 },
    title: { ...Typography.h2, color: Colors.primary, fontWeight: '800', fontSize: 22 },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.card },

    summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
    summaryChip: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', ...Shadows.card },
    sumNum: { fontSize: 20, fontWeight: '900', color: Colors.primary },
    sumLbl: { fontSize: 9, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },

    list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.card, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
    pastureIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
    pastureInfo: { flex: 1 },
    pastureName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
    pastureMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    pastureActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtn: { padding: 6 },

    lotsContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
    lotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderLeftWidth: 3, paddingLeft: 10, marginTop: 8, gap: 8, backgroundColor: Colors.background, borderRadius: BorderRadius.sm },
    lotTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    lotTypeTxt: { fontSize: 10, fontWeight: '800' },
    lotInfo: { flex: 1 },
    lotName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
    lotMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
    fullBadge: { backgroundColor: Colors.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    fullBadgeTxt: { fontSize: 9, fontWeight: '800', color: Colors.error },
    noLots: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
    addLotBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10, marginTop: 4, borderWidth: 1.5, borderColor: Colors.primary + '40', borderRadius: BorderRadius.md, borderStyle: 'dashed' },
    addLotTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },

    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textSecondary },
    emptySub: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center' },
});