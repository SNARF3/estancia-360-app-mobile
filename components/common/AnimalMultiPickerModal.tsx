import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { CowIcon } from '../icons/AppIcons';
import { Animal, useGetListAnimals } from '../../hooks/Animals/offline/use-GetListAnimals';

interface AnimalMultiPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (animals: { id: string; code: string }[]) => void;
    /** Códigos ya seleccionados al abrir (para reabrir el picker y ajustar selección) */
    initialSelected?: string[];
}

export function AnimalMultiPickerModal({ visible, onClose, onConfirm, initialSelected = [] }: AnimalMultiPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<Map<string, Animal>>(new Map());
    const { animals, loading, refreshAnimals } = useGetListAnimals(false);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        if (visible) {
            refreshAnimals();
            setSearchQuery('');
        }
    }, [visible, refreshAnimals]);

    React.useEffect(() => {
        if (visible && animals.length > 0 && initialSelected.length > 0) {
            const map = new Map<string, Animal>();
            for (const a of animals) {
                if (initialSelected.includes(a.code)) map.set(a.id, a);
            }
            setSelected(map);
        }
    }, [visible, animals]);

    const filteredAnimals = useMemo(() => {
        if (!searchQuery) return animals;
        const q = searchQuery.toLowerCase();
        return animals.filter((a) => a.code.toLowerCase().includes(q));
    }, [animals, searchQuery]);

    const toggle = (animal: Animal) => {
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(animal.id)) next.delete(animal.id);
            else next.set(animal.id, animal);
            return next;
        });
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selected.values()).map((a) => ({ id: a.id, code: a.code })));
        setSelected(new Map());
        onClose();
    };

    const renderItem = ({ item }: { item: Animal }) => {
        const isSelected = selected.has(item.id);
        return (
            <TouchableOpacity style={styles.item} onPress={() => toggle(item)} activeOpacity={0.7}>
                <CowIcon size={22} color={isSelected ? Colors.primary : Colors.textDisabled} />
                <Text style={styles.itemText}>{item.code}</Text>
                <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? Colors.primary : Colors.textDisabled}
                    style={{ marginLeft: 'auto' }}
                />
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Seleccionar Animales</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color={Colors.textDisabled} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por código..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="characters"
                        />
                    </View>

                    <FlatList
                        data={filteredAnimals}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>{loading ? 'Cargando animales...' : 'No se encontraron animales'}</Text>
                            </View>
                        }
                    />

                    <View style={styles.footer}>
                        <Text style={styles.selectedCount}>{selected.size} animal{selected.size === 1 ? '' : 'es'} seleccionado{selected.size === 1 ? '' : 's'}</Text>
                        <TouchableOpacity
                            style={[styles.confirmButton, selected.size === 0 && styles.confirmButtonDisabled]}
                            onPress={handleConfirm}
                            disabled={selected.size === 0}
                        >
                            <Text style={styles.confirmButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '85%' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    title: { ...Typography.h3, color: Colors.textPrimary },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
        margin: Spacing.lg, paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg,
    },
    searchInput: { flex: 1, marginLeft: Spacing.sm, ...Typography.body, color: Colors.textPrimary },
    list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
    item: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md,
    },
    itemText: { ...Typography.body, color: Colors.textPrimary, fontWeight: 'bold' },
    empty: { padding: Spacing.xl, alignItems: 'center' },
    emptyText: { ...Typography.body, color: Colors.textSecondary },
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    selectedCount: { ...Typography.body, color: Colors.textSecondary },
    confirmButton: { backgroundColor: Colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmButtonText: { ...Typography.body, color: Colors.white, fontWeight: 'bold' },
});
