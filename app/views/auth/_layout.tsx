import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen name="Inicio" />
      <Stack.Screen name="Login" />
      <Stack.Screen name="RegisterRole" /> 
      <Stack.Screen name="Register" />
      <Stack.Screen name="VerificationCodeEmail" />
      <Stack.Screen name="ChangePassword" />
    </Stack>
  );
}