import { Stack } from 'expo-router';

export default function BreedingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300,
                gestureEnabled: false,
            }}
        >
            <Stack.Screen name="BreedingServiceForm" />
            <Stack.Screen name="GestationDiagnosisForm" />
            <Stack.Screen name="ParturitionForm" />
            <Stack.Screen name="WeaningForm" />
        </Stack>
    );
}
