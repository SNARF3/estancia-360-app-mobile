import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../../components/navigation/BottomTabBar'; // ← CON llaves
import { Colors } from '../../../constants/theme';

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
        name="management/Administracion"
        options={{
          title: 'Administración',
        }}
      />
      
      <Tabs.Screen
        name="management/Agregar"
        options={{
          title: 'Agregar',
        }}
      />
      
      <Tabs.Screen
        name="users/usuario"
        options={{
          title: 'Usuario',
        }}
      />
    </Tabs>
  );
}