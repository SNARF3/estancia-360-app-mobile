import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { Colors } from '../constants/theme';
import { DbProvider } from '../hooks/db.sqlite/DbProvider';

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');
        const roleStr = await AsyncStorage.getItem('user_role');

        if (token && userData) {
          const role = roleStr ? parseInt(roleStr) : 2;
          if (role === 3) {
            router.replace('/views/(tabs)/worker/WorkerManagement');
          } else {
            router.replace('/views/(tabs)/admin/management/Management');
          }
        } else {
          router.replace('/views/auth/Login');
        }
      } catch {
        router.replace('/views/auth/Login');
      } finally {
        setChecking(false);
      }
    })();
  }, []); // ← [] vacío: solo corre UNA vez al montar, nunca en hot reload

  return (
    <DbProvider>
      {checking && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: Colors.background, zIndex: 999,
        }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
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