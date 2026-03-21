import { Stack } from 'expo-router';

export default function RanchLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="RanchMenu" />
        </Stack>
    );
}
