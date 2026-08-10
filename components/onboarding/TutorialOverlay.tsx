import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import type { TutorialStep, TutorialTargetLayout } from '../../hooks/onboarding/use-Tutorial';

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const TOOLTIP_MIN_SPACE = 200;
const POSITION_ANIM_DURATION = 340;
const FADE_OUT_DURATION = 140;
const FADE_IN_DURATION = 260;
const MOVE_EASING = Easing.out(Easing.cubic);

interface Props {
    visible: boolean;
    step: TutorialStep | null;
    stepIndex: number;
    totalSteps: number;
    targetLayout: TutorialTargetLayout | null;
    onNext: () => void;
    onSkip: () => void;
}

export const TutorialOverlay: React.FC<Props> = ({
    visible,
    step,
    stepIndex,
    totalSteps,
    targetLayout,
    onNext,
    onSkip,
}) => {
    const screen = Dimensions.get('window');

    const animTop = useRef(new Animated.Value(0)).current;
    const animLeft = useRef(new Animated.Value(0)).current;
    const animWidth = useRef(new Animated.Value(0)).current;
    const animHeight = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const [hasPositioned, setHasPositioned] = useState(false);
    const [displayedStep, setDisplayedStep] = useState(step);
    const [displayedIndex, setDisplayedIndex] = useState(stepIndex);

    useEffect(() => {
        if (!visible) setHasPositioned(false);
    }, [visible]);

    // Al cambiar de paso (con el tour ya posicionado), atenuamos el tooltip actual antes de
    // que llegue la nueva medición — evita el salto brusco de texto viejo + caja nueva.
    useEffect(() => {
        if (!hasPositioned) return;
        Animated.timing(contentOpacity, {
            toValue: 0,
            duration: FADE_OUT_DURATION,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex]);

    useEffect(() => {
        if (!targetLayout) return;
        const { x, y, width, height } = targetLayout;
        setDisplayedStep(step);
        setDisplayedIndex(stepIndex);
        if (!hasPositioned) {
            animTop.setValue(y);
            animLeft.setValue(x);
            animWidth.setValue(width);
            animHeight.setValue(height);
            setHasPositioned(true);
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: FADE_IN_DURATION,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
            return;
        }
        Animated.parallel([
            Animated.timing(animTop, { toValue: y, duration: POSITION_ANIM_DURATION, easing: MOVE_EASING, useNativeDriver: false }),
            Animated.timing(animLeft, { toValue: x, duration: POSITION_ANIM_DURATION, easing: MOVE_EASING, useNativeDriver: false }),
            Animated.timing(animWidth, { toValue: width, duration: POSITION_ANIM_DURATION, easing: MOVE_EASING, useNativeDriver: false }),
            Animated.timing(animHeight, { toValue: height, duration: POSITION_ANIM_DURATION, easing: MOVE_EASING, useNativeDriver: false }),
            Animated.timing(contentOpacity, { toValue: 1, duration: FADE_IN_DURATION, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetLayout]);

    if (!visible || !step || !displayedStep) return null;

    const paddedTop = Animated.subtract(animTop, SPOTLIGHT_PADDING);
    const paddedLeft = Animated.subtract(animLeft, SPOTLIGHT_PADDING);
    const paddedWidth = Animated.add(animWidth, SPOTLIGHT_PADDING * 2);
    const paddedHeight = Animated.add(animHeight, SPOTLIGHT_PADDING * 2);
    const paddedBottom = Animated.add(paddedTop, paddedHeight);
    const paddedRight = Animated.add(paddedLeft, paddedWidth);

    const isLastStep = displayedIndex >= totalSteps - 1;

    // Fallback: si todavía no se pudo medir el tile (o falló), mostramos un tooltip
    // centrado sin recorte en vez de dejar la pantalla bloqueada sin nada visible.
    if (!targetLayout) {
        return (
            <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
                <View style={styles.fullBackdrop}>
                    <View style={[styles.tooltip, styles.tooltipCentered]}>
                        {renderTooltipContent()}
                    </View>
                </View>
            </Modal>
        );
    }

    const targetBottom = targetLayout.y + targetLayout.height;
    const placeBelow = targetBottom + TOOLTIP_MIN_SPACE < screen.height;
    const tooltipPositionStyle = placeBelow
        ? { top: targetBottom + SPOTLIGHT_PADDING + TOOLTIP_GAP }
        : { bottom: screen.height - targetLayout.y + SPOTLIGHT_PADDING + TOOLTIP_GAP };

    function renderTooltipContent() {
        return (
            <>
                <View style={styles.tooltipHeader}>
                    <Text style={styles.stepCounter}>{displayedIndex + 1}/{totalSteps}</Text>
                    <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.tooltipTitle}>{displayedStep!.title}</Text>
                <Text style={styles.tooltipDescription}>{displayedStep!.description}</Text>
                <View style={styles.tooltipActions}>
                    <TouchableOpacity onPress={onSkip} activeOpacity={0.75}>
                        <Text style={styles.skipText}>Saltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.85}>
                        <Text style={styles.nextBtnText}>{isLastStep ? 'Empezar' : 'Siguiente'}</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
            <View style={StyleSheet.absoluteFill}>
                <Animated.View style={[styles.backdropPiece, { top: 0, left: 0, right: 0, height: paddedTop }]} />
                <Animated.View style={[styles.backdropPiece, { top: paddedBottom, left: 0, right: 0, bottom: 0 }]} />
                <Animated.View style={[styles.backdropPiece, { top: paddedTop, left: 0, width: paddedLeft, height: paddedHeight }]} />
                <Animated.View style={[styles.backdropPiece, { top: paddedTop, left: paddedRight, right: 0, height: paddedHeight }]} />
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.spotlightBorder,
                        { top: paddedTop, left: paddedLeft, width: paddedWidth, height: paddedHeight },
                    ]}
                />

                <Animated.View
                    style={[styles.tooltip, tooltipPositionStyle, { opacity: contentOpacity }]}
                >
                    {renderTooltipContent()}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    backdropPiece: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    spotlightBorder: {
        position: 'absolute',
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    tooltip: {
        position: 'absolute',
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    tooltipCentered: {
        position: 'relative',
        left: undefined,
        right: undefined,
        width: '100%',
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepCounter: {
        fontFamily: Typography.fontSecondary,
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    tooltipTitle: {
        fontFamily: Typography.fontPrimary,
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    tooltipDescription: {
        fontFamily: Typography.fontSecondary,
        fontSize: 13,
        lineHeight: 19,
        color: Colors.textSecondary,
    },
    tooltipActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    skipText: {
        fontFamily: Typography.fontSecondary,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    nextBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.xxl,
        backgroundColor: Colors.primaryButton,
    },
    nextBtnText: {
        fontFamily: Typography.fontPrimary,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.white,
    },
});
