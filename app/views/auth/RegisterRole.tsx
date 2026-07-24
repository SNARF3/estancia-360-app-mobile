import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import {
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, Typography } from '../../../constants/theme';

export default function RegisterRoleScreen() {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();

    const handleRoleSelect = async (roleId: number) => {
        try {
            await AsyncStorage.setItem('selectedRoleId', roleId.toString());
            router.push('/views/auth/Register' as any);
        } catch (e) {
            console.error('Error guardando el rol:', e);
        }
    };

    const illImgHeight = width * (751 / 601);
    const illTop = height - illImgHeight;

    return (
        <View style={[s.root, { backgroundColor: Colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Ilustración de fondo */}
            <Image
                source={require('../../../assets/estancia360/vacas-vector2.png')}
                style={[s.illBg, {
                    left: 0,
                    top: illTop,
                    marginTop: 150,
                    width: width,
                    height: illImgHeight,
                }]}
                resizeMode="contain"
            />

            {/* Back button */}
            <TouchableOpacity
                style={[s.backBtn, { top: insets.top + 12 }]}
                onPress={() => router.replace('/views/auth/Inicio' as any)}
            >
                <Ionicons name="arrow-back" size={34} color={Colors.primary} />
            </TouchableOpacity>

            {/* Contenido principal */}
            <View style={[s.content, { paddingTop: insets.top + 64 }]}>
                <Text style={s.title}>¿Cómo deseas usar{'\n'}estancia 360?</Text>

                <TouchableOpacity
                    style={s.roleBtn}
                    onPress={() => handleRoleSelect(2)}
                    activeOpacity={0.85}
                >
                    <Text style={s.roleBtnText}>Propietario o administrador</Text>
                </TouchableOpacity>
                <Text style={s.roleDesc}>
                    Gestiona tu estancia, registra datos y accede a reportes.
                </Text>

                <TouchableOpacity
                    style={[s.roleBtn, s.roleBtnSecond]}
                    onPress={() => handleRoleSelect(3)}
                    activeOpacity={0.85}
                >
                    <Text style={s.roleBtnText}>Encargado</Text>
                </TouchableOpacity>
                <Text style={s.roleDesc}>
                    Accede al sistema completo excepto al módulo de movimientos de animales.
                </Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
    },
    illBg: {
        position: 'absolute',
    },
    backBtn: {
        position: 'absolute',
        left: Spacing.lg,
        zIndex: 10,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: Spacing.lg,
        zIndex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        fontFamily: Typography.h1.fontFamily,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 40,
    },
    roleBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 15,
        height: 76,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        ...Shadows.floatingButton,
    },
    roleBtnSecond: {
        marginTop: Spacing.xl,
    },
    roleBtnText: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.white,
        fontFamily: Typography.h1.fontFamily,
        textAlign: 'center',
    },
    roleDesc: {
        fontSize: 13,
        color: 'rgba(0,0,0,0.75)',
        fontFamily: Typography.body.fontFamily,
        textAlign: 'center',
        marginTop: Spacing.sm,
        lineHeight: 20,
    },
});
