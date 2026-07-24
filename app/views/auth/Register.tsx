import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { AnimatedLogo } from '../../../components/common/AnimatedLogo';
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { useUserRegisterLogic } from '../../../hooks/auth/use-UserRegisterLogic';

export default function RegisterScreen() {
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

  // 2. Hook de lógica de formulario (Ahora pasamos el rol seleccionado)
  // IMPORTANTE: Este hook ya contiene la lógica de registro en 'handleRegister'
  const {
    formData,
    touched,
    errors,
    animations,
    loading,        // Estado de carga del hook
    apiError,       // Errores de API del hook
    successMessage, // Mensaje de éxito del hook
    handleInputChange,
    handleBlur,
    handlePhoneChange,
    handleCiChange,
    handleRegister, // <--- FUNCIÓN QUE HACE EL POST A LA BD
    isFormValid,
  } = useUserRegisterLogic(selectedRole || 2);

  // 3. Efecto para manejar la redirección tras registro exitoso (Solo para Rol 3)
  useEffect(() => {
    if (successMessage && selectedRole === 3) {
      Alert.alert("Éxito", "Cuenta creada correctamente.", [
        {
          text: "Iniciar Sesión",
          onPress: () => router.replace('/views/auth/Login') // O ir directo al dashboard si el login es automático
        }
      ]);
    }
  }, [successMessage, selectedRole]);

  // 4. Efecto para mostrar errores de API
  useEffect(() => {
    if (apiError && selectedRole === 3) {
      Alert.alert("Error", apiError);
    }
  }, [apiError, selectedRole]);


  // --- LÓGICA DE BOTÓN CONTINUAR ---
  const handleContinue = () => {

    // CASO WORKER (Rol 3): Usamos la función del hook para registrar
    if (selectedRole === 3) {
      handleRegister(); // El hook se encarga de conectar a la BD
    }

    // CASO OWNER (Rol 2): Navegamos al siguiente paso
    else {
      // Empaquetamos los datos y vamos a la pantalla de Estancia
      const dataToSend = JSON.stringify({ ...formData, roleId: selectedRole });

      router.push({
        pathname: '/views/auth/RegisterRanch',
        params: { userData: dataToSend }
      });
    }
  };

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/views/auth/RegisterRole' as any)}>
        <Ionicons name="arrow-back" size={34} color={Colors.primary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.headerSlideUp }] }
          ]}
        >
          <HeaderText variant="h1">Crear Cuenta</HeaderText>
          <View style={styles.logoContainer}>
            <AnimatedLogo size={140} />
          </View>
          <Text style={styles.subtitle}>
            {selectedRole === 3 ? "Datos del Trabajador" : "Paso 1: Datos Personales"}
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.form,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.formSlideUp }] }
          ]}
        >
          <InputField
            label="Nombre"
            placeholder="Tu nombre"
            value={formData.nombre}
            onChangeText={(v) => handleInputChange('nombre', v)}
            onBlur={() => handleBlur('nombre')}
            error={errors.nombre}
            touched={touched.nombre}
          />
          <InputField
            label="Apellido Paterno"
            placeholder="Tu apellido paterno"
            value={formData.apellidoPaterno}
            onChangeText={(v) => handleInputChange('apellidoPaterno', v)}
            onBlur={() => handleBlur('apellidoPaterno')}
            error={errors.apellidoPaterno}
            touched={touched.apellidoPaterno}
          />
          <InputField
            label="Apellido Materno"
            placeholder="Tu apellido materno"
            value={formData.apellidoMaterno}
            onChangeText={(v) => handleInputChange('apellidoMaterno', v)}
            onBlur={() => handleBlur('apellidoMaterno')}
            error={errors.apellidoMaterno}
            touched={touched.apellidoMaterno}
          />
          <InputField
            label="Número de Cédula"
            placeholder="Tu número de cédula"
            value={formData.ci}
            onChangeText={handleCiChange}
            onBlur={() => handleBlur('ci')}
            keyboardType="number-pad"
            error={errors.ci}
            touched={touched.ci}
            maxLength={10}
          />
          <InputField
            label="Email"
            placeholder="tu.email@ejemplo.com"
            value={formData.email}
            onChangeText={(v) => handleInputChange('email', v)}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            touched={touched.email}
          />
          <InputField
            label="Teléfono"
            placeholder="Tu número de teléfono"
            value={formData.telefono}
            onChangeText={handlePhoneChange}
            onBlur={() => handleBlur('telefono')}
            keyboardType="phone-pad"
            error={errors.telefono}
            touched={touched.telefono}
            maxLength={8}
          />

          <View style={styles.passwordContainer}>
            <InputField
              label="Contraseña"
              placeholder="Min. 6 caracteres"
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              onBlur={() => handleBlur('password')}
              secureTextEntry={!showPassword}
              error={errors.password}
              touched={touched.password}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

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
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.actions,
            { opacity: animations.fadeAnim, transform: [{ translateY: animations.buttonSlideUp }] }
          ]}
        >
          <ButtonPrimary
            // Texto dinámico según estado y rol
            title={
              loading
                ? "Registrando..."
                : (selectedRole === 3 ? "Crear Cuenta" : "Continuar")
            }
            onPress={handleContinue}
            // Deshabilitado si el form es inválido, si no hay rol, o si está cargando (loading viene del hook)
            disabled={!isFormValid || !selectedRole || loading}
            style={styles.registerButton}
          />

          <View style={styles.loginSection}>
            <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
            <Link href="/views/auth/Login" asChild>
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
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { ...Typography.body, color: Colors.textSecondary },
  backButton: { position: 'absolute', top: Spacing.xl + 10, left: Spacing.lg, zIndex: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, paddingTop: Spacing.xxl + 20, paddingBottom: Spacing.xxl },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoContainer: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.md },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  form: { flex: 1, marginBottom: Spacing.lg },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  eyeIcon: { position: 'absolute', right: 15, top: 40, zIndex: 1, padding: 5 },
  actions: { marginTop: 'auto', marginBottom: Spacing.xl },
  registerButton: { marginBottom: Spacing.md },
  loginSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { ...Typography.body, color: Colors.textSecondary },
  loginLink: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});