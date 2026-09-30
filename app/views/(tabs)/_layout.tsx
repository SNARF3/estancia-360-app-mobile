import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../../components/navigation/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
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
        options={{
          href: null,
          // Bug real encontrado 2026-09-23: admin/Ranch es un Tabs.Screen propio (tab hermano
          // de Registros/Management/etc, NO anidado dentro de un Stack compartido con ellos —
          // confirmado leyendo el código de @react-navigation/bottom-tabs). Por default, React
          // Navigation conserva el historial interno del Stack de un tab entre visitas — cada
          // vez que se entraba a un formulario distinto (Reproducción, Sanidad, Nuevo Animal,
          // etc.) sin que este tab se reiniciara, se apilaba una pantalla más sobre las de la
          // visita anterior. Con New Architecture, ese stack cada vez más profundo terminaba en
          // pantalla en blanco sin ninguna excepción de JS. popToTopOnBlur reinicia el stack
          // interno de este tab cada vez que se navega a otro — así cada entrada arranca limpia.
          // (No confundir con dismissTo/POP_TO, que se probó y se revirtió: esa acción solo
          // funciona DENTRO de un mismo stack, y admin/Ranch y Registros son stacks distintos.)
          popToTopOnBlur: true,
        }}
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
        name="admin/bulkImport/BulkImportVaccinations"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/BulkImportTreatments"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/BulkImportIncidents"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/BulkImportGestation"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/BulkImportMovements"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin/bulkImport/bulkImport"
        options={{ href: null }}
      />
    </Tabs>
  );
}
