# Logs de diagnóstico (solo desarrollo) — bug de pantalla en blanco / sync de descarga

Agregado 2026-09-23 para poder investigar en vivo, con evidencia real, dos problemas reportados:
pantalla en blanco después de varias navegaciones (Reproducción, Sanidad, Nuevo Animal, Cargas
Masivas, listado de animales) y la descarga de sync que no trae los animales de vuelta.

## Experimento final 2026-09-23: `enableScreens(false)` en `app/_layout.tsx`

Después de 5 fixes reales de navegación (acumulación de stack vía `router.replace`, timing de
`OptionsSheetModal`, anidamiento de stacks que `popToTopOnBlur` no alcanzaba, `freezeOnBlur`
probado en ambos sentidos) el patrón se mantenía IDÉNTICO: 3 navegaciones limpias, la 4ta en
blanco, siempre — con `MOUNT`/`UNMOUNT` disparando normal y sin ningún error capturado. Marvin
aportó el dato que cerró el diagnóstico: al entrar a una pantalla nueva, **primero se ve
brevemente el contenido de la pantalla anterior** antes de cambiar al correcto — un flash de
contenido nativo reciclado sin limpiar, reproducido también en el build de producción real (no
solo en dev). Eso ya no es un problema de "qué ruta se pide" (eso está confirmado limpio) — es el
motor de reciclado/pooling de vistas nativas de `react-native-screens` bajo New Architecture.

`enableScreens(false)` (llamado en `app/_layout.tsx`, antes de que monte cualquier navegador) apaga
esa optimización nativa por completo — React Navigation vuelve a su render con `View`s normales,
sin pooling nativo de por medio. Es la forma más directa de sacar a `react-native-screens` de la
ecuación para confirmar si es la causa real, a costa de perder las transiciones nativas optimizadas
(las animaciones entre pantallas se ven un poco menos fluidas, pero funcionalmente correctas).

**Si esto resuelve tanto el blanco como el flash de contenido viejo**: confirma que la causa
siempre fue `react-native-screens`, no esta app — y da un camino real a producción (dejar
`enableScreens(false)` permanente hasta que la librería lo resuelva aguas arriba, o hasta poder
confirmar con logs nativos qué versión puntual lo arregla).

**Confirmado por Marvin — esto resolvió el bug por completo.** `enableScreens(false)` queda
permanente en `app/_layout.tsx` (ver también `CLAUDE.md`, sección "Navegación y Layout").

## Bug real encontrado y resuelto 2026-09-23: `id_ranch` se guardaba como `"1.0"` en vez de `"1"`

El listado de animales daba siempre vacío pese a que la descarga de sync reportaba éxito
(`ranch_animals: {"updated": 173}`). El diagnóstico agregado en
`hooks/Animals/offline/use-GetListAnimals.ts` lo mostró sin ambigüedad:

```
total en tabla (sin ningún filtro): 173
agrupado por id_ranch real: [{"count": 173, "id_ranch": "1.0", "t": "text"}]
```

`ranch_animals.id_ranch` es `TEXT` en el schema local, pero `upsertEntity()`/
`applyConflictResolutions()` (`hooks/db.sqlite/sync.ts`) guardaban el `idRanch` del servidor sin
convertir — un número JS crudo. SQLite lo bindea con afinidad `REAL` y su cast automático a texto
de la columna produce `"1.0"`, mientras que el resto de la app siempre arma ese mismo valor con
`params.id_ranch.toString()` (JS, da `"1"`, nunca `"1.0"` para un entero). Nunca vuelven a
coincidir — la fila queda invisible para cualquier `WHERE id_ranch = ?` aunque exista perfecta.

**Fix**: `normalizeValue(key, v)` en `sync.ts` ahora fuerza `idRanch` a `String(v)` explícito antes
de guardarlo — cubre el bug en cualquier tabla que tenga `id_ranch` (no solo `ranch_animals`, por
ejemplo también `movements`). No hace falta ninguna migración para reparar lo ya descargado: la
próxima "Descargar todo" hace `UPDATE` sobre esas mismas filas (matcheadas por `server_id`) con el
valor ya corregido — se auto-reparan solas.

## Cómo funcionan

Todo pasa por `hooks/devLogger.ts`:

- `devLog(...)` — reemplazo directo de `console.log`, gateado por `__DEV__` (global que React
  Native define automáticamente: `true` en cualquier build de desarrollo, `false` en cualquier
  build de release/producción). Metro reemplaza `__DEV__` como constante en build time, así que el
  código detrás de este `if` se elimina del bundle de producción por dead-code elimination — no es
  un toggle en runtime que dependa de que alguien lo apague a mano.
