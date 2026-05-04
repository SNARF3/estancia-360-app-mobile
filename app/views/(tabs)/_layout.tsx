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
      {/* === TABS VISIBLES EN EL TAB BAR === */}
      <Tabs.Screen
        name="admin/management"
        options={{ title: 'Management' }}
      />
      <Tabs.Screen
        name="admin/sync/SyncScreen"
        options={{ title: 'Sincronización' }}
      />
      <Tabs.Screen
        name="admin/weights/WeightsScreen"
        options={{ title: 'Pesos' }}
      />
      <Tabs.Screen
        name="users/usuario"
        options={{ title: 'Usuario' }}
      />

      <Tabs.Screen
        name="admin/Registros/RegistrosMenu"
        options={{ href: null }}
      />

      {/* === RUTAS NO VISIBLES EN EL TAB BAR === */}
      {/* worker tiene su propio _layout, se registra como segmento completo */}
      <Tabs.Screen
        name="worker"
        options={{ href: null }}
      />
      {/* admin/Ranch tiene su propio _layout */}
      <Tabs.Screen
        name="admin/Ranch"
        options={{ href: null }}
      />
      {/* bulkImport no tiene _layout, sus archivos se descubren individualmente */}
      <Tabs.Screen
        name="admin/bulkImport/BulkImportAnimals"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/BulkImportWeights"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/bulkImport"
        options={{ href: null }}
      />
    </Tabs>
  );
}
