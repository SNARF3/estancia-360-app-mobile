import 'react-native-get-random-values';

// Ruta inicial "/" — AuthGate (app/_layout.tsx) decide a dónde ir (Inicio/Management/
// WorkerManagement) en cuanto el Stack está montado y la cubre con su spinner mientras
// tanto. Este screen no debe redirigir por su cuenta: hacerlo generaba dos fuentes de
// navegación compitiendo entre sí (bug 2026-08-08, ver AuthGate).
export default function Index() {
  return null;
}