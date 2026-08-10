import type { RefObject } from 'react';
import type { View } from 'react-native';

// Registro compartido de refs de elementos que viven fuera del árbol de quien arma el tour
// (ej. los botones del BottomTabBar, que se renderizan como hermanos de la pantalla Management,
// no como hijos). measureInWindow() no necesita relación de árbol, solo necesita la ref del
// componente nativo — este registro es el puente para conseguirla desde otro componente.
const registry = new Map<string, RefObject<View | null>>();

export function registerTutorialTarget(key: string, ref: RefObject<View | null>): void {
    registry.set(key, ref);
}

export function getTutorialTarget(key: string): RefObject<View | null> | undefined {
    return registry.get(key);
}