- `useScreenLifecycleLog(nombre)` — hook que loguea mount/unmount de una pantalla, usado en las
  pantallas puntuales que Marvin señaló como afectadas.
- `installGlobalErrorLogger()` — instala el manejador global de excepciones de React Native
  (`ErrorUtils.setGlobalHandler`, ver `app/_layout.tsx`, se llama una sola vez al importar el
  módulo raíz). Hasta agregar esto, la hipótesis principal del bug (una excepción no capturada,
  ej. un módulo nativo que no se encuentra bajo New Architecture) no dejaba NINGÚN rastro — el
  componente nunca termina de montar, ni el log de navegación ni el de mount llegan a disparar.
  Con esto instalado, cualquier excepción no capturada por ningún try/catch queda logueada con
  mensaje y stack completo antes de que la pantalla se quede en blanco.

`console.error`/`console.warn` de errores reales **no se tocaron** — siguen viéndose siempre,
incluso en producción, porque son diagnóstico de fallos, no ruido de navegación. El log del error
global y el de `RootErrorBoundary` (ver abajo) también usan `console.error` sin gatear, por el
mismo motivo — son errores reales, no ruido.

## `RootErrorBoundary` (`app/_layout.tsx`)

Además de los logs, se agregó un `ErrorBoundary` de React envolviendo el `<Stack>` raíz completo.
No es un log en sí, pero es la pieza que faltaba para que un log de error tenga a dónde
"engancharse": sin esto, cuando una pantalla tira una excepción durante el render, React
desmonta el árbol roto y no queda nada — ni un mensaje en pantalla, ni forma de que
`componentDidCatch` corra si no hay ningún boundary arriba. Ahora, cualquier crash de render en
cualquier pantalla de la app:
1. Se loguea (`console.error`, siempre) con el mensaje, el stack del error, y el component stack
   (qué componente exactamente lo tiró).
2. Se muestra un mensaje visible en pantalla (`Ocurrió un error al mostrar esta pantalla` + el
   mensaje del error) en vez de blanco puro — así se puede distinguir a simple vista un crash de
   render real de un problema de navegación/routing.

## Qué se instrumentó

| Archivo | Qué loguea | Categoría |
|---|---|---|
| `app/_layout.tsx` (`NavigationLogger`) | Cada cambio de ruta de toda la app: pantalla anterior → nueva, contador incremental de navegaciones desde el arranque, timestamp | navegación |
| `hooks/db.sqlite/sync.ts` (`downloadFromServer`) | `idRanch`/`fullSync`/`since` al arrancar; URL exacta de cada página pedida; cantidad de entidades recibidas por tipo y deletions por tabla; resultado de `upsertEntity` agregado por tabla (inserted/updated/conflict); resumen final (`pulled`/`deleted`/`conflicts`) | sync-descarga |
| `hooks/db.sqlite/sync.ts` (resto del archivo: `syncCria`/`syncRecria`/`syncEngorde`/`syncSanidad`/`syncMovimientos`/`syncAll`/`apiFetch`/`buildServerIdMap`/etc.) | Los ~34 `console.log` de diagnóstico que ya existían en el archivo se convirtieron a `devLog` (mismo contenido, ahora gateado) | sync-subida |
| `app/views/(tabs)/admin/Ranch/breeding/BreedingServiceForm.tsx` | Mount/unmount | pantalla — Reproducción |
| `app/views/(tabs)/admin/Ranch/breeding/GestationDiagnosisForm.tsx` | Mount/unmount | pantalla — Reproducción |
| `app/views/(tabs)/admin/Ranch/breeding/ParturitionForm.tsx` | Mount/unmount | pantalla — Reproducción |
| `app/views/(tabs)/admin/Ranch/breeding/WeaningForm.tsx` | Mount/unmount | pantalla — Reproducción |
| `app/views/(tabs)/admin/Ranch/health/VaccinationForm.tsx` | Mount/unmount | pantalla — Sanidad |
| `app/views/(tabs)/admin/Ranch/health/TreatmentForm.tsx` | Mount/unmount | pantalla — Sanidad |
| `app/views/(tabs)/admin/Ranch/health/HealthIncidentForm.tsx` | Mount/unmount | pantalla — Sanidad |
| `app/views/(tabs)/admin/Ranch/Animals/AddAnimal.tsx` | Mount/unmount | pantalla — Nuevo Animal |
| `app/views/(tabs)/admin/Ranch/Animals/AnimalMenu.tsx` | Mount/unmount | pantalla — listado de animales |
| `hooks/Animals/offline/use-GetListAnimals.ts` (`fetchAnimals`) | Cuántas filas devuelve el query completo; si da 0, desglosa automáticamente: total en `ranch_animals` sin ningún filtro, agrupado por `id_ranch` real (valor + `typeof()`), cuántas hay con `id_ranch` correcto pero sin filtrar por `id_status`, y el desglose de `id_status` para ese ranch | listado de animales — diagnóstico de lista vacía |

