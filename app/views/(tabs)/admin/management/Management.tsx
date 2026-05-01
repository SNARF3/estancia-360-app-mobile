// views/(tabs)/admin/management/Management.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { getUserData } from '../../../../../hooks/auth/use-Auth';

export default function AdministracionScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [ranchName, setRanchName] = useState('Estancia: ---');

  useEffect(() => {
    getUserData().then(data => {
      if (!data) return;
      setUserName(data.fullname || data.email || 'Usuario');
      if (data.ranch_name) setRanchName(data.ranch_name);
    });
  }, []);

  const menuItems = [
    {
      icon: 'paw',
      label: 'Mis Animales',
      route: '/views/(tabs)/admin/Ranch/Animals/AnimalMenu',
      color: Colors.primary,
    },
    {
      icon: 'cloud-upload',
      label: 'Cargas Masivas',
      route: '/views/(tabs)/admin/bulkImport/bulkImport',
      color: '#3B82F6',
    },
    {
      icon: 'grid-outline',
      label: 'Potreros',
      route: '/views/(tabs)/admin/Ranch/Pastures/PasturesMenu',
      color: Colors.accent,
    },
    {
      icon: 'people',
      label: 'Mi equipo',
      route: '/views/(tabs)/admin/management/QrWorkerGenerator',
      color: Colors.textSecondary,
    },
  ];

  return (
    <ScreenContainer scrollable={true} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeLabel}>Bienvenido,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.ranchInfoContainer}>
            <Text style={styles.ranchName}>{ranchName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.gridCard, { backgroundColor: item.color }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={30} color={item.color} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white + '80'} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: Spacing.tabBarHeight + 20 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.xxl,
    marginTop: Spacing.sm,
  },
  headerContent: { flex: 1 },
  welcomeLabel: {
    fontFamily: Typography.fontPrimary,
    fontSize: 24,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 38,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginVertical: Spacing.xs,
    textTransform: 'capitalize',
  },
  ranchInfoContainer: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  ranchName: {
    fontFamily: Typography.fontSecondary,
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
    backgroundColor: Colors.tabActiveBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gridContainer: { flexDirection: 'column', gap: Spacing.md, marginTop: Spacing.lg },
  gridCard: {
    width: '100%',
    height: 90,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    ...Shadows.floatingButton,
    elevation: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  gridLabel: {
    fontFamily: Typography.fontPrimary,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
});