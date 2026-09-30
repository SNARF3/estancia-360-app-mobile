import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, usePathname } from 'expo-router';
import React, { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { enableScreens } from 'react-native-screens';
import FlashMessage from 'react-native-flash-message';
import { Colors } from '../constants/theme';
import { devLog, installGlobalErrorLogger } from '../hooks/devLogger';
import { DbProvider } from '../hooks/db.sqlite/DbProvider';

// Experimento 2026-09-23, después de agotar los fixes de navegación de la app (acumulación de
// stack, timing de modal, anidamiento — todos confirmados y resueltos, ver
// docs/dev-logging.md) sin que el bug de pantalla en blanco desaparezca: Marvin reportó además
// que al entrar a una pantalla nueva, primero se ve brevemente el CONTENIDO de la pantalla
// anterior antes de cambiar a la correcta — contenido nativo reciclado sin limpiar, no un
// problema de qué ruta se pide. Eso apunta directo al motor de renderizado nativo de
// react-native-screens (pooling/reciclado de vistas bajo New Architecture), no a cómo esta app
// arma su navegación. enableScreens(false) apaga esa optimización nativa por completo — React
// Navigation vuelve a su render "manual" con Views normales, sin pooling de por medio. Si esto
// hace desaparecer tanto el blanco como el flash de contenido viejo, confirma que la causa
// siempre fue react-native-screens y no esta app — a costa de perder las transiciones nativas
// optimizadas (Views planas son algo menos fluidas, pero funcionalmente correctas). Revertir si
// no cambia nada — en ese caso el problema sería aún más profundo (Fabric mismo) y no algo que
// se pueda resolver sin logs nativos.
enableScreens(false);

// Instalado una sola vez, al importar este módulo (RootLayout es la raíz de toda la app) — ver
// hooks/devLogger.ts. Convierte cualquier excepción no capturada en un log con stack completo
// en vez de un silencio total.
installGlobalErrorLogger();

// Red de seguridad para la hipótesis principal del bug de pantalla en blanco: un error de
// render (ej. un componente nativo que no se encuentra bajo New Architecture) hoy deja la
// pantalla en blanco sin ningún rastro — React desmonta el árbol roto y no queda nada. Este
// boundary envuelve el <Stack> completo: si CUALQUIER pantalla tira una excepción durante el
// render, queda logueada acá (con nombre de pantalla y stack) y se muestra un mensaje visible
// en vez de blanco puro — eso solo ya deja saber "acá se rompió algo" en vez de tener que
// adivinar si fue un crash silencioso o la pantalla nunca llegó a montar.
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[error-boundary] Pantalla rota durante el render: ${error.message}\n${error.stack ?? '(sin stack)'}\nComponentStack: ${info.componentStack}`
    );
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.background }}>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, textAlign: 'center' }}>
            Ocurrió un error al mostrar esta pantalla
          </Text>
          <Text style={{ textAlign: 'center', color: Colors.textSecondary }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Log de diagnóstico SOLO dev (ver hooks/devLogger.ts) para rastrear el bug de pantalla en
// blanco: un único punto de instrumentación que cubre TODA la navegación de la app (cualquier
// cambio de ruta, sea por Stack o por Tabs), con un contador incremental para poder decir "se
// rompió en la navegación #N" en vez de "después de varias". Ver docs/dev-logging.md.
function NavigationLogger() {
  const pathname = usePathname();
  const navCountRef = useRef(0);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    navCountRef.current += 1;
    devLog(
      `[nav #${navCountRef.current}] ${prevPathRef.current ?? '(inicio)'} → ${pathname} @ ${new Date().toISOString()}`
    );
    prevPathRef.current = pathname;
  }, [pathname]);

  return null;
}

// AuthGate decide la ruta inicial (Inicio/Management/WorkerManagement) llamando
// router.replace(). Tiene que vivir DENTRO de <DbProvider> (no en RootLayout directo):
// DbProvider no renderiza el <Stack> — el navegador real — hasta que la DB terminó de
// inicializar, y llamar router.replace() antes de que exista un navegador montado hace
// que expo-router reinicie el árbol una y otra vez (loop de remounts infinito,
// confirmado 2026-08-08 — se disparaba siempre con sesión iniciada porque el init de
// DB con datos reales tarda más que con una DB vacía, agrandando la ventana de carrera).
function AuthGate() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');

        if (token && userData) {
          // El criterio es "¿tiene una estancia asociada?" (id_ranch), no el ranch_role —
          // un usuario sin estancia (ej. Colaborador recién registrado que todavía no
          // escaneó ningún QR) va a WorkerManagement (hoy solo ofrece "Unirse a una
          // Estancia"); cualquiera con estancia (Owner, Administrator, o un Colaborador ya
          // vinculado como Worker) va a Management completo. Antes se comparaba
          // ranch_role === 2 ("¿sos Worker?"), lo que mandaba incorrectamente a Management
          // completo a un usuario sin estancia (esa rama nunca seteaba ranch_role — bug
          // real documentado en CLAUDE.md).
          let idRanch: number | undefined;
          try {
            idRanch = JSON.parse(userData)?.id_ranch;
          } catch {
            // user_data corrupto — sigue como sin-estancia más abajo
          }

          if (idRanch) {
            router.replace('/views/(tabs)/admin/management/Management');
          } else {
            router.replace('/views/(tabs)/worker/WorkerManagement');
          }
        } else {
          router.replace('/views/auth/Inicio');
        }
      } catch {
        router.replace('/views/auth/Inicio');
      } finally {
        setChecking(false);
      }
    })();
  }, []); // ← [] vacío: solo corre UNA vez al montar (que ya ocurre después de isReady)

  if (!checking) return null;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: Colors.background, zIndex: 999,
    }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <DbProvider>
      <AuthGate />
      <NavigationLogger />
      <RootErrorBoundary>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: {
              color: Colors.textPrimary,
              fontFamily: 'Montserrat-SemiBold',
            },
            headerTintColor: Colors.primary,
            contentStyle: { backgroundColor: Colors.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="views" options={{ headerShown: false }} />
        </Stack>
      </RootErrorBoundary>
      <FlashMessage
        position="top"
        duration={4000}
        floating={true}
        style={{ paddingTop: 40 }}
      />
    </DbProvider>
  );
}