## Cómo leerlos al reproducir el bug

En la consola de Metro vas a ver, intercalados:
- `[nav #N] <pantalla anterior> → <pantalla nueva> @ <timestamp>` — uno por cada navegación real.
- `[screen] MOUNT <Nombre> @ <timestamp>` / `[screen] UNMOUNT <Nombre> @ ...` — solo para las 9
  pantallas de la tabla de arriba.
- `[sync-download] ...` — todo el ciclo de "Descargar todo"/"Sincronizar ahora" cuando se dispara.
- `[sync] ...` (el resto del logging de subida, ya existente, ahora gateado).

Con eso alcanza para responder: ¿en qué número de navegación aparece la pantalla en blanco?
¿la pantalla afectada llegó a montar (`MOUNT` aparece) o el crash pasa antes de eso? ¿el servidor
mandó los animales en la descarga (`entidades por tipo` los muestra) y qué pasó con cada uno
(`resultado por tabla`)?

## Causa raíz REAL, confirmada 2026-09-23: el stack interno del tab `admin/Ranch` nunca se reinicia

El fix de `OptionsSheetModal` (arriba) ayudó pero no alcanzó — Marvin reprodujo el blanco de nuevo:
la primera vez que entra a un formulario de Reproducción funciona, pero al volver y entrar a la
OTRA opción del mismo popup, vuelve a salir blanco. Esa es la pista clave: el problema no es la
PRIMERA navegación, es lo que pasa al **volver y volver a entrar**.

### Intento 1 (revertido): `router.dismissTo()`

