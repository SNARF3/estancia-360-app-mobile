import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../hooks/auth/use-Auth';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  route: any;
  isCentral?: boolean;
}

interface TabBarProps {
  state: any;
  navigation: any;
  descriptors: any;
}

import { usePathname, useRouter } from 'expo-router';

export const BottomTabBar: React.FC<TabBarProps> = ({ state, navigation, descriptors }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { getUserRole } = useAuth();
  const [role, setRole] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchRole = async () => {
      const userRole = await getUserRole();
      setRole(userRole);
    };
    fetchRole();
  }, []);

  const adminTabs: TabItem[] = [
    {
      name: 'admin',
      label: 'Administración',
      icon: 'business',
      route: '/views/(tabs)/admin/management/Management',
    },
    {
      name: 'users',
      label: 'Usuario',
      icon: 'person',
      route: '/views/(tabs)/users/usuario',
    },
  ];

  const workerTabs: TabItem[] = [
    {
      name: 'WorkerManagement',
      label: 'Inicio',
      icon: 'home',
      route: '/views/(tabs)/worker/WorkerManagement',
    },
    {
      name: 'QrScannerRanch',
      label: '',
      icon: 'scan',
      route: '/views/(tabs)/worker/QrScannerRanch',
      isCentral: true,
    },
    {
      name: 'users',
      label: 'Usuario',
      icon: 'person',
      route: '/views/(tabs)/users/usuario',
    },
  ];

  const tabs = role === 3 ? workerTabs : adminTabs;

  // Check if tab bar should be hidden for current modules (Animals, Breeding, or explicit display:none)
  const { options } = descriptors[state.routes[state.index].key];
  const isHiddenModule = pathname.includes('/admin/Ranch/Animals') || 
                         pathname.includes('/admin/Ranch/breeding');

  if (options.tabBarStyle?.display === 'none' || isHiddenModule) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.background} />

      {tabs.map((tab) => {
        // Focus logic based on pathname substrings (more robust for Expo Router)
        const isFocused = pathname.includes(tab.name);

        const onPress = () => {
          if (!isFocused) {
            router.push(tab.route);
          }
        };

        if (tab.isCentral) {
          return (
            <View key={tab.name} style={styles.centralTabContainer}>
              <TouchableOpacity
                style={styles.centralTab}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <View style={styles.centralTabBackground}>
                  <Ionicons
                    name={tab.icon === 'scan' ? 'qr-code' : 'add'}
                    size={Typography.floatingIcon.fontSize}
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
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer,
              isFocused && styles.tabIconContainerActive
            ]}>
              <Ionicons
                name={tab.icon as any}
                size={Typography.tabIcon.fontSize}
                color={isFocused ? Colors.tabActive : Colors.tabInactive}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? Colors.tabActive : Colors.tabInactive,
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
    backgroundColor: Colors.transparent,
    height: Spacing.tabBarHeight,
    paddingBottom: Spacing.tabBarPaddingBottom,
    marginBottom: Spacing.md + 4,
    paddingTop: Spacing.tabBarPaddingTop,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    marginHorizontal: Spacing.tabBarPadding,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.tabBarBackground,
    borderRadius: BorderRadius.tabBar,
    ...Shadows.tabBar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    zIndex: 1,
  },
  tabIconContainer: {
    padding: Spacing.tabIconPadding,
    borderRadius: BorderRadius.tabIcon,
    marginBottom: Spacing.tabLabelMargin,
    backgroundColor: Colors.transparent,
  },
  tabIconContainerActive: {
    backgroundColor: Colors.tabActiveBackground,
  },
  tabLabel: {
    ...Typography.tabLabel,
  },
  centralTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Spacing.tabBarHeight,
    height: Spacing.tabBarHeight,
    marginTop: -1,
    zIndex: 2,
  },
  centralTab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralTabBackground: {
    width: Spacing.floatingButtonSize,
    height: Spacing.floatingButtonSize,
    borderRadius: BorderRadius.floatingButton,
    backgroundColor: Colors.floatingButton,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingButton,
    borderWidth: Spacing.floatingButtonBorder,
    borderColor: Colors.floatingButtonBorder,
  },
});