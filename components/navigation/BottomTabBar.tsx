import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '../../constants/theme';
import { useAuth } from '../../hooks/auth/use-Auth';
import { useNavigation } from '../../hooks/navigation/use-navigation';

interface TabBarProps {
  state: any;
  navigation: any;
}

export const BottomTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  const { navigate } = useNavigation();
  const { getUserRole } = useAuth();
  const [role, setRole] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchRole = async () => {
      const userRole = await getUserRole();
      setRole(userRole);
    };
    fetchRole();
  }, []);

  const adminTabs = [
    {
      name: 'administracion',
      label: 'Administración',
      icon: 'business',
      route: '/views/(tabs)/admin/management/Administracion' as const,
    },
    {
      name: 'agregar',
      label: '',
      icon: 'add-circle',
      route: '/views/(tabs)/admin/management/Agregar' as const,
      isCentral: true,
    },
    {
      name: 'usuario',
      label: 'Usuario',
      icon: 'person',
      route: '/views/(tabs)/users/usuario' as const,
    },
  ];

  const workerTabs = [
    {
      name: 'inicio',
      label: 'Inicio',
      icon: 'home',
      route: '/views/(tabs)/worker/WorkerManagement' as const,
    },
    {
      name: 'scanner',
      label: '',
      icon: 'scan',
      route: '/views/(tabs)/worker/QrScannerRanch' as const,
      isCentral: true,
    },
    {
      name: 'usuario',
      label: 'Usuario',
      icon: 'person',
      route: '/views/(tabs)/users/usuario' as const,
    },
  ];

  // Role 3 is Worker, otherwise Admin
  const tabs = role === 3 ? workerTabs : adminTabs;

  return (
    <View style={styles.container}>
      <View style={styles.background} />

      {tabs.map((tab, index) => {
        // Simple focus logic based on index might happen to work if the number of tabs is the same
        // But better is to just let it be for now since existing code used index.
        // Ideally we match by route name but standard tab bars often use index.
        const isFocused = state.index === index;

        if (tab.isCentral) {
          return (
            <View key={tab.name} style={styles.centralTabContainer}>
              <TouchableOpacity
                style={styles.centralTab}
                onPress={() => navigate(tab.route)}
                activeOpacity={0.8}
              >
                <View style={styles.centralTabBackground}>
                  <Ionicons
                    name={tab.icon === 'scan' ? 'qr-code' : 'add'}
                    size={32}
                    color={Colors.white}
                  />
                </View>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigate(tab.route)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer,
              isFocused && styles.tabIconContainerActive
            ]}>
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={isFocused ? Colors.primarySolid : Colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? Colors.primarySolid : Colors.textSecondary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    height: 80, // Altura más equilibrada
    paddingBottom: 8,
    marginBottom: 14,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    marginHorizontal: 16,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.backgroundSolid,
    borderRadius: 20, // Bordes ligeramente menos redondeados
    // SOLO SOMBRA - SIN BORDE
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2, // Sombra más sutil hacia arriba
    },
    shadowOpacity: 0.08, // Más sutil
    shadowRadius: 8, // Menos difuminado
    elevation: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Centrado vertical
    paddingVertical: 4,
    zIndex: 1,
  },
  tabIconContainer: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  tabIconContainerActive: {
    backgroundColor: Colors.primarySolid + '10', // Más sutil
  },
  tabLabel: {
    ...Typography.overline,
    fontSize: 10,
    fontWeight: '500',
  },
  centralTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    marginTop: -1, // Elevación equilibrada
    zIndex: 2,
  },
  centralTab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralTabBackground: {
    width: 60, // Tamaño más equilibrado
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra equilibrada
    shadowColor: Colors.primarySolid,
    shadowOffset: {
      width: 0,
      height: 4, // Menos elevación
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    // Borde equilibrado
    borderWidth: 3,
    borderColor: Colors.white,
  },
});