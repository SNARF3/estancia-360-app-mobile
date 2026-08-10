import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { Colors } from '../constants/theme';
import { DbProvider } from '../hooks/db.sqlite/DbProvider';

// AuthGate decide la ruta inicial (Inicio/Management/WorkerManagement) llamando
// router.replace(). Tiene que vivir DENTRO de <DbProvider> (no en RootLayout directo):
// DbProvider no renderiza el <Stack> — el navegador real — hasta que la DB terminó de
// inicializar, y llamar router.replace() antes de que exista un navegador montado hace
// que expo-router reinicie el árbol una y otra vez (loop de remounts infinito,
// confirmado 2026-08-08 — se disparaba siempre con sesión iniciada porque el init de
// DB con datos reales tarda más que con una DB vacía, agrandando la ventana de carrera).
function AuthGate() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');

        if (token && userData) {
          // 'user_role' en AsyncStorage es el rol de SISTEMA (Root=1/Admin=2/Usuario=3) —
          // casi todo ganadero normal tiene idRole=3 ahí, así que compararlo directo
          // mandaba a CUALQUIER dueño de estancia a la pantalla de Worker por error.
          // El rol que importa acá es ranch_role (OWNER=1/WORKER=2/ADMINISTRATOR=3),
          // que solo viaja adentro de user_data (ver SessionParams en use-Auth.ts).
          let ranchRole: number | undefined;
          try {
            ranchRole = JSON.parse(userData)?.ranch_role;
          } catch {
            // user_data corrupto — sigue como no-worker (admin) más abajo
          }

          if (ranchRole === 2) {
            router.replace('/views/(tabs)/worker/WorkerManagement');
          } else {
            router.replace('/views/(tabs)/admin/management/Management');
          }
        } else {
          router.replace('/views/auth/Inicio');
        }
      } catch {
        router.replace('/views/auth/Inicio');
      } finally {
        setChecking(false);
      }
    })();
  }, []); // ← [] vacío: solo corre UNA vez al montar (que ya ocurre después de isReady)

  if (!checking) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: Colors.background, zIndex: 999,
    }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <DbProvider>
      <AuthGate />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: {
            color: Colors.textPrimary,
            fontFamily: 'Montserrat-SemiBold',
          },
          headerTintColor: Colors.primary,
          contentStyle: { backgroundColor: Colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="views" options={{ headerShown: false }} />
      </Stack>
      <FlashMessage
        position="top"
        duration={4000}
        floating={true}
        style={{ paddingTop: 40 }}
      />
    </DbProvider>
  );
}