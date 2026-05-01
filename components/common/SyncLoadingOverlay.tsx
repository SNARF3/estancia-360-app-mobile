import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Typography } from '../../constants/theme';

interface Props {
    visible: boolean;
    phase?: string;
    progress?: number; // 0-100
}

export const SyncLoadingOverlay: React.FC<Props> = ({ visible, phase, progress = 0 }) => {
    const spin = useRef(new Animated.Value(0)).current;
    const barWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.timing(spin, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spin.stopAnimation();
            spin.setValue(0);
            barWidth.setValue(0);
        }
    }, [visible]);

    useEffect(() => {
        Animated.timing(barWidth, {
            toValue: progress,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const widthPct = barWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {}}
        >
            <View style={styles.container}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Ionicons name="sync" size={52} color={Colors.primary} />
                </Animated.View>

                <Text style={styles.title}>Sincronizando</Text>

                {phase ? <Text style={styles.phase}>{phase}</Text> : null}

                {/* Barra de progreso */}
                <View style={styles.barWrap}>
                    <View style={styles.barTrack}>
                        <Animated.View style={[styles.barFill, { width: widthPct }]} />
                    </View>
                    <Text style={styles.pct}>{Math.round(progress)}%</Text>
                </View>

                <Text style={styles.note}>No cierres la aplicación</Text>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary,
        fontFamily: Typography.fontPrimary,
    },
    phase: {
        fontSize: 14,
        color: Colors.primary,
        fontFamily: Typography.fontSecondary,
        textAlign: 'center',
    },
    barWrap: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    barTrack: {
        width: '100%',
        height: 10,
        backgroundColor: Colors.border,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xxl,
    },
    pct: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Typography.fontPrimary,
    },
    note: {
        fontSize: 12,
        color: Colors.textDisabled,
        fontFamily: Typography.fontSecondary,
        marginTop: 4,
    },
});
