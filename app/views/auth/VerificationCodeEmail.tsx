import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { HeaderText } from '../../../components/common/HeaderText';
import { InputField } from '../../../components/common/InputField';
import { ButtonPrimary } from '../../../components/common/ButtonPrimary';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// IMPORTAR EL HOOK CREADO
// Ajusta la ruta según dónde guardaste el archivo use-UserVerificationCode.ts
import { useUserVerificationCode } from '../../../hooks/auth/use-UserVerificationCode';

export default function VerificationCodeEmail() {
  const router = useRouter();
  
  // Estado local solo para UI (email y visibilidad del modal)
  const [email, setEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Usamos el Custom Hook para la lógica
  const {
    userCode,
    setUserCode,
    loading,
    error, 
    requestVerificationCode,
    validateVerificationCode,
    resetVerification
  } = useUserVerificationCode();

  // Paso 1: Enviar correo (Llamada a API real)
  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }
    
    // El hook maneja el loading y la llamada a la BD
    const isSent = await requestVerificationCode(email);
    
    if (isSent) {
      setModalVisible(true); // Abrir popup solo si el backend respondió OK
    } else {
      // El hook ya maneja errores internos, pero podemos avisar si falló la red
      Alert.alert('Error', 'No se pudo enviar el código. Verifica que el correo esté registrado.');
    }
  };

  // Paso 2: Verificar código (Validación local contra el código del server)
  const handleVerifyCode = () => {
    // Esta función del hook compara userCode vs serverCode
    const isValid = validateVerificationCode();

    if (isValid) {
      setModalVisible(false); 
      // Si el código es correcto, vamos a cambiar contraseña
        router.push({
            pathname: '/views/auth/ChangePassword',
            params: { email: email } 
        });
    } 
    // Si no es válido, el hook actualiza la variable 'error' automáticamente
  };

  // Función para cerrar modal y limpiar estados
  const handleCloseModal = () => {
    setModalVisible(false);
    resetVerification();
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
            <HeaderText variant="h1">Recuperar Cuenta</HeaderText>
            <Text style={styles.subtitle}>
              Ingresa tu email para recibir un código de verificación.
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Email"
              placeholder="tu.email@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <ButtonPrimary
            title="Enviar Código"
            onPress={handleSendCode}
            loading={loading}
          />
        </View>
      </ScrollView>

      {/* --- POPUP DE CÓDIGO --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Verificar Código</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Ingresa el código que enviamos a {email}
            </Text>

            <InputField
              label="Código"
              placeholder="Ej. 123456"
              value={userCode} // Conectado al hook
              onChangeText={setUserCode} // Conectado al hook
              keyboardType="number-pad"
              editable={!loading}
              autoFocus={true}
            />

            {/* Mostrar mensaje de error si el código es incorrecto */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            <View style={styles.modalActions}>
              <ButtonPrimary
                title="Verificar y Continuar"
                onPress={handleVerifyCode}
                loading={loading} // Muestra spinner si está procesando (opcional)
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: Spacing.lg,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    marginTop: Spacing.lg,
  },
  // Estilo agregado para el mensaje de error
  errorText: {
    ...Typography.bodySmall,
    color: 'red', // O usa Colors.error si lo tienes definido en tu theme
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  }
});