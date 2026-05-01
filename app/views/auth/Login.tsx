import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimatedLogo } from '../../../components/common/AnimatedLogo';
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { useUserLoginLogic } from '../../../hooks/auth/use-UserLoginLogic';

export default function LoginScreen() {
  const router = useRouter();

  // Estado para ver/ocultar contraseña
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    formData,
    touched,
    errors,
    loading,
    apiError,
    successMessage,
    animations,
    handleInputChange,
    handleBlur,
    handleLogin,
    isFormValid,
  } = useUserLoginLogic(); // Se eliminó 'resetForm' que no se usaba

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/views/auth/Inicio' as any)}
      >
        <Ionicons name="arrow-back" size={34} color={Colors.primary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.headerSlideUp }] }
          ]}
        >
          <HeaderText variant="h1">Bienvenido</HeaderText>
          <View style={styles.logoContainer}>
            <AnimatedLogo size={220} />
          </View>
          <Text style={styles.subtitle}>Inicia sesión en tu cuenta de Estancia 360</Text>
        </Animated.View>

        {/* Mensajes de Estado */}
        <Animated.View
          style={{
            transform: [{ translateX: animations.shakeAnimation }],
            opacity: apiError || successMessage ? 1 : 0,
          }}
        >
          {apiError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
        </Animated.View>

        {/* Formulario */}
        <Animated.View
          style={[
            styles.form,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.formSlideUp }] }
          ]}
        >
          <InputField
            label="Email"
            placeholder="tu.email@ejemplo.com"
            value={formData.email}
            onChangeText={(val) => handleInputChange('email', val)}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            touched={touched.email}
            editable={!loading}
            autoComplete="email"
          />

          {/* Contenedor relativo para posicionar el ojo */}
          <View style={styles.passwordContainer}>
            <InputField
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              value={formData.password}
              onChangeText={(val) => handleInputChange('password', val)}
              onBlur={() => handleBlur('password')}
              secureTextEntry={!isPasswordVisible} // Controlado por el estado
              error={errors.password}
              touched={touched.password}
              editable={!loading}
              autoComplete="password"
            />

            {/* Botón de Ojo */}
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              disabled={loading}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={24}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('views/auth/VerificationCodeEmail' as any)}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Botones */}
        <Animated.View
          style={[
            styles.actions,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.buttonSlideUp }] }
          ]}
        >
          <ButtonPrimary
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loading}
            disabled={!isFormValid || loading}
            style={styles.loginButton}
          />

          <View style={styles.registerSection}>
            <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
            <Link href="/views/auth/Register" asChild>
              <TouchableOpacity disabled={loading}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.xl + 10,
    left: Spacing.lg,
    zIndex: 10,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + 60,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successText: {
    ...Typography.bodySmall,
    color: Colors.success,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  form: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  // Nuevos estilos para el input de password
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 40, // Ajusta este valor dependiendo de la altura de tu label + padding del InputField
    zIndex: 1,
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
  loginButton: {
    marginBottom: Spacing.md,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  registerLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});