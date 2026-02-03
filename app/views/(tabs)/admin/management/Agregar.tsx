import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HeaderText } from '../../../../../components/common/HeaderText';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { Colors, Spacing, Typography } from '../../../../../constants/theme';

export default function AgregarScreen() {
  const options = [
    {
      icon: 'business',
      title: 'Nueva Propiedad',
      description: 'Agrega una nueva propiedad al catálogo',
      color: Colors.primary,
    },
    {
      icon: 'calendar',
      title: 'Nueva Reserva',
      description: 'Crea una reserva para un cliente',
      color: Colors.secondary,
    },
    {
      icon: 'person-add',
      title: 'Nuevo Cliente',
      description: 'Registra un nuevo cliente en el sistema',
      color: Colors.accent,
    },
    {
      icon: 'add-circle',
      title: 'Nuevo Servicio',
      description: 'Agrega servicios adicionales',
      color: Colors.hover,
    },
    {
      icon: 'document-text',
      title: 'Nuevo Contrato',
      description: 'Genera un nuevo contrato',
      color: Colors.textPrimary,
    },
    {
      icon: 'cash',
      title: 'Registrar Pago',
      description: 'Registra un pago recibido',
      color: '#10B981',
    },
  ];

  return (
    <ScreenContainer scrollable={true}>
      {/* Header */}
      <View style={styles.header}>
        <HeaderText variant="h1" style={styles.title}>Agregar Nuevo</HeaderText>
        <Text style={styles.subtitle}>Selecciona qué deseas agregar al sistema</Text>
      </View>

      {/* Grid de Opciones */}
      <View style={styles.optionsGrid}>
        {options.map((option, index) => (
          <TouchableOpacity key={index} style={styles.optionCard}>
            <View style={[styles.optionIconContainer, { backgroundColor: option.color }]}>
              <Ionicons name={option.icon as any} size={32} color={Colors.textLight} />
            </View>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sección de Acciones Rápidas */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="scan" size={24} color={Colors.primary} />
            <Text style={styles.quickActionText}>Escanear Documento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="images" size={24} color={Colors.primary} />
            <Text style={styles.quickActionText}>Subir Fotos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="share-social" size={24} color={Colors.primary} />
            <Text style={styles.quickActionText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    width: '48%',
    alignItems: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: Spacing.md,
  },
  optionIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  quickActionText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});