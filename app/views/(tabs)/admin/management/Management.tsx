import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenContainer } from '../../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../../constants/theme';
import { useAuth } from '../../../../../hooks/auth/use-Auth';

export default function AdministracionScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  
  const [userName, setUserName] = useState('');
  const [ranchName, setRanchName] = useState('Estancia: ---');
  const [productionType, setProductionType] = useState('');
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    if (userData) {
      console.log('Cargando datos de sesión en Management:', userData);
      // 1. Nombre del Usuario
      setUserName(userData.fullname || userData.email || 'Usuario');

      // 2. Datos de la Estancia
      if (userData.ranch_name) {
        setRanchName(userData.ranch_name);
      }
      
      // Fallback details if available
      setLocationName(''); 
      setProductionType('');
    }
  }, [userData]);


  const menuItems = [
    {
      icon: 'leaf',
      label: 'Mi estancia',
      route: '/views/(tabs)/admin/Ranch/breeding/BreedingMenu',
    },
    {
      icon: 'create',
      label: 'Registrar datos del hato',
      route: '/views/admin/NewProperty',
    },
    {
      icon: 'stats-chart',
      label: 'Reportes',
      route: '/views/(tabs)/management/QrWorkerGenerator',
    },
    {
      icon: 'people',
      label: 'Mi equipo',
      route: '/views/(tabs)/admin/management/QrWorkerGenerator',
    },
  ];

  const handleNavigation = (route?: string) => {
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <ScreenContainer scrollable={true} style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeLabel}>Bienvenido,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.ranchInfoContainer}>
            <Text style={styles.ranchName}>{ranchName}</Text>
            {locationName ? <Text style={styles.ranchDetail}> {locationName}</Text> : null}
            {productionType ? <Text style={styles.ranchDetail}> {productionType}</Text> : null}
          </View>
        </View>
      </View>


      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.gridCard}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={32} color={Colors.primary} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    marginTop: Spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  userName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 42,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginVertical: Spacing.xs,
    textTransform: 'capitalize',
  },
  welcomeLabel: {
    fontFamily: Typography.fontPrimary,
    fontSize: 24,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  ranchInfoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  ranchName: {
    fontFamily: Typography.fontSecondary,
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
    backgroundColor: Colors.tabActiveBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ranchDetail: {
    fontFamily: Typography.fontSecondary,
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  profileIconContainer: {
    marginLeft: Spacing.md,
  },
  gridContainer: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  gridCard: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    ...Shadows.floatingButton,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.whiteOverlay,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.whiteOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  gridLabel: {
    fontFamily: Typography.fontPrimary,
    color: Colors.white,
    textAlign: 'left',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
});