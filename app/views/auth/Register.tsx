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
import { useRegisterLogic } from '../../../hooks/useRegisterLogic';

export default function RegisterScreen() {
  const {
    formData,
    touched,
    errors,
    loading,
    animations,
    handleInputChange,
    handleBlur,
    handlePhoneChange,
    handleRegister,
    isFormValid,
  } = useRegisterLogic();

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
          <HeaderText variant="h1">Crear Cuenta</HeaderText>
          {/* Logo Animado */}
          <View style={styles.logoContainer}>
            <AnimatedLogo size={220} />
          </View>
          <Text style={styles.subtitle}>
            Únete a Estancia 360 y comienza tu experiencia
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
          <View style={styles.nameRow}>
            <View style={styles.nameInput}>
              <InputField
                label="Nombre y apellido"
                placeholder="Tu nombre y apellidos"
                value={formData.nombre}
                onChangeText={(value) => handleInputChange('nombre', value)}
                onBlur={() => handleBlur('nombre')}
                autoCapitalize="words"
              />
            </View>
          </View>

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
            placeholder="Mínimo 6 caracteres"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            onBlur={() => handleBlur('password')}
            secureTextEntry
            error={errors.password}
            touched={touched.password}
          />

          <InputField
            label="Confirmar Contraseña"
            placeholder="Repite tu contraseña"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            onBlur={() => handleBlur('confirmPassword')}
            secureTextEntry
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
          />

          <InputField
            label="Teléfono"
            placeholder="Tu número de teléfono"
            value={formData.telefono}
            onChangeText={handlePhoneChange}
            onBlur={() => handleBlur('telefono')}
            keyboardType="phone-pad"
            autoCapitalize="none"
            error={errors.telefono}
            touched={touched.telefono}
            maxLength={8}
          />
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
            title="Crear Cuenta"
            onPress={handleRegister}
            loading={loading}
            disabled={!isFormValid || loading}
            style={styles.registerButton}
          />

          <View style={styles.loginSection}>
            <Text style={styles.loginText}>
              ¿Ya tienes una cuenta?{' '}
            </Text>
            <Link href="/views/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Inicia Sesión</Text>
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
    marginBottom: Spacing.xxl,
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
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  nameInput: {
    flex: 1,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
  registerButton: {
    marginBottom: Spacing.lg,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  loginLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});