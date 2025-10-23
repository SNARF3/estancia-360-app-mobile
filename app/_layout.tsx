import { Stack } from 'expo-router';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          color: Colors.textPrimary,
          fontFamily: 'Montserrat-SemiBold',
        },
        headerTintColor: Colors.primary,
        contentStyle: {
          backgroundColor: Colors.background,
        },
        headerShown: false,
      }}
    >
      {/* Pantallas de autenticación */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="views/auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="views/auth/register" options={{ headerShown: false }} />
      
      {/* Pantallas con tabs */}
      <Stack.Screen name="views/(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}