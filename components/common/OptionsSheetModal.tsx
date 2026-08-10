import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

export interface OptionSheetItem {
    key: string;
    label: string;
    description?: string;
    Icon: React.ComponentType<{ color?: string; size?: number }>;
    onSelect: () => void;
}

interface Props {
    visible: boolean;
    title: string;
    options: OptionSheetItem[];
    onClose: () => void;
}

export const OptionsSheetModal: React.FC<Props> = ({ visible, title, options, onClose }) => {
    const handleSelect = (option: OptionSheetItem) => {
        onClose();
        option.onSelect();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {options.map((option, i) => (
                        <TouchableOpacity
                            key={option.key}
                            style={[styles.row, i < options.length - 1 && styles.rowBorder]}
                            onPress={() => handleSelect(option)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.iconBadge}>
                                <option.Icon size={26} color={Colors.primary} />
                            </View>
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>{option.label}</Text>
                                {option.description && (
                                    <Text style={styles.rowDescription}>{option.description}</Text>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.background,
        borderRadius: 24,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Typography.fontPrimary,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
    },
    rowLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    rowDescription: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
