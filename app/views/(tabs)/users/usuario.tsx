import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { ScreenContainer } from '../../../../components/layout/ScreenContainer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../../constants/theme';
import { getUserData, SessionParams } from '../../../../hooks/auth/use-Auth';
import { getDb } from '../../../../hooks/db.sqlite/db-pool';

// ─── Plan ─────────────────────────────────────────────────────────────────────

const PLAN_FREE = {
  name: 'FREE',
  color: Colors.textSecondary,
  bg: Colors.textDisabled + '30',
  features: ['Hasta 200 animales', 'Módulo Cría', 'Módulo Recría', 'Sincronización básica'],
};

const PLAN_PREMIUM = {
  name: 'PREMIUM',
  color: '#F59E0B',
  bg: '#F59E0B20',
  features: [
    'Animales ilimitados',
    'Todos los módulos',
    'Sincronización automática',
    'Reportes avanzados',
    'Soporte prioritario',
  ],
};

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function UsuarioScreen() {
  const [userData, setUserData] = useState<SessionParams | null>(null);
  const [roleName, setRoleName] = useState('Usuario');

  useFocusEffect(
    useCallback(() => {
      getUserData().then((data) => {
        if (!data) return;
        setUserData(data);
        switch (data.ranch_role) {
          case 1: setRoleName('Dueño'); break;
          case 2: setRoleName('Trabajador'); break;
          case 3: setRoleName('Administrador'); break;
          default: setRoleName('Usuario');
        }
      });
    }, [])
  );

  const plan = PLAN_FREE; // por ahora siempre FREE

  const handleClearTestData = () => {
    Alert.alert(
      'Borrar datos de prueba',
      'Esto eliminará TODOS los animales y sus registros (pesajes, eventos, cría, sanidad, etc.). Los potreros y lotes se conservan. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo', style: 'destructive', onPress: async () => {
            try {
              const db = await getDb();
              const tables = [
                'weight_records', 'rearing_selections', 'fattening_entries',
                'feed_records', 'vaccinations', 'treatments', 'health_incidents',
                'breeding_services', 'gestation_diagnoses', 'parturitions', 'weanings',
                'animal_declared_history', 'animal_events', 'ranch_animals',
              ];
              for (const t of tables) {
                await db.runAsync(`DELETE FROM ${t}`);
              }
              showMessage({ message: 'Datos borrados', description: 'Todos los animales y registros fueron eliminados.', type: 'success', floating: true });
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudieron borrar los datos.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'access_token',
                'user_id',
                'user_role',
                'user_data',
              ]);
              showMessage({
                message: 'Sesión cerrada',
                description: 'Hasta pronto.',
                type: 'success',
                floating: true,
              });
              setTimeout(() => router.replace('/views/auth/Login'), 500);
            } catch {
              showMessage({
                message: 'Error',
                description: 'No se pudo cerrar sesión.',
                type: 'danger',
                floating: true,
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const initials = userData?.fullname
    ? userData.fullname.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <ScreenContainer scrollable={false} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + nombre */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{userData?.fullname || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{userData?.email || ''}</Text>
          <View style={[styles.roleBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: Colors.primary }]}>{roleName}</Text>
          </View>
        </View>

        {/* Estancia */}
        {userData?.ranch_name && (
          <View style={styles.ranchCard}>
            <Ionicons name="leaf" size={20} color={Colors.primary} />
            <View style={styles.ranchInfo}>
              <Text style={styles.ranchLabel}>Estancia activa</Text>
              <Text style={styles.ranchName}>{userData.ranch_name}</Text>
            </View>
          </View>
        )}

        {/* Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan de suscripción</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={[styles.planBadge, { backgroundColor: plan.bg }]}>
                <Text style={[styles.planBadgeText, { color: plan.color }]}>{plan.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() =>
                  showMessage({
                    message: 'Próximamente',
                    description: 'La suscripción Premium estará disponible pronto.',
                    type: 'info',
                    floating: true,
                  })
                }
              >
                <Ionicons name="star" size={14} color={Colors.white} />
                <Text style={styles.upgradeBtnText}>Mejorar a Premium</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featureList}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={styles.premiumTeaser}>
              <Text style={styles.premiumTeaserText}>Con Premium también obtienes:</Text>
              {PLAN_PREMIUM.features.slice(3).map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="lock-closed" size={14} color={Colors.textDisabled} />
                  <Text style={[styles.featureText, { color: Colors.textDisabled }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Opciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.menuCard}>
            {[
              { icon: 'help-circle-outline', label: 'Ayuda y soporte', onPress: () => {} },
              { icon: 'information-circle-outline', label: 'Acerca de Estancia360', onPress: () => {} },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Borrar datos de prueba */}
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearTestData} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Borrar datos de prueba</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Estancia360 v1.0 MVP</Text>

        <View style={{ height: Spacing.tabBarHeight + 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.floatingButton,
  },
  avatarText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  userName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ranchCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.tabBar,
  },
  ranchInfo: { flex: 1 },
  ranchLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ranchName: {
    fontFamily: Typography.fontPrimary,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontPrimary,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.tabBar,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  planBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  planBadgeText: {
    fontFamily: Typography.fontPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upgradeBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 4,
  },
  upgradeBtnText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  featureList: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  premiumTeaser: {
    borderTopWidth: 1,
    borderTopColor: Colors.textDisabled + '30',
    paddingTop: Spacing.md,
    gap: 6,
  },
  premiumTeaserText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.tabBar,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textDisabled + '20',
  },
  menuLabel: {
    fontFamily: Typography.fontSecondary,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  clearBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    marginBottom: Spacing.sm,
    ...Shadows.tabBar,
  },
  logoutBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    marginBottom: Spacing.lg,
    ...Shadows.tabBar,
  },
  logoutText: {
    fontFamily: Typography.fontSecondary,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  version: {
    fontFamily: Typography.fontSecondary,
    fontSize: 12,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
