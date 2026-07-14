import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../constants/theme';
import { useUserLoginLogic } from '../../../hooks/auth/use-UserLoginLogic';

const FIELD_BG = 'rgba(217,217,217,0.5)';

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Logo: altura = 32% de pantalla, máx 260px — ancho derivado del ratio 1080×1350 (=0.8)
    const logoH = Math.min(height * 0.32, 260);
    const logoW = logoH * (1080 / 1350);

    const {
        formData,
        touched,
        errors,
        loading,
        apiError,
        successMessage,
        handleInputChange,
        handleBlur,
        handleLogin,
        isFormValid,
    } = useUserLoginLogic();

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Back button — se mantiene igual que antes */}
            <TouchableOpacity
                style={[s.backBtn, { top: insets.top + 12 }]}
                onPress={() => router.canGoBack() ? router.back() : router.replace('/views/auth/Inicio' as any)}
            >
                <Ionicons name="arrow-back" size={34} color={Colors.primary} />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={[s.scroll, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Título */}
                <Text style={s.title}>¡Bienvenido de vuelta!</Text>

                {/* Logo */}
                <Image
                    source={require('../../../assets/estancia360/logo-login.png')}
                    style={[s.logo, { width: logoW, height: logoH }]}
                    resizeMode="contain"
                />

                {/* Mensajes de error / éxito */}
                {apiError ? (
                    <View style={s.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color={Colors.error} />
                        <Text style={s.errorBannerText}>{apiError}</Text>
                    </View>
                ) : null}
                {successMessage ? (
                    <View style={s.successBanner}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                        <Text style={s.successBannerText}>{successMessage}</Text>
                    </View>
                ) : null}

                {/* Campo: Correo electrónico */}
                <Text style={s.fieldLabel}>Correo electrónico</Text>
                <TextInput
                    style={[s.fieldInput, touched.email && errors.email ? s.fieldInputError : null]}
                    placeholder="tu.correo@gmail.com"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={formData.email}
                    onChangeText={v => handleInputChange('email', v)}
                    onBlur={() => handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                />
                {touched.email && errors.email ? (
                    <Text style={s.fieldError}>{errors.email}</Text>
                ) : null}

                {/* Campo: Contraseña */}
                <Text style={[s.fieldLabel, { marginTop: Spacing.md }]}>Contraseña</Text>
                <View style={s.pwdWrap}>
                    <TextInput
                        style={[s.fieldInput, s.fieldInputPwd, touched.password && errors.password ? s.fieldInputError : null]}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={formData.password}
                        onChangeText={v => handleInputChange('password', v)}
                        onBlur={() => handleBlur('password')}
                        secureTextEntry={!isPasswordVisible}
                        autoComplete="password"
                        editable={!loading}
                    />
                    <TouchableOpacity
                        style={s.eyeBtn}
                        onPress={() => setIsPasswordVisible(v => !v)}
                        disabled={loading}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off' : 'eye'}
                            size={22}
                            color="rgba(0,0,0,0.45)"
                        />
                    </TouchableOpacity>
                </View>
                {touched.password && errors.password ? (
                    <Text style={s.fieldError}>{errors.password}</Text>
                ) : null}

                {/* ¿Olvidaste tu contraseña? */}
                <TouchableOpacity
                    style={s.forgotRow}
                    onPress={() => router.push('views/auth/VerificationCodeEmail' as any)}
                    disabled={loading}
                >
                    <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Botón Iniciar Sesión */}
                <TouchableOpacity
                    style={[s.btn, (!isFormValid || loading) && s.btnDisabled]}
                    onPress={handleLogin}
                    disabled={!isFormValid || loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#e8e8e8" />
                        : <Text style={s.btnText}>Iniciar Sesión</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
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
    scroll: {
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        fontFamily: Typography.h2.fontFamily,
        marginBottom: Spacing.md,
    },
    logo: {
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },

    // Banners de error/éxito
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.errorLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        color: Colors.error,
        fontFamily: Typography.body.fontFamily,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.successLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.success,
    },
    successBannerText: {
        flex: 1,
        fontSize: 13,
        color: Colors.success,
        fontFamily: Typography.body.fontFamily,
    },

    // Campos
    fieldLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        fontFamily: Typography.body.fontFamily,
        marginBottom: 6,
    },
    fieldInput: {
        height: 48,
        backgroundColor: FIELD_BG,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#000',
        fontFamily: Typography.body.fontFamily,
    },
    fieldInputPwd: {
        paddingRight: 48,
    },
    fieldInputError: {
        borderWidth: 1,
        borderColor: Colors.error,
    },
    fieldError: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
        fontFamily: Typography.body.fontFamily,
    },
    pwdWrap: {
        position: 'relative',
        justifyContent: 'center',
    },
    eyeBtn: {
        position: 'absolute',
        right: 14,
        top: 13,
        padding: 2,
    },
    forgotRow: {
        alignSelf: 'flex-end',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    forgotText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
        fontFamily: Typography.body.fontFamily,
    },

    // Botón
    btn: {
        height: 58,
        backgroundColor: Colors.primary,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
        ...Shadows.floatingButton,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnText: {
        color: '#e8e8e8',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Typography.button.fontFamily,
    },
});
