import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../../components/navigation/BottomTabBar'; // ← CON llaves

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="/admin/management/Administracion"
        options={{
          title: 'Administración',
        }}
      />

      <Tabs.Screen
        name="/admin/management/Agregar"
        options={{
          title: 'Agregar',
        }}
      />

      <Tabs.Screen
        name="/users/usuario"
        options={{
          title: 'Usuario',
        }}
      />
    </Tabs>
  );
}