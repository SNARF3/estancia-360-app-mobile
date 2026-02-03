import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterRoleScreen() {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [animationValue] = useState(new Animated.Value(0));

  const handleRoleSelect = async (roleId: number) => {
    setSelectedRole(roleId);
    
    // Animación de selección
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      // Guardar el rol seleccionado
      try {
        await AsyncStorage.setItem('selectedRoleId', roleId.toString());
        
        // Redirigir directamente a Register.tsx sin botón de continuar
        setTimeout(() => {
          router.push('/views/auth/Register');
        }, 100);
      } catch (error) {
        console.error('Error guardando el rol:', error);
      }
      
      // Resetear animación
      setTimeout(() => {
        animationValue.setValue(0);
      }, 200);
    });
  };

  const scaleInterpolate = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Botón de retroceso */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={34} color={Colors.primary} />
        </TouchableOpacity>

        {/* Contenedor principal */}
        <View style={styles.mainContainer}>
          {/* Título - Reducida la distancia entre líneas */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleLine1}>¿Cómo deseas usar</Text>
            <Text style={styles.titleLine2}>estancia 360?</Text>
          </View>

          {/* Contenedor de botones */}
          <View style={styles.buttonsContainer}>
            {/* Botón Propietario/Administrador */}
            <Animated.View
              style={[
                styles.buttonWrapper,
                { transform: [{ scale: selectedRole === 2 ? scaleInterpolate : 1 }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 2 && styles.roleButtonSelected
                ]}
                onPress={() => handleRoleSelect(2)}
                activeOpacity={0.9}
              >
                {/* Borde brilloso cuando está seleccionado */}
                {selectedRole === 2 && (
                  <View style={styles.glowBorder}>
                    <View style={styles.glowInner} />
                  </View>
                )}
                <Text style={[
                  styles.roleButtonText,
                  selectedRole === 2 && styles.roleButtonTextSelected
                ]}>
                  Propietario o administrador
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Descripción del primer botón */}
            <Text style={styles.roleDescription}>
              Gestiona tu estancia, registra datos y accede a reportes.
            </Text>

            {/* Separador */}
            <View style={styles.separator} />

            {/* Botón Trabajador/Técnico */}
            <Animated.View
              style={[
                styles.buttonWrapper,
                { transform: [{ scale: selectedRole === 3 ? scaleInterpolate : 1 }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 3 && styles.roleButtonSelected
                ]}
                onPress={() => handleRoleSelect(3)}
                activeOpacity={0.9}
              >
                {/* Borde brilloso cuando está seleccionado */}
                {selectedRole === 3 && (
                  <View style={styles.glowBorder}>
                    <View style={styles.glowInner} />
                  </View>
                )}
                <Text style={[
                  styles.roleButtonText,
                  selectedRole === 3 && styles.roleButtonTextSelected
                ]}>
                  Trabajador o técnico
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Descripción del segundo botón */}
            <Text style={styles.roleDescription}>
              Registra actividades y tareas asignadas por el propietario.
            </Text>
          </View>

          {/* Imagen de vacas (40% desde abajo) */}
          <View style={styles.imageContainer}>
            <Image 
              source={require('../../../assets/estancia360/vacas1.jpeg')}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
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
  scrollContent: {
    flexGrow: 1,
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
  mainContainer: {
    flex: 1,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  titleLine1: {
    ...Typography.h1,
    color: Colors.black,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 32,
  },
  titleLine2: {
    ...Typography.h1,
    color: Colors.black,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 32,
    marginTop: -4,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: '40%',
  },
  buttonWrapper: {
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  roleButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.primary,
    minHeight: 70,
    position: 'relative',
    overflow: 'hidden',
  },
  roleButtonSelected: {
    backgroundColor: Colors.primary,
    // Mantiene el mismo color de fondo
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  roleButtonText: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    position: 'relative',
    zIndex: 2,
  },
  roleButtonTextSelected: {
    color: Colors.white,
  },
  // Estilos para el borde brilloso
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18, // Un poco más grande que el botón
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
    overflow: 'hidden',
  },
  glowInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  roleDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    lineHeight: 22,
    fontSize: 15,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  imageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});