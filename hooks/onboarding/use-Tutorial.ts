import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRef, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

export interface TutorialStep {
    key: string;
    title: string;
    description: string;
    // Para targets que viven fuera del árbol de quien arma el tour (ej. los botones del
    // BottomTabBar). Si se define, se usa en vez de la ref propia que crea el hook.
    resolveRef?: () => RefObject<View | null> | undefined;
}

export interface TutorialTargetLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Delay tras montar/cambiar de paso antes de medir el tile con measureInWindow —
// da tiempo a que el layout de la pantalla termine de asentarse.
const MEASURE_DELAY_MS = 60;
// Delay del auto-inicio en el primer uso, para no competir con el layout inicial de la pantalla.
const AUTO_START_DELAY_MS = 400;
// Reintentos si el target todavía no está listo (ej. un componente hermano, como el tab bar,
// que puede registrar su ref un instante después de que arranca el tour).
const MEASURE_RETRY_MS = 150;
const MEASURE_MAX_RETRIES = 6;

export function useTutorial(flag: string, steps: TutorialStep[]) {
    const storageKey = `onboarding_${flag}_seen`;
    const ownRefsRef = useRef(steps.map(() => createRef<View>()));

    // Evita closures obsoletas: `steps` puede ser un array literal nuevo en cada render
    // del componente que llama al hook.
    const stepsRef = useRef(steps);
    stepsRef.current = steps;

    const [visible, setVisible] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetLayout, setTargetLayout] = useState<TutorialTargetLayout | null>(null);

    const measure = useCallback((index: number, attempt = 0) => {
        const step = stepsRef.current[index];
        const target = step?.resolveRef ? step.resolveRef() : ownRefsRef.current[index];
        if (!target?.current) {
            if (attempt < MEASURE_MAX_RETRIES) {
                setTimeout(() => measure(index, attempt + 1), MEASURE_RETRY_MS);
            }
            return;
        }
        target.current.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
                setTargetLayout({ x, y, width, height });
            } else if (attempt < MEASURE_MAX_RETRIES) {
                setTimeout(() => measure(index, attempt + 1), MEASURE_RETRY_MS);
            }
        });
    }, []);

    const start = useCallback(() => {
        setTargetLayout(null);
        setStepIndex(0);
        setVisible(true);
    }, []);

    const finish = useCallback(() => {
        setVisible(false);
        setTargetLayout(null);
        AsyncStorage.setItem(storageKey, 'true').catch(() => {});
    }, [storageKey]);

    const next = useCallback(() => {
        setStepIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex >= stepsRef.current.length) {
                finish();
                return prev;
            }
            setTargetLayout(null);
            return nextIndex;
        });
    }, [finish]);

    const skip = useCallback(() => finish(), [finish]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => measure(stepIndex), MEASURE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [visible, stepIndex, measure]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        AsyncStorage.getItem(storageKey)
            .then(seen => {
                if (!seen) {
                    timer = setTimeout(start, AUTO_START_DELAY_MS);
                }
            })
            .catch((err) => {
                // Bug real encontrado 2026-09-06: tragar esto en silencio trataba un fallo
                // de LECTURA exactamente igual que "ya visto" — el tutorial no aparecía
                // nunca, sin ningún error visible, para cualquier usuario nuevo cuyo
                // AsyncStorage tuviera un hiccup justo en ese momento. Fail-open: si no se
                // puede confirmar si ya se vio, mostrarlo igual — es mucho menos costoso
                // mostrarlo de más una vez que no mostrarlo nunca.
                console.error('[useTutorial] no se pudo leer el flag de visto, se muestra igual:', err);
                timer = setTimeout(start, AUTO_START_DELAY_MS);
            });
        return () => timer && clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        refs: ownRefsRef.current,
        visible,
        stepIndex,
        totalSteps: steps.length,
        step: steps[stepIndex] ?? null,
        targetLayout,
        start,
        next,
        skip,
    };
}
