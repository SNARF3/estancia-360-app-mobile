import { Stack } from 'expo-router';

export default function ManagementLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="Management" />
      {/* Defined implicitly or added if needed */}
      <Stack.Screen name="QrWorkerGenerator" />
      <Stack.Screen name="CollaboratorsScreen" />
    </Stack>
  );
}
