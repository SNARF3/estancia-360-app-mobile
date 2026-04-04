import { Stack } from 'expo-router';

export default function BreedingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BreedingMenu" />
            <Stack.Screen name="BreedingServiceForm" />
            <Stack.Screen name="GestationDiagnosisForm" />
            <Stack.Screen name="ParturitionForm" />
            <Stack.Screen name="WeaningForm" />
            <Stack.Screen name="RearingSelectionForm" />
        </Stack>
    );
}
