import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderText } from '../../../../components/common/HeaderText';
import { ScreenContainer } from '../../../../components/layout/ScreenContainer';
import { Colors, Spacing, Typography } from '../../../../constants/theme';

export default function UsuarioScreen() {
  const userStats = [
    { icon: 'calendar', label: 'Reservas Activas', value: '3' },
    { icon: 'star', label: 'Puntuación', value: '4.8' },
    { icon: 'time', label: 'Miembro desde', value: '2024' },
  ];

  const menuSections = [
    {
      title: 'Mi Cuenta',
      items: [
        { icon: 'person', label: 'Perfil', color: Colors.primary },
        { icon: 'notifications', label: 'Notificaciones', color: Colors.secondary },
        { icon: 'lock-closed', label: 'Privacidad', color: Colors.accent },
      ],
    },
    {
      title: 'Mis Reservas',
      items: [
        { icon: 'calendar', label: 'Historial', color: Colors.primary },
        { icon: 'heart', label: 'Favoritos', color: Colors.secondary },
        { icon: 'card', label: 'Métodos de Pago', color: Colors.accent },
      ],
    },
    {
      title: 'Soporte',
      items: [
        { icon: 'help-circle', label: 'Ayuda', color: Colors.textPrimary },
        { icon: 'chatbubble', label: 'Soporte', color: Colors.secondary },
        { icon: 'information', label: 'Acerca de', color: Colors.accent },
      ],
    },
  ];

  return (
    <ScreenContainer scrollable={true}>
      {/* Header del Usuario */}
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Colors.textLight} />
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={16} color={Colors.textLight} />
          </View>
        </View>
        <HeaderText variant="h1" style={styles.userName}>María González</HeaderText>
        <Text style={styles.userEmail}>maria.gonzalez@email.com</Text>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>Usuario Premium</Text>
        </View>
      </View>

      {/* Estadísticas del Usuario */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          {userStats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name={stat.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menú de Opciones */}
      <View style={styles.menuContainer}>
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuItems}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity key={itemIndex} style={styles.menuItem}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon as any} size={20} color={Colors.textLight} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={Colors.secondary} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  userHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  userName: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  userEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  userBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  userBadgeText: {
    ...Typography.overline,
    color: Colors.textLight,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  menuContainer: {
    gap: Spacing.lg,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  menuItems: {
    backgroundColor: Colors.white,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.textDisabled + '20',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: 20,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: Spacing.md,
  },
  logoutText: {
    ...Typography.body,
    color: Colors.secondary,
    fontWeight: '600',
  },
});