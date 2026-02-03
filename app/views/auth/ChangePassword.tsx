import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router'; // Agregado useLocalSearchParams
import { Ionicons } from '@expo/vector-icons';

// Importamos tu hook nuevo
import { useUserChangePassword } from '../../../hooks/auth/use-UserChangePassword';

export default function ChangePasswordScreen() {
  const router = useRouter();
  
  // 1. Recibimos el email de la pantalla anterior
  const params = useLocalSearchParams();
  const email = params.email as string;

  // 2. Usamos el hook para manejar lógica y estados
  const {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    changePassword
  } = useUserChangePassword();

  const handleResetPassword = async () => {
    // Validación de seguridad por si llegaron aquí sin email
    if (!email) {
      Alert.alert('Error', 'No se ha detectado el correo electrónico del usuario.');
      return;
    }

    // 3. Llamamos a la función del hook
    const isSuccess = await changePassword(email);

    if (isSuccess) {
      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada', [
        { 
          text: 'Iniciar Sesión', 
          onPress: () => router.replace('/views/auth/Login') 
        }
      ]);
    }
    // Si falla, la variable 'error' del hook se actualiza y se muestra en la UI
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* BOTÓN DE ATRÁS */}
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
        <View style={styles.topSection}>
          <View style={styles.header}>
            <HeaderText variant="h1">Crear Nueva Contraseña</HeaderText>
            <Text style={styles.subtitle}>
              Tu identidad ha sido verificada. Crea una nueva contraseña segura.
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Nueva Contraseña"
              placeholder="Mínimo 6 caracteres (Mayus, minus, num)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!loading}
            />
            <InputField
              label="Confirmar Contraseña"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          {/* Muestra errores de validación o del servidor aquí */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <ButtonPrimary
            title="Actualizar Contraseña"
            onPress={handleResetPassword}
            loading={loading}
          />
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + 60,
    paddingBottom: Spacing.xl,
  },
  topSection: {},
  bottomSection: {
    marginBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  // Estilo para el mensaje de error
  errorText: {
    ...Typography.bodySmall,
    color: 'red', // O usa Colors.error si lo tienes definido
    textAlign: 'center',
    marginBottom: Spacing.md,
  }
});