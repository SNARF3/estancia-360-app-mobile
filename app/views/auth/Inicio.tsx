import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../constants/theme';

export default function Inicio() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
        ]).start();
    }, []);

    const cowImgHeight = width * (812 / 650);
    const cowTop = insets.top + height * 0.25;

    return (
        <View style={[s.root, { backgroundColor: Colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            <Image
                source={require('../../../assets/estancia360/vacas-sinfondo.png')}
                style={[s.cowsBg, { left: 0, top: cowTop, width, height: cowImgHeight }]}
                resizeMode="contain"
            />

            {/* Sección superior: logo + título */}
            <Animated.View style={[s.top, {
                paddingTop: insets.top + 20,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }]}>
                <Image
                    source={require('../../../assets/estancia360/logo-inicio.png')}
                    style={s.logo}
                    resizeMode="contain"
                />
                <Text style={s.welcomeText}>Bienvenido a</Text>
                <View style={s.titlePill}>
                    <Text style={s.titleText}>Estancia360</Text>
                </View>
            </Animated.View>

            {/* Sección inferior: subtítulo + botones */}
            <Animated.View style={[s.bottom, {
                paddingBottom: insets.bottom + 20,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }]}>
                <Text style={s.subtitle}>
                    Transformando la ganadería boliviana{'\n'}con datos y sostenibilidad
                </Text>

                <TouchableOpacity
                    style={s.btnPrimary}
                    onPress={() => router.push('/views/auth/Login' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={s.btnPrimaryText}>Iniciar Sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.btnSecondary}
                    onPress={() => router.push('/views/auth/RegisterRole' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={s.btnSecondaryText}>Registrarse</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
    },
    cowsBg: {
        position: 'absolute',
    },
    top: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        zIndex: 1,
    },
    logo: {
        width: 168,
        height: 168,
        marginBottom: 12,
        opacity: 0.9,
    },
    welcomeText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#000',
        fontFamily: Typography.h1.fontFamily,
        textAlign: 'center',
        marginBottom: 10,
    },
    titlePill: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: BorderRadius.lg,
        ...Shadows.card,
    },
    titleText: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.white,
        fontFamily: Typography.h1.fontFamily,
    },
    bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        zIndex: 1,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(0,0,0,0.6)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.sm,
        fontFamily: Typography.body.fontFamily,
    },
    btnPrimary: {
        width: '100%',
        height: 58,
        backgroundColor: Colors.primary,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.floatingButton,
    },
    btnPrimaryText: {
        color: '#e8e8e8',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Typography.button.fontFamily,
    },
    btnSecondary: {
        width: '100%',
        height: 58,
        backgroundColor: Colors.white,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.card,
    },
    btnSecondaryText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Typography.button.fontFamily,
    },
});
