// components/common/LotSelectorModal.tsx
// Selector visual de potrero → lote para usar en formularios

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    ActivityIndicator, FlatList, Modal,
    Platform,
    StyleSheet,
    Text, TouchableOpacity, View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { LOT_TYPE_COLORS, LOT_TYPE_LABELS, useLotSelector, type Lot, type LotType } from '../../hooks/Ranch/use-Pastures';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (lot: Lot) => void;
    filterType?: LotType;   // si se pasa, solo muestra lotes de ese tipo
    title?: string;
}

export function LotSelectorModal({ visible, onClose, onSelect, filterType, title }: Props) {
    const { data, loading, fetch } = useLotSelector();

    useEffect(() => {
        if (visible) fetch(filterType);
    }, [visible, filterType]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={s.overlay}>
                <View style={s.sheet}>
                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={s.title}>{title ?? 'Seleccionar Lote'}</Text>
                            {filterType && (
                                <View style={[s.filterBadge, { backgroundColor: LOT_TYPE_COLORS[filterType] + '20' }]}>
                                    <Text style={[s.filterBadgeTxt, { color: LOT_TYPE_COLORS[filterType] }]}>
                                        Solo lotes de {LOT_TYPE_LABELS[filterType]}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={26} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ margin: 32 }} />
                    ) : data.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="leaf-outline" size={40} color={Colors.textDisabled} />
                            <Text style={s.emptyTxt}>
                                {filterType
                                    ? `No hay lotes de tipo "${LOT_TYPE_LABELS[filterType]}" disponibles.`
                                    : 'No hay lotes disponibles. Creá un potrero y sus lotes primero.'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={p => p.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: pasture }) => (
                                <View style={s.pastureGroup}>
                                    {/* Nombre del potrero */}
                                    <View style={s.pastureHeader}>
                                        <Ionicons name="leaf" size={14} color={Colors.primary} />
                                        <Text style={s.pastureName}>{pasture.name}</Text>
                                        <Text style={s.pastureArea}>{pasture.area_hectares} ha</Text>
                                    </View>

                                    {/* Lotes del potrero */}
                                    {pasture.lots.map(lot => {
                                        const c = LOT_TYPE_COLORS[lot.lot_type];
                                        const full = lot.capacity ? lot.animals_count >= lot.capacity : false;
                                        return (
                                            <TouchableOpacity
                                                key={lot.id}
                                                style={[s.lotRow, { borderLeftColor: c }, full && s.lotRowFull]}
                                                onPress={() => { onSelect(lot); onClose(); }}
                                                disabled={full}
                                                activeOpacity={0.8}
                                            >
                                                <View style={[s.lotTypeTag, { backgroundColor: c + '20' }]}>
                                                    <Text style={[s.lotTypeTxt, { color: c }]}>
                                                        {LOT_TYPE_LABELS[lot.lot_type]}
                                                    </Text>
                                                </View>
                                                <View style={s.lotInfo}>
                                                    <Text style={[s.lotName, full && s.textMuted]}>{lot.name}</Text>
                                                    <Text style={s.lotMeta}>
                                                        {lot.animals_count} animal{lot.animals_count !== 1 ? 'es' : ''}
                                                        {lot.capacity ? ` / cap. ${lot.capacity}` : ''}
                                                    </Text>
                                                </View>
                                                {full ? (
                                                    <View style={s.fullTag}>
                                                        <Text style={s.fullTagTxt}>LLENO</Text>
                                                    </View>
                                                ) : (
                                                    <Ionicons name="chevron-forward" size={18} color={c} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                            ListFooterComponent={<View style={{ height: 20 }} />}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
    filterBadge: { marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    filterBadgeTxt: { fontSize: 10, fontWeight: '800' },

    pastureGroup: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    pastureHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
    pastureName: { flex: 1, fontSize: 13, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    pastureArea: { fontSize: 11, color: Colors.textDisabled },

    lotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 8, borderLeftWidth: 4, gap: 10, ...Shadows.card },
    lotRowFull: { opacity: 0.5 },
    lotTypeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    lotTypeTxt: { fontSize: 10, fontWeight: '800' },
    lotInfo: { flex: 1 },
    lotName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    lotMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
    textMuted: { color: Colors.textDisabled },
    fullTag: { backgroundColor: Colors.error + '20', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
    fullTagTxt: { fontSize: 9, fontWeight: '800', color: Colors.error },

    empty: { alignItems: 'center', padding: 40, gap: 12 },
    emptyTxt: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});