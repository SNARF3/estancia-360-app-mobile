import { Stack } from 'expo-router';

export default function AnimalsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300,
                gestureEnabled: false,
            }}
        >
            <Stack.Screen name="AnimalMenu" />
            <Stack.Screen name="AddAnimal" />
            <Stack.Screen name="DetailAnimal" />
        </Stack>
    );
}
