import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { AnimatedLogo } from '../../../components/common/AnimatedLogo';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { Link } from 'expo-router';
import { useLoginLogic } from '../../../hooks/useLoginLogic';

export default function LoginScreen() {
  const {
    formData,
    touched,
    errors,
    loading,
    animations,
    handleInputChange,
    handleBlur,
    handleLogin,
    isFormValid,
  } = useLoginLogic();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header con animación */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: animations.fadeAnim,
              transform: [{ translateY: animations.headerSlideUp }]
            }
          ]}
        >
          <HeaderText variant="h1">Bienvenido</HeaderText>
          {/* Logo Animado */}
          <View style={styles.logoContainer}>
            <AnimatedLogo size={220} />
          </View>
          <Text style={styles.subtitle}>
            Inicia sesión en tu cuenta de Estancia 360
          </Text>
        </Animated.View>

        {/* Formulario con animación */}
        <Animated.View 
          style={[
            styles.form,
            {
              opacity: animations.fadeAnim,
              transform: [{ translateY: animations.formSlideUp }]
            }
          ]}
        >
          <InputField
            label="Email"
            placeholder="tu.email@ejemplo.com"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            touched={touched.email}
          />

          <InputField
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            onBlur={() => handleBlur('password')}
            secureTextEntry
            error={errors.password}
            touched={touched.password}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Botones con animación */}
        <Animated.View 
          style={[
            styles.actions,
            {
              opacity: animations.fadeAnim,
              transform: [{ translateY: animations.buttonSlideUp }]
            }
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
            <Text style={styles.registerText}>
              ¿No tienes una cuenta?{' '}
            </Text>
            <Link href="/views/auth/Register" asChild>
              <TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
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
  form: {
    flex: 1,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
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