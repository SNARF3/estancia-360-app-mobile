import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../../constants/theme';

/**
 * Shared styles for all breeding form screens.
 * Ensures visual consistency across the module.
 */
export const breedingFormStyles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        paddingHorizontal: Spacing.lg,
    },
    backButton: {
        padding: 5,
        marginRight: Spacing.sm,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        ...Typography.h2,
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 22,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Typography.fontSecondary,
        marginTop: 2,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
        paddingHorizontal: Spacing.lg,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.overline,
        color: Colors.primary,
        fontWeight: '800',
        marginBottom: Spacing.xs,
        marginLeft: 4,
        letterSpacing: 1.5,
    },
    label: {
        ...Typography.overline,
        color: Colors.textSecondary,
        fontWeight: '700',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    inputWithIcon: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    textArea: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    // Selector de opciones tipo chip/pill
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    optionChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: BorderRadius.xxl,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    optionChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    optionChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        fontFamily: Typography.fontPrimary,
    },
    optionChipTextSelected: {
        color: Colors.white,
    },
    // Botones de opción (tipo toggle para 2-3 opciones)
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    toggleOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleOptionSelected: {
        backgroundColor: Colors.primary,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    toggleTextSelected: {
        color: Colors.white,
    },
    // Error box
    errorBox: {
        flexDirection: 'row',
        backgroundColor: Colors.errorLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        alignItems: 'center',
        gap: 10,
        marginHorizontal: Spacing.lg,
    },
    errorBoxText: {
        ...Typography.bodySmall,
        color: Colors.error,
        flex: 1,
    },
    // Success box
    successBox: {
        flexDirection: 'row',
        backgroundColor: Colors.successLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        alignItems: 'center',
        gap: 10,
        marginHorizontal: Spacing.lg,
    },
    successBoxText: {
        ...Typography.bodySmall,
        color: Colors.success,
        flex: 1,
    },
    // Info box
    infoBox: {
        flexDirection: 'row',
        backgroundColor: Colors.successLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    infoText: {
        ...Typography.bodySmall,
        color: Colors.success,
        marginLeft: Spacing.sm,
        flex: 1,
    },
    // Save button
    saveButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
        ...Shadows.floatingButton,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.textDisabled,
    },
    saveButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Divider
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.md,
    },
    // Badge Indicator
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: Spacing.sm,
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Typography.fontSecondary,
    },
    // Chip row (alias para módulos de Sanidad)
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: BorderRadius.xxl,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        fontFamily: Typography.fontPrimary,
    },
    chipTextSelected: {
        color: Colors.white,
    },
});
