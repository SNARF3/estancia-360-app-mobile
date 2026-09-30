import { Stack } from 'expo-router';

export default function RanchLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300,
                gestureEnabled: false,
                // freezeOnBlur:false se probó como experimento el 2026-09-23 y NUNCA se aisló
                // realmente (siempre estuvo mezclado con los otros bugs reales de esta sesión —
                // acumulación de stack, timing del modal). Revertido a como estaba (default true)
                // para poder evaluarlo limpio: con freezeOnBlur:false, CADA pantalla visitada
                // queda completamente "viva" en vez de congelarse al perder foco — si el bug de
                // pantalla en blanco es en realidad el pool nativo de vistas de
                // react-native-screens agotándose después de N pantallas (no una acumulación de
                // historial, que ya se descartó — ver docs/dev-logging.md), tener más pantallas
                // "calientes" simultáneas empeora justo ese escenario en vez de ayudar.
            }}
        >
            <Stack.Screen name="rearing/WeightRecordForm" />
            <Stack.Screen name="health/VaccinationForm" />
            <Stack.Screen name="health/TreatmentForm" />
            <Stack.Screen name="health/HealthIncidentForm" />
            <Stack.Screen name="feeding/FeedRecordForm" />
            <Stack.Screen name="Pastures/PasturesMenu" />
            <Stack.Screen name="Pastures/LotDetail" />
            <Stack.Screen name="movements/MovimientosMenu" />
            <Stack.Screen name="movements/TransferForm" />
            <Stack.Screen name="movements/SaleForm" />
            <Stack.Screen name="movements/PurchaseForm" />
            <Stack.Screen name="movements/AnimalExitForm" />
            <Stack.Screen name="movements/RanchExitForm" />
            <Stack.Screen name="movements/PendingSalesScreen" />
            {/* breeding/ y Animals/ estaban anidadas en su propio _layout.tsx (Stack dentro de
                este Stack) — se aplanaron acá 2026-09-23: popToTopOnBlur (ver (tabs)/_layout.tsx)
                solo resetea ESTE stack al salir del tab, no cascadea a un stack anidado más
                adentro, así que breeding/Animals conservaban su historial interno entre visitas
                sin límite (causa real del bug de pantalla en blanco tras la segunda visita — ver
                docs/dev-logging.md). Con estas pantallas como hijas directas de este mismo Stack,
                el reset de popToTopOnBlur ahora sí las alcanza, igual que ya alcanzaba a
                health/movements (que nunca tuvieron este problema, precisamente por ser planas). */}
            <Stack.Screen name="breeding/BreedingServiceForm" />
            <Stack.Screen name="breeding/GestationDiagnosisForm" />
            <Stack.Screen name="breeding/ParturitionForm" />
            <Stack.Screen name="breeding/WeaningForm" />
            <Stack.Screen name="Animals/AnimalMenu" />
            <Stack.Screen name="Animals/AddAnimal" />
            <Stack.Screen name="Animals/DetailAnimal" />
        </Stack>
    );
}
