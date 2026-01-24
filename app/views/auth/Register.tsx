import React, { useEffect, useState } from 'react';
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
import { Link, router } from 'expo-router';
import { useUserRegisterLogic } from '../../../hooks/auth/use-UserRegisterLogic';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';

export default function RegisterScreen() {
  // Estados para visualizar contraseñas independientemente
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // 1. Cargar el rol guardado
  useEffect(() => {
    const loadSelectedRole = async () => {
      try {
        const roleId = await AsyncStorage.getItem('selectedRoleId');
        if (roleId) setSelectedRole(parseInt(roleId));
        else router.replace('/views/auth/RegisterRole');
      } catch (error) {
        console.error('Error cargando el rol:', error);
        router.replace('/views/auth/RegisterRole');
      } finally {
        setLoadingRole(false);
      }
    };
    loadSelectedRole();
  }, []);

  // 2. Hook de lógica
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
    handlePhoneChange,
    handleCiChange,
    handleRegister,
    isFormValid,
  } = useUserRegisterLogic(selectedRole || 2);

  // 3. Efectos de UI (Mensajes)
  useEffect(() => {
    if (successMessage) {
      showMessage({
        message: '¡Cuenta creada con éxito!',
        description: 'Inicia sesión con tu nueva cuenta.',
        type: 'success',
        duration: 4000,
        floating: true,
      });
      AsyncStorage.removeItem('selectedRoleId');
      setTimeout(() => router.replace('/views/auth/Login'), 2000);
    }
  }, [successMessage]);

  useEffect(() => {
    if (apiError) {
      showMessage({
        message: 'Error en el registro',
        description: apiError,
        type: 'danger',
        duration: 4000,
        floating: true,
      });
    }
  }, [apiError]);

  if (loadingRole) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Ajuste para evitar saltos
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
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
          <HeaderText variant="h1">Crear Cuenta</HeaderText>
          <View style={styles.logoContainer}>
            <AnimatedLogo size={180} />
          </View>
          <Text style={styles.subtitle}>Completa tus datos para continuar</Text>
        </Animated.View>

        {/* Formulario */}
        <Animated.View 
          style={[
            styles.form,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.formSlideUp }] }
          ]}
        >
          {/* Nombre */}
          <InputField
            label="Nombre"
            placeholder="Tu nombre"
            value={formData.nombre}
            onChangeText={(v) => handleInputChange('nombre', v)}
            onBlur={() => handleBlur('nombre')}
            autoCapitalize="words"
            error={errors.nombre}
            touched={touched.nombre}
            editable={!loading}
            autoComplete="name"
          />

          {/* Apellidos */}
          <InputField
            label="Apellido Paterno"
            placeholder="Tu apellido paterno"
            value={formData.apellidoPaterno}
            onChangeText={(v) => handleInputChange('apellidoPaterno', v)}
            onBlur={() => handleBlur('apellidoPaterno')}
            autoCapitalize="words"
            error={errors.apellidoPaterno}
            touched={touched.apellidoPaterno}
            editable={!loading}
            autoComplete="name-family"
          />

          <InputField
            label="Apellido Materno"
            placeholder="Tu apellido materno"
            value={formData.apellidoMaterno}
            onChangeText={(v) => handleInputChange('apellidoMaterno', v)}
            onBlur={() => handleBlur('apellidoMaterno')}
            autoCapitalize="words"
            error={errors.apellidoMaterno}
            touched={touched.apellidoMaterno}
            editable={!loading}
            autoComplete="name-family"
          />

          {/* CI - Numeric */}
          <InputField
            label="Número de Cédula"
            placeholder="Tu número de cédula"
            value={formData.ci}
            onChangeText={handleCiChange}
            onBlur={() => handleBlur('ci')}
            keyboardType="number-pad" // Específico para números
            error={errors.ci}
            touched={touched.ci}
            editable={!loading}
            maxLength={10}
          />

          {/* Email */}
          <InputField
            label="Email"
            placeholder="tu.email@ejemplo.com"
            value={formData.email}
            onChangeText={(v) => handleInputChange('email', v)}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address" // Específico para email
            autoCapitalize="none"
            error={errors.email}
            touched={touched.email}
            editable={!loading}
            autoComplete="email"
          />

          {/* Teléfono - Numeric */}
          <InputField
            label="Teléfono"
            placeholder="Tu número de teléfono"
            value={formData.telefono}
            onChangeText={handlePhoneChange}
            onBlur={() => handleBlur('telefono')}
            keyboardType="phone-pad" // Específico para teléfono
            error={errors.telefono}
            touched={touched.telefono}
            editable={!loading}
            maxLength={8}
          />

          {/* --- Contraseña --- */}
          <View style={styles.passwordContainer}>
            <InputField
              label="Contraseña"
              placeholder="Min. 6 caracteres (Mayus, minus, num)"
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              onBlur={() => handleBlur('password')}
              secureTextEntry={!showPassword}
              error={errors.password}
              touched={touched.password}
              editable={!loading}
              autoComplete="password-new" // Sugerencia de nueva contraseña
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={24} 
                color={Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* --- Confirmar Contraseña --- */}
          <View style={styles.passwordContainer}>
            <InputField
              label="Confirmar Contraseña"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChangeText={(v) => handleInputChange('confirmPassword', v)}
              onBlur={() => handleBlur('confirmPassword')}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              editable={!loading}
              autoComplete="password-new"
            />
             <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={24} 
                color={Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

        </Animated.View>

        {/* Botones */}
        <Animated.View 
          style={[
            styles.actions,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.buttonSlideUp }] }
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: animations.spinInterpolate }] }}>
            <ButtonPrimary
              title="Crear Cuenta"
              onPress={handleRegister}
              loading={loading}
              disabled={!isFormValid || loading || !selectedRole}
              style={styles.registerButton}
            />
          </Animated.View>

          <View style={styles.loginSection}>
            <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
            <Link href="/views/auth/Login" asChild>
              <TouchableOpacity disabled={loading}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
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
    paddingVertical: Spacing.xl,
    paddingTop: Spacing.xxl + 20, // Ajustado para el backButton
    paddingBottom: Spacing.xxl, // Espacio extra al final para scroll
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
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
  // Estilos para el campo de contraseña con ojo
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 40, // Ajustar según la altura de tu label
    zIndex: 1,
    padding: 5,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
  registerButton: {
    marginBottom: Spacing.md,
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