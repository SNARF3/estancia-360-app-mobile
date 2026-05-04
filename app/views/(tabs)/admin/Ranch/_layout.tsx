import { Stack } from 'expo-router';

export default function RanchLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="RanchMenu" />
            <Stack.Screen name="rearing/RearingMenu" />
            <Stack.Screen name="rearing/WeightRecordForm" />
            <Stack.Screen name="fattening/FatteningMenu" />
            <Stack.Screen name="fattening/FatteningEntryForm" />
            <Stack.Screen name="fattening/FeedRecordForm" />
            <Stack.Screen name="health/HealthMenu" />
            <Stack.Screen name="health/VaccinationForm" />
            <Stack.Screen name="health/TreatmentForm" />
            <Stack.Screen name="health/HealthIncidentForm" />
            <Stack.Screen name="Pastures/PasturesMenu" />
            <Stack.Screen name="Pastures/LotDetail" />
        </Stack>
    );
}
