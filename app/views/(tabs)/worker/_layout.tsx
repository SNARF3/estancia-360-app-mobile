import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '../../../../constants/theme'; // Ajusta la ruta a tus constantes

export default function WorkerLayout() {
    return (
        <Stack
            screenOptions={{
                // Configuración base para todas las pantallas del stack
                contentStyle: { backgroundColor: Colors.background },
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.textPrimary,
            }}
        >
            {/* Pantalla Principal: Gestión del Trabajador 
        Se oculta el header nativo porque la pantalla ya tiene su propio <HeaderText>
      */}
            <Stack.Screen
                name="WorkerManagement"
                options={{
                    headerShown: false,
                    title: "Panel de Trabajo"
                }}
            />

            <Stack.Screen
                name="QrScannerRanch"
                options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom',
                    gestureEnabled: true, // Permite deslizar hacia abajo para cerrar en iOS
                }}
            />
        </Stack>
    );
}