Los 11 formularios accedidos desde `RegistrosMenu` (`AddAnimal`, los 4 de breeding, los 3 de
health, `FeedRecordForm`, `WeightRecordForm`, `MovimientosMenu`) comparten el mismo `handleBack()`:
```ts
if (from === 'registros') {
    router.replace('/views/(tabs)/admin/Registros/RegistrosMenu' as any);
} else {
    router.back();
}
```
La hipótesis inicial: `router.replace()` no "vuelve" a la instancia de `RegistrosMenu` que ya
existía, crea una nueva y deja la vieja huérfana — así que se probó `router.dismissTo(...)` (API
nueva de Expo Router, "cerrá pantallas hasta encontrar esta ruta; si no está, hacé replace"). **Se
revirtió de inmediato**: rompió el botón de volver por completo (dejaba de navegar, sin error
visible). Causa: `admin/Registros/RegistrosMenu` y `admin/Ranch` (donde viven estos formularios)
son **dos `Tabs.Screen` hermanos e independientes** dentro del `<Tabs>` de `(tabs)/_layout.tsx`
(confirmado leyendo `(tabs)/_layout.tsx` — cada uno tiene su propio Stack interno, no comparten
uno). `dismissTo`/`POP_TO` **solo puede cerrar pantallas dentro del mismo stack** — cruzar de un
tab a otro con esa acción no encuentra el destino, y en un build de producción esa acción no
manejada simplemente no hace nada (en dev tira un `console.error` de React Navigation, "was not
handled by any navigator", que no llegó a verse). Revertido a `router.replace(...)` en los 11
archivos, y se sacó el `dismissTo` que se le había agregado a `useSafeRouter()`.

### Causa raíz real: `admin/Ranch` conserva su historial interno entre visitas al tab

Como `admin/Ranch` es su propio tab (no un Stack anidado dentro de otro), React Navigation por
default **conserva el estado de su Stack interno cada vez que se sale y se vuelve a entrar** — es
el comportamiento esperado de cualquier `Tabs` (volver a una pestaña debería mostrar dónde la
dejaste). El problema es que estos formularios se **empujan** (`router.push`) sobre ese stack cada
vez, así que cada ida y vuelta Registros→formulario→Registros→otro formulario deja el formulario
anterior todavía apilado debajo del nuevo, sin haberse limpiado nunca. El stack interno de ese tab
crece sin límite con el uso normal. Bajo New Architecture, ese stack cada vez más profundo es
exactamente el escenario que hace que `react-native-screens` falle en pintar la pantalla nueva —
sin tirar ninguna excepción de JS (coincide con que ni el error-logger ni el error-boundary
agregados antes capturaran nada).

**Fix real, aplicado en `(tabs)/_layout.tsx`**: `popToTopOnBlur: true` en las `options` del
`Tabs.Screen` de `admin/Ranch` — opción oficial y documentada de `@react-navigation/bottom-tabs`
("Whether any nested stack should be popped to top when navigating away from the tab. Defaults to
false"). Con esto, cada vez que se sale del tab `admin/Ranch` (por ejemplo al volver a Registros),
su stack interno se reinicia a la raíz solo — la próxima vez que se entra, arranca limpio, sin
arrastrar formularios de visitas anteriores. No se tocó `handleBack()` de ningún formulario — sigue
usando `router.replace(...)` como desde agosto, eso nunca fue el problema real.

Pero **esto tampoco alcanzó solo** — Marvin lo probó: la primera entrada a `breeding` (cualquier
formulario) funciona, la segunda (a cualquier OTRO formulario de `breeding`, en la misma visita al
tab) vuelve a salir en blanco, con `MOUNT` disparando normal y sin ningún error capturado.

### Por qué `popToTopOnBlur` no alcanzaba: no cascadea a stacks anidados más adentro

Leí la implementación real de `popToTopOnBlur` en `node_modules/@react-navigation/bottom-tabs`
(`views/BottomTabView.js`), no la documentación nomás:

```js
if (prevRoute?.state?.type === 'stack' && ...) {
    navigation.dispatch({ ...StackActions.popToTop(), target: prevRoute.state.key });
}
```

Esto resetea **únicamente el stack inmediato del tab** (`admin/Ranch/_layout.tsx`). Pero
`admin/Ranch/breeding/` y `admin/Ranch/Animals/` tenían **su propio `_layout.tsx`** — un Stack
anidado DENTRO del Stack de Ranch — mientras que `admin/Ranch/health/` y
`admin/Ranch/movements/` son carpetas planas, registradas directo en `admin/Ranch/_layout.tsx`
(por eso `health`/`movements`/`Pesajes` nunca mostraron este bug: no tienen ningún stack anidado
que `popToTopOnBlur` no pueda alcanzar). Cuando el stack de Ranch se resetea a su tope, "breeding"
vuelve a quedar como la pantalla activa — pero el stack PROPIO de `breeding` (con el historial de
GestationDiagnosisForm de la visita anterior todavía adentro) nunca se toca, porque
`popToTopOnBlur` no cascadea a navegadores anidados más profundo que el nivel inmediato del tab. La
próxima pantalla que se empuja (`BreedingServiceForm`) se apila sobre ese historial que nunca se
limpió — mismo bug de acumulación de antes, un nivel más adentro de donde se había aplicado el fix.

**Fix real, estructural**: se sacó el nivel extra de anidamiento. `breeding/_layout.tsx` y
`Animals/_layout.tsx` se borraron, y sus pantallas (`BreedingServiceForm`,
`GestationDiagnosisForm`, `ParturitionForm`, `WeaningForm`, `AnimalMenu`, `AddAnimal`,
`DetailAnimal`) se registraron como `Stack.Screen` directas en `admin/Ranch/_layout.tsx` — mismo
patrón que ya usaban `health/`/`movements/`, que nunca tuvieron este problema. Con esto,
`popToTopOnBlur` alcanza a TODAS las pantallas del módulo Ranch por igual, sin ningún nivel
adicional de anidamiento donde el historial pueda quedar atrapado.

## Hallazgo de routeo (ya resuelto arriba — dejado como referencia histórica)

`admin/Ranch/breeding/` y `admin/Ranch/Animals/` tenían cada una su propio `_layout.tsx` (Stack
anidado), mientras que `admin/Ranch/health/` y `admin/Ranch/movements/` eran carpetas planas
registradas directo en `admin/Ranch/_layout.tsx`. Esa diferencia estructural terminó siendo
justo la causa real (ver sección de arriba) — no una simple observación de "más superficie de
choque" como se pensaba en un primer momento. Ya no aplica: las 3 carpetas quedaron aplanadas
(`breeding/`, `Animals/`, y ya lo estaban `health/`/`movements/`) directamente bajo
`admin/Ranch/_layout.tsx`.

## Causa raíz CONFIRMADA 2026-09-23: `OptionsSheetModal` navega mientras el modal todavía se está cerrando

Repro mínimo y 100% confiable que dio Marvin: Registros → Reproducción (abre el sheet) → tocar
cualquiera de las dos opciones → pantalla en blanco. Cubre también Partos y Sanidad, que usan el
mismo componente (`RegistrosMenu.tsx` es el único lugar que usa `OptionsSheetModal`).

Causa: `components/common/OptionsSheetModal.tsx::handleSelect()` llamaba `onClose()` (cierra el
`<Modal>` nativo) y `option.onSelect()` (hace `router.push(...)`) **sincrónicamente, en el mismo
tick** — sin esperar a que la animación/transición de cierre del `<Modal>` termine. El `<Modal>`
de React Native crea su propia ventana/view nativa separada; navegar (lo que hace que
`react-native-screens` presente una pantalla nueva) mientras esa ventana todavía está en medio de
su cierre es una carrera conocida que, bajo New Architecture, puede dejar la pantalla nueva sin
pintarse — sin tirar ninguna excepción de JS, consistente con que ni el error-logger ni el
error-boundary agregados antes capturaran nada.

**Fix aplicado, intento 1 (revertido)**: `handleSelect()` diferido con
`InteractionManager.runAfterInteractions(...)`. Se probó y **el blanco siguió apareciendo** —
además, apareció en consola `WARN InteractionManager has been deprecated and will be removed in a
future release`. React Native deprecó esta API; bajo el runtime Bridgeless de esta SDK no parece
estar esperando lo que debería (posiblemente se resuelve casi de inmediato en vez de esperar a que
la animación del modal termine, o no se integra bien con el scheduler nuevo).

**Fix aplicado, intento 2 (actual)**: reemplazado por un `setTimeout(..., 350)` simple —
`MODAL_CLOSE_ANIMATION_MS` en `OptionsSheetModal.tsx`. Menos elegante, pero no depende de ninguna
API deprecada ni de un scheduler cuyo comportamiento bajo Bridgeless no está claro — solo espera un
tiempo fijo, mayor al de la animación `fade` del modal, antes de navegar.

**Pendiente de confirmar**: que esto efectivamente resuelva el bug al probarlo. Si el blanco
persiste incluso después de este fix, el siguiente sospechoso sería el mismo patrón en algún otro
lugar de la app que cierre un modal/overlay e inmediatamente navegue (buscar otros
`onClose(); ...algo que navegue...` sin diferir) — o que el problema de fondo no sea el timing del
modal en absoluto, sino algo más genérico de `react-native-screens` bajo New Architecture que
ningún ajuste de timing del lado de la app puede resolver del todo.

## Experimento aplicado 2026-09-23: `freezeOnBlur: false`

Con el manejador global de excepciones y el `ErrorBoundary` puestos, se confirmó que el bug de
pantalla en blanco **no tira ningún error de JS** — `MOUNT` de la pantalla afectada se loguea
normal, sin que ni el error-logger ni el error-boundary capturen nada. Esto descarta un crash de
render y apunta a un fallo silencioso en la capa nativa: `react-native-screens`, bajo New
Architecture, por default (`freezeOnBlur: true`) "congela" el render de las pantallas que pierden
foco para ahorrar memoria — hay issues documentados (ver investigación previa en el historial de
esta sesión) donde esa pantalla congelada no se "descongela" bien al volver a enfocarse y queda en
blanco, sin ningún error visible para JS.

Se puso `freezeOnBlur: false` en los 3 Stacks anidados que llevan a las pantallas afectadas:
`app/views/(tabs)/admin/Ranch/_layout.tsx`, `.../Ranch/breeding/_layout.tsx`,
`.../Ranch/Animals/_layout.tsx`. Cambio de una línea por archivo, fácil de revertir si no cambia
nada. **Sin confirmar todavía si resuelve el bug** — pendiente que Marvin lo prueba de nuevo.

**Pendiente real, no resuelto por este experimento**: conseguir el log nativo (adb logcat en
Android o consola de Xcode en iOS) la próxima vez que se reproduzca, corriendo un dev client o
build real (no Expo Go) contra un emulador/dispositivo. Es la única evidencia que puede confirmar
la causa exacta del lado nativo en vez de seguir infiriendo desde el comportamiento de JS.

## Para sacarlos el día que ya no hagan falta

Buscar `useScreenLifecycleLog(` y `NavigationLogger` para las 9 pantallas + el listener global; el
resto de `devLog(` en `sync.ts` puede quedarse tal cual (es diagnóstico de sync permanente, ya
gateado, no hace ruido en producción) o revertirse a `console.log` si en algún momento se decide
que ya no vale la pena mantenerlo como diagnóstico continuo.
