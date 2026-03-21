import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../../components/navigation/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Route: /views/(tabs)/index (hidden) */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* Route: /views/(tabs)/admin/management/Management */}
      <Tabs.Screen
        name="admin/management/Management"
        options={{
          title: 'Management',
        }}
      />

      {/* Route: /views/(tabs)/worker/WorkerManagement */}
      <Tabs.Screen
        name="worker/WorkerManagement"
        options={{
          title: 'Inicio',
        }}
      />

      {/* Route: /views/(tabs)/worker/QrScannerRanch */}
      <Tabs.Screen
        name="worker/QrScannerRanch"
        options={{
          title: 'Scanner',
        }}
      />

      {/* Route: /views/(tabs)/users/usuario */}
      <Tabs.Screen
        name="users/usuario"
        options={{
          title: 'Usuario',
        }}
      />

      {/* Sub-screens implicit in file structure but can be defined here to hide from tab bar logic if needed, 
          though href:null in tabs usually handles it. BottomTabBar custom logic handles the visible tabs. */}
      <Tabs.Screen
        name="admin/management/QrWorkerGenerator"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/Ranch/RanchMenu"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/Ranch/Animals"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tabs>
  );
}