import { Stack } from 'expo-router';

export default function RanchLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300,
                gestureEnabled: false,
            }}
        >
            <Stack.Screen name="rearing/WeightRecordForm" />
            <Stack.Screen name="health/VaccinationForm" />
            <Stack.Screen name="health/TreatmentForm" />
            <Stack.Screen name="health/HealthIncidentForm" />
            <Stack.Screen name="Pastures/PasturesMenu" />
            <Stack.Screen name="Pastures/LotDetail" />
            <Stack.Screen name="movements/MovimientosMenu" />
            <Stack.Screen name="movements/TransferForm" />
            <Stack.Screen name="movements/SaleForm" />
            <Stack.Screen name="movements/PurchaseForm" />
            <Stack.Screen name="movements/AnimalExitForm" />
            <Stack.Screen name="movements/RanchExitForm" />
            <Stack.Screen name="movements/PendingSalesScreen" />
        </Stack>
    );
}
