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
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { Animal, useGetListAnimals } from '../../hooks/Animals/offline/use-GetListAnimals';

interface AnimalPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (animalCode: string) => void;
}

export function AnimalPickerModal({ visible, onClose, onSelect }: AnimalPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { animals, loading, refreshAnimals } = useGetListAnimals(false);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        if (visible) {
            refreshAnimals();
            setSearchQuery('');
        }
    }, [visible, refreshAnimals]);

    const filteredAnimals = useMemo(() => {
        if (!searchQuery) return animals;
        const q = searchQuery.toLowerCase();
        return animals.filter(a =>
            a.code.toLowerCase().includes(q)
        );
    }, [animals, searchQuery]);

    const renderItem = ({ item }: { item: Animal }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => {
                onSelect(item.code);
                onClose();
            }}
        >
            <Ionicons name="paw-outline" size={20} color={Colors.primary} />
            <Text style={styles.itemText}>{item.code}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Seleccionar Animal</Text>
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
                            autoFocus
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
                                <Text style={styles.emptyText}>
                                    {loading ? 'Cargando animales...' : 'No se encontraron animales'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        height: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        ...Typography.h3,
        color: Colors.textPrimary,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        margin: Spacing.lg,
        paddingHorizontal: Spacing.md,
        height: 48,
        borderRadius: BorderRadius.lg,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        ...Typography.body,
        color: Colors.textPrimary,
    },
    list: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemText: {
        ...Typography.body,
        marginLeft: Spacing.md,
        color: Colors.textPrimary,
        fontWeight: 'bold',
    },
    empty: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
});
