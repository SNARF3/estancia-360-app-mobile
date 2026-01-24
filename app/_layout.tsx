import { Stack } from 'expo-router';
import { Colors } from '../constants/theme';
import FlashMessage from 'react-native-flash-message';

export default function RootLayout() {
  return (
    <>
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="views" options={{ headerShown: false }} />
      </Stack>
      {/* FlashMessage para popups globales */}
      <FlashMessage 
        position="top" 
        duration={4000}
        floating={true}
        style={{ paddingTop: 40 }}
      />
    </>
  );
}