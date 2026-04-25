import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';

interface DateSelectorProps {
    label?: string;
    value: string; // Format: YYYY-MM-DD
    onChange: (date: string) => void;
    error?: string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
    label,
    value,
    onChange,
    error
}) => {
    const [show, setShow] = useState(false);

    // Parse the string value to a Date object
    const dateValue = value ? new Date(value + 'T12:00:00') : new Date();

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShow(false);
        }

        if (selectedDate) {
            // Format to YYYY-MM-DD
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            onChange(formattedDate);
        }
    };

    const togglePicker = () => {
        setShow(!show);
    };

    const renderPicker = () => (
        <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            style={styles.picker}
            textColor={Colors.textPrimary}
        />
    );

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <TouchableOpacity
                style={[styles.selector, error ? styles.selectorError : null]}
                onPress={togglePicker}
            >
                <Text style={styles.valueText}>{value || 'Seleccionar fecha'}</Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.textDisabled} />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {Platform.OS === 'ios' ? (
                <Modal
                    visible={show}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShow(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShow(false)}>
                                    <Text style={styles.doneText}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            {renderPicker()}
                        </View>
                    </View>
                </Modal>
            ) : (
                show && renderPicker()
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.sm,
    },
    label: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '700',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        letterSpacing: 1,
    },
    selector: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectorError: {
        borderColor: Colors.secondary,
    },
    valueText: {
        fontSize: 16,
        color: Colors.textPrimary,
    },
    errorText: {
        ...Typography.bodySmall,
        color: Colors.secondary,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        paddingBottom: 20,
        ...Shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    doneText: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    picker: {
        height: 200,
    },
});
