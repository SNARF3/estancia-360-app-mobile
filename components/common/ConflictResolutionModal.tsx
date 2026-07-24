import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import type { ConflictDecision, ConflictItem } from '../../hooks/db.sqlite/sync';

const TABLE_DISPLAY: Record<string, string> = {
    ranch_animals:           'Animal',
    ranch_pastures:          'Potrero',
    ranch_lots:              'Lote',
    animal_events:           'Evento animal',
    breeding_services:       'Servicio reproductivo',
    gestation_diagnoses:     'Diagnóstico gestación',
    parturitions:            'Parto',
    weanings:                'Destete',
    animal_declared_history: 'Historia declarada',
    weight_records:          'Pesaje',
    rearing_selections:      'Selección recría',
    fattening_entries:       'Ingreso engorde',
    feed_records:            'Alimentación',
};

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso ?? '—'; }
}

function conflictKey(c: ConflictItem): string {
    return `${c.table}:${c.serverId}`;
}

interface Props {
    conflicts: ConflictItem[];
    onResolve: (decisions: ConflictDecision[]) => void;
    onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<Props> = ({ conflicts, onResolve, onCancel }) => {
    const [choices, setChoices] = useState<Record<string, 'local' | 'server'>>({});

    useEffect(() => {
        if (conflicts.length > 0) {
            const initial: Record<string, 'local' | 'server'> = {};
            for (const c of conflicts) initial[conflictKey(c)] = 'server';
            setChoices(initial);
        }
    }, [conflicts]);

    const toggle = (key: string, choice: 'local' | 'server') => {
        setChoices(prev => ({ ...prev, [key]: choice }));
    };

    const handleConfirm = () => {
        const decisions: ConflictDecision[] = conflicts.map(c => ({
            table: c.table,
            serverId: c.serverId,
            choice: choices[conflictKey(c)] ?? 'server',
            serverData: c.serverData,
        }));
        onResolve(decisions);
    };

    const serverCount = Object.values(choices).filter(v => v === 'server').length;
    const localCount = Object.values(choices).filter(v => v === 'local').length;

    return (
        <Modal
            visible={conflicts.length > 0}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="warning-outline" size={20} color={Colors.warning} />
                            <Text style={styles.title}>Conflictos detectados</Text>
                        </View>
                        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        {conflicts.length} registro(s) fueron modificados en este dispositivo y también en el servidor.
                        Elegí cuál versión conservar para cada uno.
                    </Text>

                    {/* Summary chips */}
                    <View style={styles.summaryRow}>
                        <View style={[styles.chip, { backgroundColor: Colors.primary + '18' }]}>
                            <Text style={[styles.chipText, { color: Colors.primary }]}>
                                {serverCount} del servidor
                            </Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: Colors.warning + '18' }]}>
                            <Text style={[styles.chipText, { color: Colors.warning }]}>
                                {localCount} míos
                            </Text>
                        </View>
                    </View>

                    {/* Conflict list */}
                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {conflicts.map((c, i) => {
                            const key = conflictKey(c);
                            const choice = choices[key] ?? 'server';
                            const label = TABLE_DISPLAY[c.table] ?? c.table;
                            return (
                                <View
                                    key={key}
                                    style={[styles.row, i === conflicts.length - 1 && { borderBottomWidth: 0 }]}
                                >
                                    <View style={styles.rowInfo}>
                                        <Text style={styles.rowLabel}>{label} #{String(c.serverId)}</Text>
                                        <Text style={styles.rowDate}>
                                            <Text style={styles.dateTag}>Mío: </Text>
                                            {fmtDate(c.localUpdatedAt)}
                                        </Text>
                                        <Text style={styles.rowDate}>
                                            <Text style={styles.dateTag}>Servidor: </Text>
                                            {fmtDate(c.serverUpdatedAt)}
                                        </Text>
                                    </View>
                                    <View style={styles.toggle}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, choice === 'local' && styles.toggleActive]}
                                            onPress={() => toggle(key, 'local')}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.toggleText, choice === 'local' && styles.toggleTextActive]}>
                                                Mío
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, choice === 'server' && styles.toggleActiveServer]}
                                            onPress={() => toggle(key, 'server')}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.toggleText, choice === 'server' && styles.toggleTextActive]}>
                                                Servidor
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                        <View style={{ height: Spacing.xl }} />
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                            <Text style={styles.confirmBtnText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    title: {
        fontFamily: Typography.fontPrimary,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontFamily: Typography.fontSecondary,
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        lineHeight: 19,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.xxl,
    },
    chipText: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    list: {
        flexGrow: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border ?? '#E5E7EB',
        gap: Spacing.md,
    },
    rowInfo: {
        flex: 1,
    },
    rowLabel: {
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 3,
    },
    rowDate: {
        fontFamily: Typography.fontSecondary,
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    dateTag: {
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    toggle: {
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border ?? '#E5E7EB',
    },
    toggleBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: Colors.white,
    },
    toggleActive: {
        backgroundColor: Colors.warning,
    },
    toggleActiveServer: {
        backgroundColor: Colors.primary,
    },
    toggleText: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    toggleTextActive: {
        color: Colors.white,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingVertical: Spacing.lg,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.border ?? '#E5E7EB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontFamily: Typography.fontSecondary,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primaryButton,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontFamily: Typography.fontPrimary,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
    },
});
