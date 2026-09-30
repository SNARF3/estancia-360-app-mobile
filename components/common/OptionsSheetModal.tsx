import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

// El <Modal> de este componente usa animationType="fade" (ver más abajo) — RN no expone una
// duración configurable para eso, el valor por default de la plataforma ronda los 300ms.
const MODAL_CLOSE_ANIMATION_MS = 350;

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
    // Causa encontrada 2026-09-23 del bug de "pantalla en blanco al elegir una opción de este
    // sheet" (Reproducción, Partos, Sanidad — cualquier menú que use este componente): onClose()
    // y option.onSelect() (que hace router.push) se llamaban sincrónicamente, en el mismo tick.
    // El <Modal> nativo de RN todavía está en medio de su animación/transición de cierre cuando
    // react-native-screens intenta presentar la pantalla nueva — bajo New Architecture esa carrera
    // puede dejar la pantalla nueva sin pintarse (blanco, sin ningún error de JS, confirmado con
    // el error-boundary/error-logger de docs/dev-logging.md: no capturan nada porque no hay
    // ninguna excepción, es un problema de timing nativo).
    //
    // Primer intento (revertido): InteractionManager.runAfterInteractions. React Native lo tiene
    // deprecado ("InteractionManager has been deprecated and will be removed in a future
    // release" — warning real visto en consola) y, confirmado en la práctica, el blanco seguía
    // apareciendo con esto puesto — bajo el runtime Bridgeless de esta SDK no parece estar
    // esperando lo que debería. Se reemplazó por un setTimeout simple, menos elegante pero mucho
    // más predecible: no depende de ninguna API deprecada, solo de que el tiempo de la animación
    // de cierre del modal (animationType="fade" más abajo) ya haya pasado.
    const handleSelect = (option: OptionSheetItem) => {
        onClose();
        setTimeout(() => {
            option.onSelect();
        }, MODAL_CLOSE_ANIMATION_MS);
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
