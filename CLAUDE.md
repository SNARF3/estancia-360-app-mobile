# CLAUDE.md — Estancia360 (móvil)

Sistema de gestión ganadera offline-first para bovinos.
Stack: React Native + Expo Router + TypeScript | SQLite local (`expo-sqlite`) | Backend NestJS + PostgreSQL (repo `estancia-360-app`, ver su propio `CLAUDE.md` — es la fuente de verdad de contratos de API y schema).

> Última reescritura completa: 2026-08-05, tras un reajuste grande para alinear el móvil con el
> backend real (Movimientos había quedado apuntando a tablas que el backend ya no tenía). Si estás
> retomando este proyecto en una sesión nueva, este archivo debería reflejar el estado real del
> código — si encontrás que algo acá no coincide con lo que ves en el repo, el código manda; por
> favor corregí este archivo de paso.

---

## 🧭 Notas operativas para Claude — leer antes de tocar nada (agregado 2026-08-10)

Lecciones de esta sesión que no son obvias mirando solo el código — guardarlas acá para no volver
a perder tiempo redescubriéndolas:

1. **El repo backend está en `/Users/marvinmolloramirez/Estancia360/backend/estancia-360-app`, y el
   checkout local está DESACTUALIZADO.** El branch local `test` puede estar meses atrás de
   `origin/test` (confirmado 2026-08-10: local en `ca8bd6c` de enero, `origin/test` en `68b078b` de
   mayo — 23 commits de diferencia). `main`/`prod` locales están todavía más atrás. **Siempre hacer
   `git fetch origin` y mirar `origin/test`** antes de asumir qué soporta o no el backend — mirar
   solo el checkout local puede dar una respuesta directamente incorrecta sobre DTOs/entidades/
   endpoints reales. No hay `CLAUDE.md` en ese repo todavía; lo más cercano es
   `docs/mobile-guide-engorde.md` (en `origin/test`).

2. **Antes de construir un módulo nuevo que toque una tabla existente, revisar el DTO/entity real
   del backend primero** (no asumir que el schema local SQLite es la fuente de verdad — puede estar
   desalineado, como pasó con Movimientos antes de la reescritura de 2026-08-05). Ejemplo reciente:
   `feed_records` no tiene `id_ranch_animal` en ningún lado y el backend documenta explícitamente en
   sus controllers que ciertos tipos de registro NO generan `animal_event` — ese tipo de detalle solo
   se encuentra leyendo el controller/DTO real, no infiriendo del nombre de la tabla.

3. **Gotcha real de SQLite, no específico de este proyecto pero costó una sesión entera encontrarlo**:
   `ALTER TABLE x RENAME TO y` no solo renombra `x` — también reescribe el texto de
   `FOREIGN KEY ... REFERENCES x(...)` en TODAS las demás tablas que referencian `x`, para que pasen
   a decir `REFERENCES y(...)`. Si después se borra `y` y se crea una `x` nueva (patrón típico de
   "rename→recreate→copy→drop" para cambiar una constraint que SQLite no permite alterar in-place),
   esas tablas dependientes quedan con un FK apuntando a un nombre que ya no existe — y explota recién
   en el próximo INSERT/UPDATE a esas tablas, no en la migración misma. Ver `migrations.ts` migración
   v4 (`fixDanglingEventFk`) para el patrón correcto: reconstruir bajo un nombre TEMPORAL primero,
   nunca reusar el nombre que otras tablas referencian, hasta el renombrado final.

3b. **Segundo gotcha de SQLite relacionado, encontrado recién 2026-08-17 (no en el mismo momento
    que el de arriba — costó otra sesión aparte)**: cualquier migración que haga
    `RENAME`/`CREATE`/`INSERT`/`DROP` sobre una tabla referenciada por FK desde otras tablas
    necesita `PRAGMA foreign_keys=OFF` ANTES de arrancar (doc oficial: "Making Other Kinds Of Table
    Schema Changes") — si no, SQLite puede rechazar la operación con "FOREIGN KEY constraint
    failed" en pleno RENAME/INSERT. Y ojo: `PRAGMA foreign_keys` es no-op si se cambia DENTRO de una
    transacción activa, así que el toggle tiene que envolver el `withTransactionAsync` desde
    AFUERA, nunca ir adentro del `up()` de una migración individual. Ver `runMigrations()` en
    `migrations.ts` para el patrón ya aplicado (envuelve TODO el loop de migraciones pendientes,
    no cada una por separado). Este bug no había aparecido en el simulador de iOS — recién se vio
    en un Android físico, primera vez que ese código corrió ahí.

4. **Si un error no aparece en la terminal de Metro, no asumir que el código no corrió** — puede ser
   simplemente que el `catch` de esa pantalla nunca hace `console.error`, solo setea el mensaje en la
   UI (pasó en `use-WeightRecord.ts`, ver sección Migraciones de schema local). Antes de instrumentar
   con logs nuevos, revisar primero si los `catch` existentes están silenciados.

5. **Cuando un módulo se prueba y "no pasa nada" (sin error, sin confirmación)**, sospechar primero
   de un `handleSave` que navega hacia atrás inmediatamente después de guardar sin mostrar ningún
   `Alert` — no necesariamente un fallo real de guardado. Pasó con `FeedRecordForm.tsx` recién creado
   (le faltaba el mismo `Alert.alert('Registrado', ...)` que ya tienen Vacunación/Tratamiento).

6. **El usuario/desarrollador es Marvin (`snarfeo@gmail.com`, GitHub `SNARF3`) — no "Jaime".** Este
   archivo tenía muchas referencias viejas a "Jaime" como si fuera un tercero (cliente/probador)
   distinto del desarrollador; corregido 2026-08-10 a pedido explícito de Marvin. Si en una sesión
   futura aparece de nuevo el nombre "Jaime" en algún lado, es casi seguro un error a corregir, no un
   dato real — Marvin es quien desarrolla Y quien prueba la app.

7. **Nunca asumir el `API_PREFIX` real de un backend en Render sin verificarlo con `curl`** — los
   dos backends deployados (producción y test) tienen prefijos DISTINTOS (`/api/estancia-360` vs
   `/api`, ver sección Variables de entorno), y `/api/docs` (Swagger) responde 200 en ambos sin
   importar cuál sea el prefijo real porque vive en un path hardcodeado aparte — no sirve para
   inferir nada. Verificar siempre contra un endpoint público real de negocio (ej.
   `/subscription-plans`, sin auth) con `curl -o /dev/null -w "%{http_code}\n" <url>`.

---

## ⚠️ Estado de verificación interactiva

**Confirmado 2026-08-05 en simulador de iOS (`npx expo start` → tecla `i`)**: el arranque completo
de la app funciona — `initDatabase()` corre entero sin colgarse (`[db] opening... → opened → WAL
set → foreign_keys set → synchronous set → running DDL (39 statements) → DDL done → fresh install
→ seed done`) y la pantalla de bienvenida renderiza correctamente (logo, textos, botones Iniciar
Sesión/Registrarse). Esto es la primera verificación interactiva real del repo — antes de esto todo
lo marcado como "reciente" en este archivo estaba solo compilado (`tsc --noEmit` limpio), nunca
corrido. A partir de acá, Marvin puede seguir probando el resto del flujo (login, Movimientos
rediseñado, recuperar contraseña, etc.) directamente en el simulador.

**Bug de web — confirmado que es EXCLUSIVO de la versión web, no afecta nativo**: la app se cuelga
en pantalla "Inicializando..." al correr en navegador (`npx expo start --web`) — el cuelgue está
adentro de `SQLite.openDatabaseAsync()` en el build web de `expo-sqlite` (arquitectura basada en
Web Worker + wa-sqlite/WASM + OPFS). Confirmado 2026-08-05 en el simulador de iOS que el mismo
código de `initDatabase()` corre perfecto en nativo — el problema es 100% infraestructura
específica del navegador (headers COOP/COEP, worker de WASM), no un bug del código de la app. Dado
que el simulador ya funciona para testear, **web puede tratarse como no-prioritario** — no vale la
pena seguir invirtiendo en diagnosticarlo salvo que en algún momento se decida soportar web como
target real.

Progreso de la investigación (2026-08-05):
1. **Causa real #1, arreglada**: `PRAGMA journal_mode = WAL` colgaba indefinidamente en web (WAL
   necesita acceso a archivo compartido, no soportado por el backend WASM/OPFS) — gateado con
   `Platform.OS !== 'web'` en `database.ts`.
2. **Causa probable #2, identificada pero NO confirmada en vivo** (retomada esta sesión, investigación
   de código + fuentes externas, sin poder testear interactivamente): `expo-sqlite` web es "alpha,
   puede ser inestable" (doc oficial de Expo) y necesita `SharedArrayBuffer` disponible en el hilo
   principal Y en el Worker, lo cual requiere que el **documento HTML raíz** (`/`, no solo el bundle
   JS o el worker) tenga los headers `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` — la
   spec es explícita en esto ("must be set on the HTML document response — not on sub-resources") y
   varios issues idénticos en `github.com/expo/expo` (#36392, #38481, #39903) reportan exactamente
   este síntoma (`SharedArrayBuffer is not defined` o cuelgue silencioso), en más de un caso con la
   observación explícita de que el bundle/worker sí traían los headers pero la respuesta raíz `/` no.
   `metro.config.js` ya intenta setear esos headers vía `enhanceMiddleware` (patrón correcto en
   teoría — envuelve TODA la cadena de middleware, debería aplicar a `/` también) pero no hay forma
   de confirmar sin un test en navegador real si el dev server de Expo realmente lo respeta para la
   petición raíz.
3. **Diagnóstico agregado** (`hooks/db.sqlite/DbProvider.tsx`, no resuelve el bug pero lo hace
   visible): en web, chequea `globalThis.crossOriginIsolated` al montar — si es `false`, es
   prácticamente confirmación de la causa #2. Además, `getDb()` ahora tiene un timeout de 20s: un
   cuelgue silencioso pasa de "spinner infinito, cero errores" a un mensaje de error accionable en
   pantalla. **Este es el primer lugar a mirar la próxima vez que se pruebe en web** — si el mensaje
   de error menciona `crossOriginIsolated`, la causa #2 queda confirmada y hay que investigar por qué
   el dev server no está aplicando los headers a `/` (posibles próximos pasos: inspeccionar
   `Response Headers` de la petición raíz en devtools; probar un build estático real en vez de
   `expo start --web`, que sirve distinto).

**`.env` actual apunta a `localhost`** (`EXPO_PUBLIC_API_URL=http://localhost:3001/api`) — se
cambió así para poder testear contra el backend local durante esta sesión de debugging. **Revertir
a la URL de producción/Render antes de buildear para un dispositivo real** que no sea la misma
máquina que corre el backend local (ver `eas.json`, que sí tiene las URLs correctas por perfil —
solo el `.env` de dev quedó apuntando a localhost).

### Bug de arranque — loop infinito de remounts con sesión iniciada (resuelto 2026-08-08)

**Síntoma**: con una sesión ya logueada guardada en el dispositivo, la app quedaba parpadeando
indefinidamente en la pantalla de carga al abrir — nunca llegaba a Management. Pasaba en Expo Go
(iPhone físico) y muy probablemente también en simulador; no tiraba ningún error en consola, solo
loggeaba los pasos de `initDatabase()` avanzando de a poco entre parpadeos. **No** era el bug de
`breedingFormStyles.ts` (ver Convenciones abajo) — ese era un bug real pero distinto y menor, ya
arreglado antes de encontrar este.

**Causa raíz**: en `app/_layout.tsx`, el `useEffect` que decide la ruta inicial (login guardado →
`router.replace()` a Management/WorkerManagement/Inicio) vivía en `RootLayout` mismo, FUERA de
`<DbProvider>`. `DbProvider` no renderiza a ninguno de sus hijos — incluido el `<Stack>`, el
navegador real — hasta que `initDatabase()` termina. Eso significa que ese `router.replace()` se
disparaba antes de que existiera ningún navegador montado. Expo Router no lo tolera bien: el árbol
se reinicia, el efecto se vuelve a disparar, vuelve a pegarle a un navegador que sigue sin existir,
y así indefinidamente — un loop 100% autosostenido en JS (una sola carga de bundle, confirmado con
logs de diagnóstico: `RootLayout`/`DbProvider` remontando en pares una y otra vez, sin ninguna línea
de rebundling de Metro de por medio).

Por qué nadie lo había visto antes: con la DB vacía (instalación limpia, sin sesión) el init es
casi instantáneo — la ventana de carrera es minúscula y rara vez se dispara. Con sesión iniciada Y
datos reales cargados (`existingTables N`, más DDL/migraciones que correr), el init tarda lo
suficiente como para que la ventana de carrera se dispare siempre. La verificación de
"arranca bien" del 2026-08-05 (ver arriba) fue con una instalación limpia sin login — nunca
ejercitó este camino.

**Se descartaron primero, con evidencia, dos hipótesis que NO eran la causa** (dejar registrado
para no volver a perder tiempo ahí): `experiments.reactCompiler` en `app.json` (desactivarlo no
cambió nada) y `experiments.typedRoutes` (desactivarlo tampoco, confirmado además que
`.expo/types/router.d.ts` dejó de regenerarse y el loop siguió igual). Tampoco era un problema de
red/Expo Go — confirmado con `expo start` en modo LAN, sin túnel. Se actualizaron de paso
`expo`/`expo-router`/`expo-file-system`/`expo-font` a las versiones esperadas por el SDK instalado
(`npx expo install --fix`) porque el CLI avisaba desfasaje, pero tampoco era la causa.

**Fix**: la lógica de navegación se movió a un componente nuevo, `AuthGate`, renderizado DENTRO de
`<DbProvider>` (junto al `<Stack>`) en vez de en `RootLayout` directamente — así su `useEffect` solo
puede correr una vez que el `Stack` ya está montado, sin excepción. De paso, `app/index.tsx` dejó de
hacer su propio `<Redirect>` incondicional a Inicio (competía con `AuthGate` como segunda fuente de
navegación) — ahora solo `AuthGate` decide la ruta inicial.

**Regla para no repetirlo**: cualquier `useEffect` que llame `router.replace()`/`router.push()` al
montar tiene que vivir en un componente que esté garantizado a montar DESPUÉS de que el `<Stack>`
raíz ya exista — es decir, adentro de `<DbProvider>`, nunca en `RootLayout` directamente ni en
ningún componente hermano/ancestro de `DbProvider`.

---

## Arquitectura General

```
app/views/
  auth/               ← Inicio, Login, Register(Role), RegisterRanch, VerificationCodeEmail, ChangePassword
  (tabs)/
    admin/
      management/     ← Home (Management.tsx) — 4 accesos en grilla
      Ranch/
        Animals/      ← Inventario (AnimalMenu, AddAnimal, DetailAnimal)
        Pastures/     ← Potreros y Lotes (PasturesMenu, LotDetail)
        breeding/     ← Cría (BreedingServiceForm, GestationDiagnosisForm, ParturitionForm, WeaningForm)
        rearing/      ← Recría (WeightRecordForm)
        health/       ← Sanidad (VaccinationForm, TreatmentForm, HealthIncidentForm — 3 pantallas
                         independientes, no un formulario unificado, ver nota en "Menú principal")
        movements/    ← Movimientos (MovimientosMenu, Purchase/Sale/Transfer/RanchExitForm,
                         AnimalExitForm, PendingSalesScreen)
        feeding/      ← Alimentación (FeedRecordForm — un solo formulario, por lote, ver nota abajo)
      Registros/      ← RegistrosMenu (accesos a cargas masivas por módulo)
      bulkImport/     ← Wizards de importación Excel (uno por módulo, ver sección propia)
      sync/           ← SyncScreen (upload + download + resolución de conflictos)
      weights/        ← WeightsScreen (resumen de todos los pesajes cargados, por animal y por lote)
    worker/           ← Flujo del rol Worker (QR, WorkerManagement)
    users/            ← Perfil

hooks/
  auth/               ← use-Auth (SecureStore), use-LogoutWithSync (gate de logout: sync
                         forzado + wipe de SQLite), use-UserLoginLogic, use-UserRegisterLogic,
                         use-RegisterRanch, use-UserVerificationCode, use-UserChangePassword
  config/api.ts        ← ÚNICA fuente de EXPO_PUBLIC_API_URL (usada por axios y por sync.ts)
  db.sqlite/
    database.ts        ← DDL baseline + catálogos seed + constantes (EVENT_TYPES, PRODUCTIVE_STATUSES,
                          ANIMAL_STATUSES, ANIMAL_CLASSES, BREED_SEEDS) + initDatabase()
    migrations.ts       ← Framework de migraciones versionadas (PRAGMA user_version) — ver sección propia
    db-pool.ts          ← Singleton getDb()
    db-utils.ts
    repositories/
      animals.ts        ← CRUD de animales + helpers (hasActiveWithdrawal, setAnimalObservation, etc.)
      events.ts          ← TODOS los registros de eventos (Cría, Recría, Engorde, Sanidad, Movimientos)
    sync.ts              ← syncAll(), downloadFromServer(), applyConflictResolutions(), getPendingCount()
  breeding/ · rearing/ · health/  ← un hook de formulario por entidad
  movements/            ← use-AnimalPurchase, use-AnimalSale, use-AnimalTransfer, use-AnimalRanchExit,
                          use-AnimalExit (baja), use-PendingSales (confirmar/rechazar/cancelar venta)
  feeding/              ← use-FeedRecord, use-LotFeedHistory (alimentación por lote)
  subscriptions/        ← use-Subscription (lee + cachea el plan), use-CapacityGuard (bloquea alta
                          local si el cache sugiere que se pasaría del límite — ver sección propia)
  Animals/
    online/             ← código MUERTO, cero imports en todo el repo (confirmado 2026-08-20) — el
                          alta de animal real es 100% offline, ver offline/use-AnimalRegister.ts.
                          No confundir con un flujo "online" real que no existe
    offline/            ← lectura/escritura SQLite local + los hooks use-BulkImport*
  Ranch/use-Pastures.ts

components/
  navigation/BottomTabBar.tsx
  common/AnimalPickerModal.tsx · AnimalMultiPickerModal.tsx · LotSelectorModal.tsx
  common/SyncLoadingOverlay.tsx · DownloadLoadingOverlay.tsx · ConflictResolutionModal.tsx
  common/DateSelector.tsx
  layout/ScreenContainer.tsx · UserHeader.tsx
```

---

## Menú principal (Management.tsx)

4 accesos (array `TILES` en el propio archivo — corregido 2026-08-09, la versión anterior de esta
sección describía accesos que ya no existen como tiles de nivel superior):
1. **Mis Animales** → `Ranch/Animals/AnimalMenu`
2. **Registrar Datos** → `Registros/RegistrosMenu` (cargas masivas por módulo, ver sección Cargas Masivas)
3. **Potreros y Lotes** → `Ranch/Pastures/PasturesMenu`
4. **Pesos** → `weights/WeightsScreen`

Cría, Recría y Sanidad son acciones de un animal individual — el menú contextual de 3 puntos que
vivía en `AnimalMenu` (con acceso directo por animal) **se eliminó** (ver nota fechada abajo); hoy se
accede exclusivamente desde `Registros/RegistrosMenu`, donde el animal se busca con
`AnimalPickerModal` dentro de cada formulario. **Movimientos** tiene su propio menú
(`Ranch/movements/MovimientosMenu`), no vive dentro de AnimalMenu porque opera sobre grupos de
animales, no sobre uno solo — también se accede desde `Registros/RegistrosMenu`.
**Gestión de Colaboradores** (listar/quitar, agregado 2026-09-21 — ver sección propia "Módulo
Colaborador") vive en Perfil (`users/usuario.tsx`, botón visible solo para el Owner), no es un tile
de `Management.tsx`.

**Limpieza 2026-08-09 (segunda pasada)**: se eliminó el menú contextual de 3 puntos de `AnimalMenu`
(quedaba redundante con `RegistrosMenu`, que ya cubre las mismas 12 acciones). Los submenús
"Reproducción"/"Partos"/"Sanidad" de `RegistrosMenu` usaban `Alert.alert` nativo — se reemplazaron
por `components/common/OptionsSheetModal.tsx`, un popup propio de la app (tarjeta centrada, fade, no
bottom-sheet) con ícono por opción (dos íconos nuevos en `AppIcons.tsx`: `DiagnosisIcon`,
`BirthIcon`). **Sanidad** originalmente se unificó en un solo `SaludForm.tsx` con un selector interno
de tipo (Vacunación/Tratamiento/Incidente) — se detectó un bug real: el `healthType` inicial se
fijaba una sola vez vía `useState`, así que si React Navigation reusaba la instancia de pantalla
(elegís Vacunación, volvés, elegís Tratamiento) quedaba trabado en la primera elección. Se revirtió
a **3 pantallas independientes** (`VaccinationForm`, `TreatmentForm`, `HealthIncidentForm`, cada una
con su propia ruta y el mismo patrón de reset-por-`animalCode` que ya usan `BreedingServiceForm`/etc.)
— cada opción del popup de Sanidad navega a su propia ruta con `?from=registros`, sin parámetro
`type` (ya no hace falta).

**Limpieza 2026-08-09**: se borraron 8 pantallas de este árbol que quedaron sin ningún
`router.push`/`Link` real apuntando a ellas — nunca tuvieron un punto de entrada, esta misma sección
ya documentaba que Cría/Recría/Engorde/Sanidad se acceden "solo desde AnimalMenu", así que sus
menús propios (`RanchMenu`, `breeding/BreedingMenu`, `rearing/RearingMenu`, `health/HealthMenu`) eran
código muerto de origen. Borrado junto con ellos: todo `fattening/` (menú + 2 formularios — el único
módulo enteramente inalcanzable, ninguno de sus 3 archivos tenía otro camino de entrada) y
`breeding/RearingSelectionForm.tsx` (solo alcanzable desde el `RearingMenu` borrado). Se limpiaron
también los hooks/funciones que quedaban exclusivamente huérfanos por esa borrada
(`hooks/breeding/use-RearingSelection.ts`, `hooks/fattening/` completo, `registerFatteningEntry`/
`registerFeedRecord`/`registerRearingSelection` en `events.ts` — esta última ya estaba huérfana antes
de esta limpieza, `RearingSelectionForm` hacía el INSERT a mano por SQL directo en vez de llamarla) y
`useGetRearingSelections` en `use-AnimalHistory.ts` (sin caller; `useAnimalFullHistory`, que sí se
usa desde `DetailAnimal.tsx`, trae esos mismos datos con su propia query inline).

### Tutorial de bienvenida (spotlight)

Agregado 2026-08-09, extendido el mismo día para incluir el bottom tab bar. Un solo tour continuo
de 8 pasos: los 4 tiles de arriba primero, después los 4 íconos del tab bar (Mi Estancia, Registros,
Sync, Perfil), sin cortes — un solo flag de "ya visto", un solo botón de ayuda que lo relanza
completo. Construido a medida con `Modal` + `View.measureInWindow()` + `Animated` de React Native —
mismo patrón que `SyncLoadingOverlay`/`ConflictResolutionModal` (`components/common/`), sin agregar
ninguna librería de onboarding de terceros (se evaluaron `rn-tourguide` y
`@wrack/react-native-tour-guide`, descartadas por compatibilidad no confirmada con Expo SDK 54/New
Architecture y por evitar una dependencia externa en un flujo que debe "no fallar").

- `hooks/onboarding/use-Tutorial.ts` — hook `useTutorial(flag, steps)`: maneja refs propias por
  paso, medición de posición (con reintentos), avance de pasos y persistencia. Cada `TutorialStep`
  puede traer un `resolveRef` en vez de usar la ref propia del hook — es lo que permite que el tour
  resalte elementos que no son hijos de quien arma el tour (el tab bar es un hermano de
  `Management.tsx` en el árbol, no un hijo).
- `hooks/onboarding/tutorialTargets.ts` — registro compartido (`registerTutorialTarget`/
  `getTutorialTarget`) donde `BottomTabBar.tsx` expone la ref de cada uno de sus botones
  (`tabbar_<nombre>`) para que `Management.tsx` los pueda referenciar sin acoplamiento directo.
- `components/onboarding/TutorialOverlay.tsx` — el overlay visual (recorte animado con easing +
  crossfade del tooltip entre pasos, para que el cambio de un target a otro se sienta fluido en vez
  de saltar de golpe).
- Se muestra automáticamente una sola vez, controlado por el flag `onboarding_<flag>_seen` en
  AsyncStorage (hoy `onboarding_admin_management_seen`) — mismo storage no-sensible que usa
  `use-Auth.ts`. Se puede volver a ver manualmente desde dos lugares: el ícono de ayuda (`?`) en el
  header de `Management.tsx`, o el botón "Ver tutorial" en Perfil (`users/usuario.tsx`) — este
  último navega a Management con `?startTutorial=1` y `Management.tsx` lo consume para relanzar el
  tour aunque la pantalla ya estuviera montada (los tabs no se desmontan al cambiar de pestaña).
- Solo implementado para el rol admin — el flujo de Worker no tiene tutorial todavía.

---

## Navegación y Layout

### Expo Router — registro de rutas en `(tabs)/_layout.tsx`

Solo se registran los **hijos directos** del segmento `(tabs)`. Carpetas con `_layout.tsx` propio
(`admin/Ranch`, `worker`) aparecen como segmento; archivos sueltos en carpetas sin `_layout.tsx`
(`admin/sync/SyncScreen`, `admin/bulkImport/BulkImportAnimals`, etc.) se registran completos.
**Nunca registrar rutas profundas de `Ranch/` acá** — van en `Ranch/_layout.tsx`.

Bug histórico ya corregido: `BulkImportTreatments`, `BulkImportIncidents`, `BulkImportGestation` y
`BulkImportMovements` existían como archivo pero no estaban registrados en `_layout.tsx` — si
agregás una pantalla nueva de bulk import, **no te olvides este paso**, es fácil de saltear.

### Back buttons — regla crítica

Pantallas "raíz de módulo" usan `router.replace(...)`, nunca `router.back()` desnudo (evita
acumulación de instancias en el Stack):

| Pantalla | Back destino |
|---|---|
| AnimalMenu, PasturesMenu, MovimientosMenu, RegistrosMenu | `router.replace('/views/(tabs)/admin/management/Management')` |

Formularios dentro de cada módulo pueden usar `router.back()` (su origen inmediato es el menú del
módulo). Auth tiene sus propios back buttons explícitos, ver sección Auth.

### BottomTabBar — ocultar barra

Se oculta cuando el `pathname` contiene: `/admin/Ranch/Animals`, `/admin/Ranch/breeding`,
`/admin/Ranch/rearing`, `/admin/Ranch/fattening`, `/admin/Ranch/health`, `/admin/Ranch/feeding`,
`/admin/Ranch/movements`, `/admin/Ranch/Pastures`.

### Animaciones de transición

Dos capas distintas, cada una con su propia config — **no alcanza con tocar una sola** si se quiere
consistencia en toda la app:

- **Dentro de un mismo módulo** (menú → formulario → volver, ej. todo lo de `Ranch/`): lo gobierna
  `@react-navigation/native-stack` vía `screenOptions` de `Ranch/_layout.tsx` —
  `animation: 'slide_from_right'`, `animationDuration: 300`. **`breeding/` y `Animals/` ya NO
  tienen su propio `_layout.tsx`** (se aplanaron 2026-09-23, ver "Bug de pantalla en blanco" más
  abajo) — sus pantallas son `Stack.Screen` directas de `Ranch/_layout.tsx`, igual que
  `health/`/`movements/`.
- **Entre pestañas** (Management ↔ Ranch, Management ↔ Registros, Management ↔ Pesos, y los
  `router.replace(...)` de "volver al inicio" desde cada menú raíz — ver sección Back buttons): esto
  NO es push de Stack, es cambio de rama del `Tabs` raíz (`app/views/(tabs)/_layout.tsx`), gobernado
  por `@react-navigation/bottom-tabs` — `screenOptions={{ animation: 'shift' }}` en ese mismo
  `_layout.tsx`. `bottom-tabs` v7 solo soporta `'fade'`/`'shift'` (no un slide completo como
  `native-stack`), pero anima simétrico en ambas direcciones sin configuración extra.

Si agregás una pantalla nueva que cruce de una rama de `Tabs` a otra (cualquier navegación entre
`admin/management`, `admin/Ranch`, `admin/Registros`, `admin/weights`, `admin/sync`, `users`), ya
queda cubierta por la config del `Tabs` raíz — no hace falta nada por pantalla.

### Bug de pantalla en blanco tras varias navegaciones — resuelto 2026-09-23 (ver `docs/dev-logging.md`)

**Síntoma**: entrar a un formulario, volver, entrar a otro — anduvo bien las primeras veces y
después, de forma consistente, la pantalla se quedaba en blanco (sin ningún error de JS — ni
`console.error`, ni el `ErrorBoundary`/manejador global agregados para investigar esto capturaban
nada). Reproducible también en un build real de EAS, no solo en dev. Un dato clave que terminó de
cerrar el diagnóstico: al entrar a una pantalla nueva, a veces se veía brevemente el **contenido de
la pantalla anterior** antes de cambiar al correcto — contenido nativo reciclado sin limpiar.

Se encontraron y corrigieron **tres bugs reales de navegación de esta app** en el camino (quedan
documentados en detalle en `docs/dev-logging.md`, sección de logs de diagnóstico):
1. `OptionsSheetModal.tsx` navegaba (`router.push`) en el mismo tick que cerraba su `<Modal>` — se
   corrigió diferir la navegación con un `setTimeout` (se probó primero
   `InteractionManager.runAfterInteractions`, resultó estar deprecado y no resolvía nada bajo el
   runtime Bridgeless de esta SDK).
2. Los ~11 formularios accedidos desde `RegistrosMenu` volvían con `router.replace(...)` en vez de
   `router.back()` (fix real de 2026-08-09 para un problema de esa época) — eso está bien, no se
   tocó.
3. **`breeding/` y `Animals/` tenían su propio `_layout.tsx` anidado** dentro del Stack de
   `Ranch/_layout.tsx` — `popToTopOnBlur` (ver más abajo) solo resetea el stack inmediato del tab,
   no cascadea a un stack anidado más adentro, así que esas dos carpetas acumulaban historial sin
   límite entre visitas mientras que `health/`/`movements/` (planas) nunca tuvieron el problema. Se
   aplanaron para que quedaran como `Stack.Screen` directas de `Ranch/_layout.tsx`.

Ninguno de los tres, por separado ni juntos, resolvió el síntoma de fondo — el patrón "3
navegaciones limpias, la 4ta en blanco" se mantuvo idéntico incluso con los tres corregidos y
verificados (con `MOUNT`/`UNMOUNT` disparando correctamente en los logs). **La causa real vivía en
el motor de reciclado/pooling de vistas nativas de `react-native-screens` bajo New Architecture**,
no en esta app.

**Fix real**: `enableScreens(false)` (de `react-native-screens`) llamado en `app/_layout.tsx`,
antes de que monte cualquier navegador. Apaga la optimización nativa de `react-native-screens` por
completo — React Navigation vuelve a su render con `View`s normales (sin pooling de vistas
nativas). **Confirmado por Marvin que esto resuelve el bug del todo.** Contrapartida conocida y
aceptada: las transiciones entre pantallas pierden la optimización nativa (se ven un poco menos
fluidas), pero funcionan correctamente. Si en una sesión futura se actualiza
`react-native-screens`/RN y se quiere reintentar con la optimización nativa prendida, sacar esa
línea es el único paso — nada más de la app depende de que esté apagada.

Además, `popToTopOnBlur: true` quedó en el `Tabs.Screen` de `admin/Ranch`
(`app/views/(tabs)/_layout.tsx`) — reinicia el stack interno de ese tab cada vez que se navega a
otro, para que una próxima entrada no arrastre historial de la visita anterior. Sigue siendo
correcto tenerlo puesto aunque `enableScreens(false)` ya resuelva el síntoma visible, porque evita
que el stack de ese tab crezca sin límite con el uso normal de la app (relevante para memoria en
sesiones largas, más allá de este bug puntual).

---

## Sesión y Autenticación

- Credenciales de sync (email+password para re-login silencioso) guardadas en **`expo-secure-store`**
  (`hooks/auth/use-Auth.ts`, clave `sync_credentials`) — antes vivían en `AsyncStorage` en texto
  plano, migrado esta sesión.
- **Cerrar sesión ahora fuerza sync + borra SQLite (2026-09-22)** — cambio de comportamiento real,
  no solo un fix. Antes `logout()` limpiaba AsyncStorage/SecureStore pero **no tocaba la DB SQLite
  de negocio** ("los datos productivos ya cargados quedan"); eso es justo lo que se cambió, como
  mitigación al hallazgo QA de que un dispositivo compartido entre dos cuentas/estancias podía
  terminar subiendo, en el próximo sync de la segunda cuenta, los pendientes sin sincronizar que
  dejó la primera (las queries `WHERE is_synced=0` de `sync.ts` no filtran por `id_ranch` — ver
  detalle más abajo).
  - **`hooks/auth/use-LogoutWithSync.ts`** (nuevo) es el único punto de entrada real a "cerrar
    sesión" — usado por los 3 botones de logout que existen en la app (`usuario.tsx`,
    `Management.tsx`, `SyncScreen.tsx`; antes cada uno reimplementaba su propio `Alert.alert` +
    `logout()` + `router.replace`, ahora comparten esta lógica). Al confirmar, corre `syncAll()`
    (con `SyncLoadingOverlay`, reutilizado del patrón ya usado en `SyncScreen.tsx`) — **si no
    termina en éxito (sin conexión, error de servidor, límite de plan, lo que sea), NO se cierra
    sesión**, se muestra el motivo real y el usuario se queda logueado. Sin excepción para "sin
    conexión" — es intencional (decisión explícita de Marvin): bloquear es preferible a permitir un
    logout que deje datos sin sincronizar en un dispositivo que después usa otra cuenta.
  - Solo si `syncAll()` confirma éxito se llama `logout()` (`hooks/auth/use-Auth.ts`), que ahora
    además de limpiar AsyncStorage/SecureStore llama `wipeLocalRanchData()` (`hooks/db.sqlite/
    sync.ts`) — `DELETE FROM` cada tabla de `ALL_TABLES` (todas las tablas transaccionales de la
    estancia, ya exportado, mismo set que usa `getPendingCount()`) + `local_session`. **No** toca
    catálogos (`animal_breeds`/`animal_classes`/`animal_statuses`) — son globales, no dependen de
    sesión, no hay nada que "filtrar" ahí.
  - **Nunca llamar `logout()` directo** en un flujo nuevo sin pasar primero por
    `useLogoutWithSync()` — se pierden datos sin sincronizar, el guard está en el hook, no en
    `logout()` mismo (que confía en que quien lo llama ya validó el sync).
  - Contrapartida necesaria para que esto no rompa la experiencia: `use-UserLoginLogic.ts` ahora
    dispara `downloadFromServer(ranch.id, { fullSync: true })` automático tras un login exitoso con
    estancia (no bloquea el login si falla) — sin esto, cada re-login tras un logout dejaría
    Management vacío hasta que alguien entre a Sync a mano. Ni el login ni `RegisterRanch.tsx`
    disparaban esto antes; login real solo ocurre primera vez / tras logout / reinstalación, así que
    siempre es seguro traer todo de nuevo.
  - **Limitación transicional conocida, no resuelta a propósito** (alcance acordado con Marvin):
    las 15+ queries `WHERE is_synced=0` que arman los 5 `syncX()` en `sync.ts` no filtran por
    `id_ranch` — cada tabla tiene una relación distinta con la estancia (columna directa en
    `ranch_pastures`/`ranch_animals`/`movements`, o 1-2 saltos de JOIN vía lote/animal/evento en el
    resto), así que filtrarlas bien es un cambio bastante más grande que este. Como cada logout
    ahora deja SQLite completamente limpio, la ventana de riesgo real queda acotada a **una sola
    vez por dispositivo**: el primer logout con este código nuevo en un dispositivo que YA tenía
    mezcla de estancias sin sincronizar de antes. Después de esa vez no puede volver a pasar.
- Sin sesión → `router.replace('/views/auth/Inicio')`.
- **Flujo**: Inicio → Login → Management (o Worker).
- **Back buttons**: Login→Inicio, RegisterRole→Inicio, Register→RegisterRole,
  RegisterRanch→Register, VerificationCodeEmail→Login, ChangePassword→Login.

### Registro de estancia nueva — orden crítico del flujo (bug real, 2026-09-04)

`RegisterRanch.tsx::handleFinalRegister` encadena 3 llamadas: crear usuario (`POST auth/register`,
NO devuelve `accessToken` — el registro no loguea), login explícito (`POST auth/login`, el único
paso que sí da un token), y crear la estancia (`POST ranches`, requiere JWT). **El orden entre estos
tres pasos importa** — un intento anterior de arreglar "`saveSession()` guardaba `accessToken=''`"
agregó el login, pero lo dejó DESPUÉS de `registerRanch()` en vez de antes, así que la llamada a
`/ranches` seguía saliendo sin token válido (`401 INVALID_TOKEN` — el interceptor de axios en
`db.connection.ts` manda lo que haya en `AsyncStorage['access_token']` en ese momento, que todavía
era nada o de una sesión vieja). El registro de usuario SÍ completaba bien (se veía "Usuario
creado: N" en el log) porque ese paso no requiere auth — el 401 pegaba recién en el paso siguiente.

**Orden correcto, ya aplicado**: Paso 1 registrar usuario → Paso 2 login (y
`AsyncStorage.setItem('access_token', ...)` ahí mismo, ANTES de la siguiente llamada, para que el
interceptor la use) → Paso 3 registrar estancia → `saveSession()`. Si se vuelve a tocar este flujo,
cualquier llamada autenticada tiene que ir DESPUÉS de que el token esté persistido, nunca antes.

### `saveSession()` tragaba fallos de AsyncStorage — no bloqueaba la navegación (bug real, 2026-09-06)

Encontrado tras el fix de arriba: Marvin reportó que, en un registro, algo falló guardando en
AsyncStorage pero la app igual navegó a Management (y el tutorial de bienvenida nunca apareció).
Causa: `saveSession()` (`hooks/auth/use-Auth.ts`) envolvía su `AsyncStorage.multiSet(...)` en un
try/catch que solo hacía `console.error` y NO relanzaba — la función resolvía normal aunque el
guardado hubiera fallado. Los 3 llamadores (`RegisterRanch.tsx`, `use-UserLoginLogic.ts`,
`QrScannerRanch.tsx`) ya tenían su propio try/catch externo esperando que un fallo acá se
propagara para no navegar — pero como nunca tiraba, esos catch nunca se disparaban. Fix: el catch
de AsyncStorage en `saveSession()` ahora relanza (`throw err`) — con ese único cambio,
`RegisterRanch.tsx` y `use-UserLoginLogic.ts` quedaron arreglados sin tocarles nada más (su
estructura de try/catch ya era correcta).

`QrScannerRanch.tsx` necesitó además su propio fix: tenía un try/catch LOCAL alrededor de
`saveSession()` que también tragaba el error (y encima saltaba el guardado en silencio si
`accessToken`/`ranch.id` venían vacíos) — y en cualquiera de esos casos seguía mostrando
"¡Vinculación Exitosa!" y navegando. Como la vinculación en el servidor (`POST ranch-users`) ya se
hizo en ese punto y no tiene sentido deshacerla, el fix no es "no navegar" sino: solo mostrar el
éxito y navegar si `saveSession()` realmente se completó (`sessionRefreshed` boolean); si no, un
mensaje distinto ("te uniste pero no se pudo actualizar tu sesión local, cerrá sesión y volvé a
entrar") y quedarse en la pantalla de escaneo.

**Bug relacionado, mismo síntoma en el tutorial**: `hooks/onboarding/use-Tutorial.ts` chequea el
flag de "ya visto" con `AsyncStorage.getItem(...).catch(() => {})` — un fallo de LECTURA (mismo
problema de AsyncStorage) se trataba exactamente igual que "ya visto", así que el tutorial no
aparecía nunca, sin ningún error visible. Cambiado a fail-open: si falla la lectura, loguea y
programa mostrarlo igual (mostrarlo de más una vez es mucho menos costoso que no mostrarlo nunca).
Además, `RegisterRanch.tsx` ahora navega con `?startTutorial=1` (mismo mecanismo que el botón "Ver
tutorial" de Perfil) para no depender únicamente del chequeo automático en segundo plano.

### Recuperar contraseña (reescrito 2026-08-05)

Backend reemplazó el viejo `/auth/2AF` (mandaba el código Y lo devolvía en la misma respuesta HTTP
— cero verificación real) por dos endpoints: `POST /auth/forgot-password` y
`POST /auth/reset-password`. Flujo móvil:

1. `VerificationCodeEmail.tsx` — pide el email, llama `useUserVerificationCode().requestVerificationCode(email)`
   → `POST auth/forgot-password`. El backend siempre responde el mismo mensaje genérico (no filtra
   si el email existe) y manda el código por email si corresponde.
2. El usuario ingresa el código de 6 dígitos en el modal. `validateVerificationCode()` **solo valida
   el formato** (regex `/^\d{6}$/`) — no hay endpoint para "solo verificar" el código por separado.
   Si el formato es válido, navega a `ChangePassword` pasando `{ email, code }` como params.
3. `ChangePassword.tsx` — pide la nueva contraseña, llama
   `useUserChangePassword().changePassword(email, code)` → `POST auth/reset-password` con
   `{ email, code, password }`. **Acá es donde el backend realmente verifica** el código contra el
   hash guardado (`users.reset_code_hash`, vence a los 15min) y recién ahí aplica la contraseña.

Si tocás este flujo, los 4 archivos relevantes son `hooks/auth/use-UserVerificationCode.ts`,
`hooks/auth/use-UserChangePassword.ts`, `app/views/auth/VerificationCodeEmail.tsx`,
`app/views/auth/ChangePassword.tsx`.

`PUT /auth/change-password` (distinto endpoint, requiere JWT + `currentPassword`) es para cambiar
la contraseña estando logueado — no lo usa este flujo de recuperación.

---

## Offline-First

- Toda escritura va a SQLite con `is_synced = 0`, `sync_action` en `'INSERT'|'UPDATE'|'DELETE'`.
- `syncAll()` (`hooks/db.sqlite/sync.ts`) sube todo lo pendiente; `downloadFromServer()` baja
  cambios del servidor (incremental por `since`/cursor) y puede generar conflictos, resueltos vía
  `ConflictResolutionModal` + `applyConflictResolutions()`.
- `getPendingCount()` cuenta registros sin sincronizar (badge en `SyncScreen`).
- `SyncLoadingOverlay`/`DownloadLoadingOverlay` bloquean la UI durante cada operación (no se pueden
  descartar).
- IDs locales: UUID v4 (TEXT). `server_id` se llena tras sync exitosa.

## Migraciones de schema local (`hooks/db.sqlite/migrations.ts`)

Antes de esta sesión `initDatabase()` solo hacía `CREATE TABLE IF NOT EXISTS` — sin versionado, sin
forma de evolucionar el schema de un dispositivo con datos ya cargados. Ahora:

- `PRAGMA user_version` trackea la versión del schema local.
- `MIGRATIONS: Migration[]` en `migrations.ts` — cada entrada `{ version, up(db) }`.
- `initDatabase()` (en `database.ts`): si la DB es nueva (sin tablas), corre el DDL baseline
  completo y setea `user_version` a `LATEST_SCHEMA_VERSION` directo (instalación limpia, no corre
  las migraciones una por una). Si la DB ya existe con una versión vieja, corre `runMigrations(db)`
  — cada migración pendiente, en orden, dentro de una transacción.
- **Migración v1** (la primera bajo este sistema, y la más grande): dropea las tablas viejas de
  Movimientos (`animal_purchases`, `animal_sales`, `animal_transfers`), crea `movements` +
  `movement_animals`, corrige el catálogo de razas y de clases (Toro→Torillo), dropea `sync_queue`
  (tabla muerta).
- Si agregás una tabla o columna nueva al schema local, **agregá una migración nueva acá**, no
  edites el DDL baseline directamente (eso solo cubre instalaciones limpias).

**Bug real, investigado 2026-08-09 — "no such table: main.animal_events_old" al guardar un pesaje**:
la migración v2 (rename→recreate→copy→drop de `animal_events`/`feed_records` para volver `id_user`
nullable) solo chequeaba `columnIsNotNull(tabla, 'id_user')` para decidir si ya había corrido. Si un
dispositivo llegó a cortarse a mitad de esa migración ANTES de que existiera este chequeo (ej. app
recargada en medio de la corrida), quedaba en un estado a medias — típicamente `animal_events`
inexistente y `animal_events_old` viva con el schema viejo. En ese estado, `PRAGMA
table_info(animal_events)` devuelve 0 filas, el guard lee "no NOT NULL" (falso por default) como
"ya migrado" y saltea la migración PARA SIEMPRE — el dispositivo queda sin `animal_events` de forma
permanente, y cualquier escritura futura (ej. un pesaje) revienta. Pasó en un celular físico (Expo
Go) distinto al simulador donde se había verificado el fix anterior — cada dispositivo tiene su
propio archivo SQLite local, así que un fix idempotente-pero-basado-en-una-sola-columna no cubría
todos los estados posibles en los que un dispositivo ya roto podía haber quedado.

Primer fix (necesario pero INSUFICIENTE, dejado igual): `finishNullableIdUserMigration()` en
`migrations.ts` reemplaza el chequeo de una sola columna por un chequeo de existencia real de AMBAS
tablas (`tabla` y `tabla_old`) y resume la migración desde cualquier punto a medias — incluye
`INSERT OR IGNORE` para tolerar que la copia ya se haya hecho antes de un corte previo. Además se
agregaron logs (`[migrations] v2 ...`, `[db-pool] getDb: ...`, `[events] createEvent falló...`) y un
`console.error` real en `use-WeightRecord.ts` (antes el catch de `saveRecord` solo seteaba el
mensaje en la UI, nunca lo mandaba a consola — por eso no aparecía nada en la terminal de Metro pese
a que el error sí se mostraba en pantalla).

**Causa raíz REAL, encontrada con logs en vivo probando en el simulador (2026-08-09, mismo día)**:
el fix de arriba no alcanzó — el error seguía saliendo igual, y los logs mostraron que ni siquiera
pasaba por `runMigrations` (`[db-pool] getDb: devolviendo instancia cacheada`, migraciones ya habían
corrido bien antes en esa sesión). El problema real es un efecto colateral de SQLite, no de la
lógica de idempotencia: `ALTER TABLE animal_events RENAME TO animal_events_old` (el primer paso de
la migración v2) no solo renombra esa tabla — SQLite además **reescribe automáticamente el texto de
FOREIGN KEY de CUALQUIER OTRA tabla que referencie `animal_events`** para que pase a decir
`animal_events_old` (así la referencia sigue "válida" apuntando adonde sea que esa tabla vive
ahora). La migración v2 después crea una `animal_events` nueva (vacía) y borra `animal_events_old`
— pero el texto de FK ya reescrito en las **11 tablas que referencian `animal_events(id)`**
(`weight_records`, `breeding_services`, `gestation_diagnoses`, `parturitions`, `weanings`,
`rearing_selections`, `fattening_entries`, `animal_exits`, `vaccinations`, `treatments`,
`health_incidents`) queda para siempre apuntando a un nombre que ya no existe. Con
`PRAGMA foreign_keys = ON` (activo en esta app), cualquier INSERT/UPDATE futuro a esas 11 tablas
dispara la validación de FK, que intenta resolver `animal_events_old` y revienta con "no such
table" — pasa en **todo dispositivo que haya corrido la migración v2 alguna vez**, corra limpia o a
medias; no tiene nada que ver con idempotencia. Explica por qué el guardado del `animal_event` en sí
(`createEvent`, instrumentado con try/catch) nunca tiraba el error — el INSERT que realmente falla
es el siguiente, a la tabla de detalle (`weight_records` en el caso de un pesaje).

Fix real: **migración v4**, `fixDanglingEventFk()` en `migrations.ts`. Reconstruye cada una de las
11 tablas bajo un nombre TEMPORAL primero (nunca "animal_events", que es el nombre que SQLite
reescribe en cascada), copia los datos (`INSERT OR IGNORE`, resumible), borra la tabla vieja
corrupta, y recién ahí renombra la temporal al nombre final — como nada referencia el nombre
temporal, ese renombrado no dispara ninguna reescritura en cascada y el FK queda apuntando
correctamente a `animal_events` para siempre. **No agrega ninguna tabla ni columna nueva** al schema
— mismas 11 tablas, mismas columnas de siempre, solo se corrige el texto de FK interno que SQLite
había corrompido. Detecta si ya está corrupta mirando `sqlite_master.sql` directo (busca el string
`animal_events_old` en la definición); si no lo encuentra, no-op.

Confirmado en vivo en el celular de Marvin (2026-08-09): con los logs de la v2 y v4 corriendo, el
guardado de un pesaje pasó por `weight_records` — la tabla exacta que este fix repara. Pendiente:
que Marvin reintente el pesaje con la migración v4 aplicada y confirme que ya no explota.

**Tercera vuelta de este mismo bug, ahora en Android — "FOREIGN KEY constraint failed" en migración
v2 (2026-08-17)**: un Android físico (no probado hasta ahora — todo lo anterior se validó en
simulador de iOS) quedó bloqueado en `user_version=1` con la migración v2 fallando con "FOREIGN KEY
constraint failed" (no "no such table" esta vez — un fallo distinto, más temprano en la secuencia).
Causa: la migración v2 hace `RENAME`/`CREATE`/`INSERT`/`DROP` sobre `animal_events`, que es
referenciada por FK desde las mismas 11 tablas de arriba. SQLite documenta que este tipo de cirugía
de schema con FKs de por medio **requiere `PRAGMA foreign_keys=OFF` antes de tocar nada** ("Making
Other Kinds Of Table Schema Changes" en la doc oficial) — acá nunca se desactivaba, quedaba `ON`
desde que se abre la conexión (`database.ts`) durante toda la corrida de migraciones. En iOS no
había explotado (posible diferencia de versión de SQLite empaquetada), en este Android sí. Sin
pérdida de datos: la transacción de la migración se revirtió sola, el dispositivo quedó intacto en
`user_version=1`.

Complicación extra: `PRAGMA foreign_keys` es no-op si se cambia DENTRO de una transacción activa
(documentado por SQLite) — como `runMigrations()` envuelve cada migración en
`db.withTransactionAsync`, el toggle no puede ir adentro de ninguna migración individual, tiene que
envolver el loop completo desde afuera.

Fix: `runMigrations()` ahora hace `PRAGMA foreign_keys = OFF` antes de arrancar el loop de
migraciones pendientes y `PRAGMA foreign_keys = ON` en un `finally` al terminar (cubre v2 y v4 de
una sola vez, sin tocar el cuerpo de ninguna migración — la regla de "nunca editar una migración ya
publicada" se respeta). Se agregó además un `PRAGMA foreign_key_check` después de migrar, con
`console.warn` si encuentra algo — para detectar datos realmente huérfanos (no solo el texto de FK
que ya arregla la v4) sin que revienten silenciosamente más adelante en un INSERT cualquiera.
**Sin confirmar todavía en el Android donde se reportó** — próxima sesión: pedirle a Marvin que
reintente abrir la app ahí y revisar los logs `[migrations] v2 ...`/`[migrations] v4 ...` en
logcat/Metro.

---

## Módulo Movimientos — rediseño completo (2026-08-04/05)

**Por qué se rediseñó**: el backend usa un modelo batch-first (`movements` + `movement_animals`,
ver CLAUDE.md raíz decisión #19) desde hace tiempo — un movimiento agrupa N animales con cabecera
compartida (comprador, precio, fecha). El móvil tenía 3 tablas viejas (`animal_purchases`,
`animal_sales`, `animal_transfers`, una operación = un animal, sin agrupación) que apuntaban a
endpoints que el backend ya no tenía — cualquier sync de Movimientos fallaba con 400.

**Schema local** (`database.ts`, creado por la migración v1):
```sql
movements(id, server_id, id_ranch, movement_type, status, movement_date,
          counterpart_name, origin_name, total_price, price_per_kg, notes,
          created_at, updated_at, is_synced, sync_action, synced_at)
  -- movement_type: sale|purchase|pasture_transfer|ranch_exit
  -- status: pending|confirmed|cancelled

movement_animals(id, server_id, id_movement, id_ranch_animal, id_lot_origin, id_lot_dest,
                  prev_id_status, status, id_event, notes,
                  new_code, new_sex, new_id_breed, new_id_animal_class, new_birthdate,
                  new_weight, new_id_lot, new_id_productive_status,
                  created_at, updated_at, is_synced, sync_action, synced_at)
  -- status: pending|confirmed|accepted|rejected
  -- columnas new_* solo se usan en purchase (el animal no existe hasta confirmar)
```
`animal_exits` (bajas: muerte/descarte/pérdida) se mantiene igual que siempre — es 1:1 con
`animal_events`, no es batch, matchea el backend sin cambios.

**Repositorio** (`hooks/db.sqlite/repositories/events.ts`):
- `registerMovement(input: CreateMovementInput)` — reemplaza los viejos
  `registerSale/registerPurchase/registerTransfer`. Un movimiento + N animales en una transacción.
  Efecto local optimista según `movement_type` (mismo mapeo que el backend, ver CLAUDE.md raíz
  "Transiciones ps"): `purchase` crea el animal localmente y confirma directo; `sale` deja el
  animal en `PENDIENTE_MOVIMIENTO` y el `movement_animal` en `pending`; `pasture_transfer` mueve el
  lote y confirma directo; `ranch_exit` marca `VENDIDO`+`BAJA` y confirma directo.
- `confirmMovementAnimal(idMovementAnimal, id_user, status, notes?)` — acepta/rechaza UN animal de
  una venta pendiente. `accepted` → vendido+baja (irreversible). `rejected` → revierte a
  `prev_id_status`.
- `cancelMovement(idMovement)` (agregado 2026-08-05) — cancela la venta COMPLETA (todos los
  animales aún `pending` revierten; los ya `accepted` no se tocan, son irreversibles). Equivalente
  local a `PATCH /movements/:id/cancel` del backend. Si el movimiento nunca llegó a sincronizarse,
  se archiva localmente como sincronizado directo (no hay nada que reconciliar con el servidor).

**Pantallas** (`app/views/(tabs)/admin/Ranch/movements/`):
- `MovimientosMenu.tsx` — punto de entrada, stats del mes + accesos a cada tipo.
- `PurchaseForm.tsx` / `SaleForm.tsx` / `TransferForm.tsx` / `RanchExitForm.tsx` — multi-selección
  de animales (`AnimalMultiPickerModal`) + cabecera compartida.
- `AnimalExitForm.tsx` — sigue siendo single-animal (matchea `RegisterAnimalExitDto`, no es batch).
- `PendingSalesScreen.tsx` — lista ventas con animales `pending`; aceptar/rechazar por animal
  (`hooks/movements/use-PendingSales.ts::decide`) y **cancelar la venta completa**
  (`::cancel`, agregado 2026-08-05, botón de tacho en la cabecera de cada card).

**Sync** (`hooks/db.sqlite/sync.ts`): Movimientos NO usa el mecanismo genérico de tabla-a-tabla que
usan Cría/Recría/Engorde/Sanidad — es bespoke porque el backend espera `movements[].data.animals[]`
anidado, no filas planas. Funciones clave: `buildMovementsBatch` (agrupa `movement_animals` por
`id_movement`; **si el movimiento ya estaba sincronizado y solo cambió su `status` — el flujo de
cancelar —, manda el payload mínimo `{ status: 'cancelled' }` como `operation: 'update'`; si es
nuevo, manda el payload completo de creación**), `buildMovementAnimalsBatch` (movement_animals
sueltos que cambiaron DESPUÉS de que su movement padre ya sincronizó — el flujo de
confirmar/rechazar). Ver comentarios en el archivo, son bastante densos — leerlos antes de tocar
esta parte.

---

## Sincronización — Batch API (5 endpoints)

`sync.ts` mapea cada módulo a un endpoint batch. Formato de cada ítem en todos:
```ts
{ localId: string, operation: 'create'|'update'|'delete', serverId?: string|number, data: {...}, happenedAt?: string }
```
FKs no resueltas dentro del mismo batch → `data.localRef_<campo>` en vez de `data.<campo>` (se
resuelve contra el `Map<localId, serverId>` acumulado; si el registro referenciado YA tiene
`server_id` de un sync anterior, se manda el `server_id` directo).

| Endpoint | Payload | Orden interno |
|---|---|---|
| `POST /sync/cria` | `ranchPastures, ranchLots, ranchAnimals, breedingServices, gestationDiagnoses, parturitions, weanings, animalDeclaredHistories` | pastures→lots→animals→...→weanings→history |
| `POST /sync/recria` | `weightRecords, rearingSelections` | weightRecords→rearingSelections |
| `POST /sync/engorde` | `weightRecords, feedRecords, fatteningEntries` | igual orden |
| `POST /sync/sanidad` | `vaccinations, treatments, healthIncidents` | ese orden |
| `POST /sync/movimientos` | `animalExits, movements, movementAnimals` | animalExits→movements→movementAnimals (ver sección Movimientos arriba) |

Todos requieren `idRanch` en el body — el backend lo valida contra la membresía real del usuario
autenticado antes de procesar el batch (agregado 2026-08-05, ver nota de seguridad abajo).

Respuesta: `{ <tabla>: { "local-uuid": "server-id" }, ... }` por tabla — tras aplicarla,
`UPDATE tabla SET is_synced=1, server_id=?, synced_at=? WHERE id=?`.

### Bugs reales de sync encontrados y corregidos (2026-09-23)

Marvin probó por primera vez un sync real de punta a punta contra el backend en vivo con datos que
llevaban semanas guardados localmente sin sincronizar — nunca se había ejercitado este camino antes
(la mayoría de los módulos estaban marcados "sin test interactivo" en este mismo archivo). Salieron
dos bugs reales, ambos en la construcción del payload de subida (`hooks/db.sqlite/sync.ts`), **no
introducidos en esta sesión** — dormidos desde que se escribió este código, recién visibles ahora:

1. **`localRef_idEvent` nunca puede resolver, para CUALQUIER entidad con evento** (Cría:
   `breeding_services`/`gestation_diagnoses`/`parturitions`/`weanings`; Recría: `weight_records`/
   `rearing_selections`; Engorde: `fattening_entries`). En `syncCria`/`syncRecria`/`syncEngorde`
   (mismo código duplicado 3 veces), cuando una tabla "necesita evento" se arma
   `effectiveFkFields = [...fkFields, 'id_ranch_animal']` para poder resolver el animal real vía
   el `LEFT JOIN` a `animal_events` — pero nunca se sacaba `id_event` de esa lista. Como
   `animal_events` no es una tabla que se sincronice como entidad propia (no está en `ALL_TABLES`),
   `id_event` JAMÁS puede resolver contra `serverIdMap` y siempre termina como
   `data.localRef_idEvent` — que el backend rechaza porque ningún ítem del batch tiene ese
   `localId` (nunca lo hay: `animal_events` no viaja como su propia entidad, la fecha va por
   `happenedAt` a nivel de ítem). Fix: `id_event` se saca explícitamente de la lista de FKs a
   resolver (`buildData()`/`toBatchItems()` ahora aceptan un `excludeFields` que descarta el campo
   del todo, en vez de dejar que caiga en la rama de FK no resuelta).
2. **`feed_records` mandaba `happenedAt` y el backend lo rechaza** (`property happenedAt should not
   exist`, 400) — `toBatchItems()` incluía ese campo en TODOS los ítems sin excepción, pero
   `feed_records` es, como ya documentaba este archivo, el único registro que no genera
   `animal_event` — su DTO no lo acepta. Fix: `toBatchItems()` ahora recibe un flag
   `includeHappenedAt` (`false` solo para `feed_records`).

**Causa CONFIRMADA (no solo hipótesis) de un tercer síntoma reportado el mismo día**: la lista de
animales quedaba siempre vacía aunque "Descargar todo" reportara éxito (`ranch_animals: {"updated":
173}`). Un diagnóstico agregado en `use-GetListAnimals.ts` (`SELECT id_ranch, typeof(id_ranch), ...
GROUP BY`) mostró la causa real sin ambigüedad: `id_ranch` (columna `TEXT` en el schema local)
quedaba guardado como `"1.0"` en vez de `"1"`. `upsertEntity()`/`applyConflictResolutions()`
(`sync.ts`) pasaban el `idRanch` del servidor sin convertir — un número JS crudo bindeado con
afinidad `REAL` en SQLite, cuyo cast automático a texto de la columna produce `"1.0"` — mientras que
el resto de la app siempre arma ese mismo valor con `params.id_ranch.toString()` (JS, da `"1"`).
Nunca vuelven a coincidir, así que cualquier `WHERE id_ranch = ?` (el filtro de
`use-GetListAnimals.ts` incluido) no encuentra nada, aunque la fila exista perfecta. **Fix**:
`normalizeValue(key, v)` en `sync.ts` ahora fuerza `idRanch` a `String(v)` explícito — cubre
cualquier tabla con `id_ranch`, no solo `ranch_animals` (ej. también `movements`). No hace falta
migración: la próxima "Descargar todo" hace `UPDATE` sobre las filas ya existentes (matcheadas por
`server_id`) con el valor corregido, así que se auto-reparan solas. **Confirmado por Marvin que
esto resuelve el listado vacío.**

De paso (no era la causa real, pero es una corrección válida igual y se dejó): la única consulta de
todo el repo que hacía `JOIN` (no `LEFT JOIN`) contra `animal_breeds` en `use-GetListAnimals.ts` se
cambió a `LEFT JOIN` con fallback (`'Raza desconocida'` + el `id_breed` crudo) — un animal no
debería desaparecer del inventario solo por no poder resolver su raza contra el catálogo local.

---

## Cargas Masivas (Excel)

Wizards en `app/views/(tabs)/admin/bulkImport/`, uno por plantilla real en `cargas-masivas/` (raíz
del proyecto, fuera de este repo — son plantillas que Marvin controla/edita, no algo que el móvil
genera). Patrón común: parsear con `xlsx`, resolver códigos de animal/lote/raza contra catálogos
locales, preview con remoción de filas, commit fila-por-fila (o grupo-por-grupo en Movimientos) vía
las funciones de `repositories/events.ts`.

| Wizard | Hook | Plantilla Excel | Nota |
|---|---|---|---|
| `BulkImportAnimals` | `use-BulkImport.ts` | Animales | clases no-reconocidas se mapean a una clase FIJA existente, no se crea una nueva (ver decisión de diseño abajo) |
| `BulkImportWeights` | `use-BulkImportWeights.ts` | Pesajes/Recría | |
| `BulkImportGestation` | `use-BulkImportGestation.ts` | Gestación/Cría | |
| `BulkImportVaccinations` | `use-BulkImportVaccinations.ts` | Sanidad (hoja `Carga_Vacunas`) | realineado 2026-08-05 |
| `BulkImportTreatments` | `use-BulkImportTreatments.ts` | Sanidad (hoja `Carga_Tratamientos`) | realineado 2026-08-05 |
| `BulkImportIncidents` | `use-BulkImportIncidents.ts` | Sanidad (hoja `Carga_Incidentes`) | realineado 2026-08-05 |
| `BulkImportMovements` | `use-BulkImportMovements.ts` | Movimientos (5 hojas, agrupa por `ID_CARGA`) | agregado 2026-08 |

**Los 3 importers de Sanidad se reconciliaron con la plantilla real el 2026-08-05** (estaban
escritos contra un layout de columnas más simple/viejo que no coincide con
`Plantilla_Carga_Masiva_Sanidad_Estancia360.xlsx` actual — el criterio para decidir qué lado
"estaba mal" fue la hoja interna `Mapeo_Backend` de la propia plantilla, que documenta el mapeo
esperado explícitamente; el Excel es la plantilla que controla Marvin, así que el móvil era el que
tenía que ajustarse, no al revés):
- **`BulkImportVaccinations`**: leía columnas fijas `[animalCode, fecha, vacuna, dosis, responsable,
  notas]` que no correspondían a la plantilla real (`ID_CARGA, FECHA, CODIGO_ANIMAL, LOTE_ACTUAL,
  VACUNA_1..4, DOSIS_1..4, RESPONSABLE, NOTAS, ...`) — además de los índices estar corridos, solo
  soportaba 1 vacuna por fila cuando la plantilla permite hasta 4 (`Mapeo_Backend`: "Crear un
  registro por cada VACUNA_N no vacía"). Reescrito: cada fila puede generar hasta 4
  `animal_events`+`vaccinations` (uno por producto), todos compartiendo fecha/animal/responsable/
  notas de la fila.
- **`BulkImportTreatments`**: mismo problema de índices corridos contra la plantilla real
  (`ID_CARGA, FECHA, CODIGO_ANIMAL, LOTE_ACTUAL, ENFERMEDAD_DIAGNOSTICO, MEDICAMENTO, DOSIS,
  DURACION_DIAS, DIAS_RETIRO, FIN_RETIRO, RESPONSABLE, NOTAS, ...`). El cálculo de
  `withdrawal_end_date` ya estaba bien (no se tocó), solo el mapeo de columnas.
- **`BulkImportIncidents`**: índices corridos igual que los otros dos, Y le faltaba el efecto
  secundario de cuarentena que `Mapeo_Backend` documenta explícitamente ("Si TIPO_INCIDENTE =
  quarantine y FECHA_RESUELTO vacía, poner En Observación") — el registro individual
  (`registerHealthIncident` en `events.ts`) sí lo hacía vía `setAnimalObservation()`, pero la carga
  masiva insertaba directo a SQLite sin pasar por ahí. Agregado.

Ningún test interactivo corrido todavía sobre estos 3 — solo `tsc --noEmit` limpio. Probar con una
copia real de `cargas-masivas/Plantilla_Carga_Masiva_Sanidad_Estancia360.xlsx` antes de dar por
buena la reconciliación.

**Registro de rutas**: cada wizard nuevo necesita entrada en `(tabs)/_layout.tsx` (fácil de
olvidar, ver nota en la sección de Navegación) y en `RegistrosMenu.tsx` (`route:` del item
correspondiente en `BULK_ITEMS`).

---

## Módulo Pagos/Suscripciones — límite de animales por plan (2026-08-20)

**No es una pasarela de pago** — el cobro (QR/transferencia) se gestiona 100% por fuera del
sistema, un admin de Estancia360 lo registra a mano desde el panel web. El móvil **solo lee** su
propio estado (`GET /subscriptions/my-ranch/:idRanch`) y hace cumplir localmente el límite de
animales del plan — nada de pantallas de elegir/activar plan ni de pagar, eso vive en la web. Ver
`docs/pagos-suscripciones.md` (contexto completo) y `docs/mobile-guide-pagos.md` (en `origin/test`
del repo backend, no existe localmente en este repo).

**Por qué NO alcanzaba con "manejar el 400 en los 3 puntos de alta" como sugiere el doc del
backend**: ese doc asume que el móvil llama esos endpoints directo, como la web. Acá no — las 3
rutas de alta (alta directa, parto con cría viva, compra vía Movimientos) escriben **siempre**
directo a SQLite local (offline-first real, sin excepción, `hooks/Animals/online/` es código
muerto sin un solo import). El error de capacidad recién se conoce en el próximo `syncAll()`
manual, no al guardar.

**Piezas**:
- `hooks/subscriptions/use-Subscription.ts` — lee `GET /subscriptions/my-ranch/:idRanch` (vía
  `getRequest` de `db.postre-connection/db.connection.ts` — OJO, esa función no tira, devuelve
  `{success:false, error}`), cachea en AsyncStorage (`subscription_cache_<idRanch>`, mismo patrón
  que `use-Auth.ts`) para tener el último estado disponible sin conexión. `getEffectiveCapacity()`
  replica la regla del backend: `expired`/`cancelled` → cae a la capacidad de Free (30) sin
  importar el plan asignado; si no, `plan.capacityMax` (`null` = sin límite).
- **Todo lo visual del plan vive únicamente en Perfil (`users/usuario.tsx`) — nada en
  `Management.tsx`/"Mi Estancia"** (decisión explícita de Marvin 2026-08-20; se había puesto un
  badge ahí también en un primer intento, se sacó). En Perfil hay dos piezas:
  1. Barra de uso dentro de la tarjeta de estancia: "N / capacidad animales" + barra de progreso
     (verde/warning/error según % usado), usando `countActiveAnimals()` — **a propósito NO reusa**
     el `animalCount` que ya mostraba esa pantalla (ese filtra por `id_status = 1`, un campo
     distinto de `id_productive_status`) porque la barra tiene que reflejar EXACTO el mismo conteo
     que usa el guard de capacidad, si no confunde al usuario con dos números distintos.
  2. Banner de alerta arriba de todo el scroll (`limitBanner`) cuando `planHeadcount >= planCapacity`
     — "Alcanzaste el límite de tu plan... Actualizá tu plan o no vas a poder subir más animales."
     Distinto de los avisos `trial`/`expired` de la barra de uso: este banner se dispara por
     CAPACIDAD alcanzada específicamente, no por el estado de la suscripción.
- **`hooks/subscriptions/use-CapacityGuard.ts`** (`assertCapacityAvailable`) — el guard local, se
  llama ANTES de las 3 escrituras offline. Decisión de producto explícita: si el cache sugiere que
  se llegaría/pasaría del límite, **bloquea hasta poder refrescar el estado real** (no es un aviso
  blando que deja continuar) — solo en ese caso toca la red; si hay margen claro, no. Compara contra
  `countActiveAnimals()` (nuevo en `repositories/animals.ts` — replica la regla EXACTA del backend,
  `id_productive_status != 4`, **no** el filtro `id_status != INACTIVO` que usa `getAnimals()`, son
  campos distintos con reglas distintas).
- Wiring en `use-AnimalRegister.ts` (offline), `use-Parturition.ts` (solo si `cria_status==='alive'`,
  matchea la condición del backend), `use-AnimalPurchase.ts` (todo-o-nada sobre
  `formData.animals.length`, igual que el backend).

**Bug de arquitectura preexistente que este feature iba a disparar, arreglado de paso**: en
`syncAll()` (`hooks/db.sqlite/sync.ts`), los 5 módulos de sync corrían secuenciales dentro de un
único `try` — un solo `HTTP 400` (exactamente lo que tira una capacidad excedida) abortaba TODO el
resto del ciclo, dejando recría/engorde/sanidad/movimientos sin siquiera intentarse. Se reestructuró
a un loop con try/catch por módulo (sin tocar la lógica interna de cada `syncX()`). También se
agregó `extractSyncErrorMessage()` (parsea el body de error de `apiFetch()` si es JSON, caso
especial para `SUBSCRIPTION_CAPACITY_EXCEEDED` con mensaje claro) y `SyncScreen.tsx` ahora arma el
toast a partir de `result.errors` en vez de asumir siempre "Sin conexión" cuando `synced===0`
(podía ser un rechazo real, no falta de red). **Cero cambios de schema SQLite** — nada de esto
persiste estado nuevo, respeta la restricción explícita del doc.

**Sin test interactivo todavía** — pendiente probar: alta bloqueada por cache desactualizado +
refresh real, compra todo-o-nada, y un rechazo real de sync que no tumbe el resto del ciclo.

---

## Módulo Colaborador (2026-09-21)

Un "Colaborador" es alguien que se registra solo (opción "Encargado" en `RegisterRole.tsx`, ya
existía) y se une a una estancia escaneando un QR generado por el dueño — **sin ningún endpoint de
backend nuevo**. Confirmado contra el spec real de Swagger (prod y test, idénticos) que no existe
ningún grupo de endpoints de "invitación de colaboradores"; esto se construyó combinando dos
mecanismos que ya existían por separado:

- **Alta**: sigue siendo `POST /ranch-users` (`{idUser, idRanch}`, ya usado desde antes por
  `hooks/workers/use-WorkerWithRanch.ts`) — el backend fuerza rol Worker y no valida que quien
  llama sea el dueño, pero encaja perfecto acá porque el colaborador ya tiene su propia cuenta
  (se registró solo) y solo falta linkearlo.
- **Gestión (listar/quitar)**: usa el grupo "Ranch Members" — `GET /ranch-users/ranch/{idRanch}`
  y `DELETE /ranch-users/ranch/{idRanch}/members/{idTargetUser}`. **No** se usa
  `POST /ranch-users/ranch/{idRanch}/members` (ese crea una cuenta nueva con password puesta por
  el admin — no encaja con "el colaborador se registra solo").

**Cifrado del QR**: `hooks/security/qrEncryption.ts`, AES vía `crypto-js` (dependencia nueva) con
una clave estática embebida en el bundle — es ofuscación (evita leer el QR desde una foto), no
seguridad real, ya que el backend tampoco valida nada de esto del lado servidor. El generador
(`app/views/(tabs)/admin/management/QrWorkerGenerator.tsx`, dejó de ser pantalla huérfana) lee los
datos de la estancia de SQLite local (`getSession()`, tabla `local_session`) en vez de hacer un
`GET /ranches/{id}` por red — funciona sin conexión. El scanner (`worker/QrScannerRanch.tsx`)
ahora desencripta y **muestra una tarjeta de confirmación** (nombre de la estancia + botones
Confirmar/Cancelar) antes de llamar a `POST /ranch-users` — antes vinculaba apenas terminaba de
leer el QR, sin ningún paso de confirmación. Tras un vínculo + refresco de sesión exitosos, se
dispara `downloadFromServer({fullSync: true})` antes de navegar (antes el colaborador quedaba
vinculado en el servidor pero con SQLite local vacío de esa estancia).

**Bug de enrutamiento corregido de paso** (afectaba a cualquier usuario sin estancia, no solo a
Colaboradores): `AuthGate` (`app/_layout.tsx`) y `BottomTabBar.tsx` decidían Management vs
WorkerManagement comparando `ranch_role === 2` — pero un usuario recién registrado sin estancia
nunca tenía `ranch_role` seteado (esa rama de `use-UserLoginLogic.ts` guardaba un objeto crudo sin
esa forma), así que cualquier `ranchRole` `undefined` caía en el `else` → Management completo sin
tener estancia. El criterio ahora es **"¿tiene `id_ranch`?"**, no el rol: sin estancia →
`WorkerManagement` (hoy solo ofrece "Unirse a una Estancia"); con estancia (Owner, Administrator,
o un Colaborador ya vinculado) → `Management` completo, sin distinción — no hace falta ninguna
pantalla operativa nueva para el Colaborador, reusa las mismas de Owner. `SessionParams` (`use-
Auth.ts`) tiene ahora `id_ranch`/`ranch_name`/`production_types`/`ranch_role` opcionales para
soportar este estado intermedio, y `saveSession()` saltea el `INSERT` a `local_session` si no hay
`id_ranch` todavía.

**Gating de Colaborador vs Owner** (antes CERO gating por rol a nivel de pantalla/tile en toda la
app): `RegistrosMenu.tsx` filtra el tile "Movimientos" y el bulk-import de Movimientos si
`ranch_role !== 1` (Owner); `MovimientosMenu.tsx` tiene además un guard propio (defensa en
profundidad) que rebota a Management si alguien no-Owner llega ahí igual. La pantalla nueva
`CollaboratorsScreen.tsx` (acceso desde Perfil, botón "Gestión de Colaboradores", **solo visible
si `ranch_role === 1`**) es donde el Owner ve la lista (`hooks/collaborators/use-Collaborators.ts`)
y puede quitar a cualquiera que no sea él mismo.

**De paso, a pedido explícito de Marvin**: se sacó el botón "Borrar datos de prueba" de Perfil
(`usuario.tsx`) — era una utilidad de desarrollo, no una feature de producto.

Archivos nuevos: `hooks/security/qrEncryption.ts`, `hooks/collaborators/use-Collaborators.ts`,
`app/views/(tabs)/admin/management/CollaboratorsScreen.tsx` (registrada en el `_layout.tsx` de
`admin/management/`, fácil de olvidar — mismo gotcha ya documentado para bulk import). Se borró
`hooks/auth/use-RanchData.ts` (quedó sin ningún import real tras mover `QrWorkerGenerator.tsx` a
leer de SQLite en vez de hacer el fetch que ese hook envolvía). Se agregó `deleteRequest()` a
`hooks/db.postre-connection/db.connection.ts` (antes no existía ningún wrapper DELETE en el repo).

**Sin test interactivo todavía** — pendiente el flujo end-to-end completo (registrar Colaborador →
escanear → confirmar → operar en Management sin ver Movimientos → Owner lo ve en Gestión de
Colaboradores → quitarlo) y, en particular, confirmar si el DELETE de "Quitar" funciona para un
Worker (ver ítem 9 de TAREAS PENDIENTES).

---

## Módulos implementados

| Módulo | Estado | Acceso | Archivos clave |
|---|---|---|---|
| Animales | ✅ | Management → Mis Animales | AnimalMenu, AddAnimal, DetailAnimal |
| Cría | ✅ | Registros → Reproducción/Partos (popup) | BreedingServiceForm, GestationDiagnosisForm, ParturitionForm, WeaningForm + hooks |
| Recría | ✅ | Registros → Pesajes | WeightRecordForm |
| Engorde | ❌ Eliminado 2026-08-09 | — | Todo el módulo viejo (`FatteningMenu`, `FatteningEntryForm`, `FeedRecordForm` original) era código muerto sin ningún punto de entrada real — borrado en la limpieza, ver nota en "Menú principal". `fattening_entries` (entrada al sistema de engorde, ps 2→3) sigue sin UI móvil — no confundir con Alimentación de abajo, son tablas distintas |
| Alimentación | ✅ (reconstruido 2026-08-09, sin test interactivo) | Registros → Alimentación (tile directo, sin popup) | `Ranch/feeding/FeedRecordForm.tsx` + `hooks/feeding/use-FeedRecord.ts` + `registerFeedRecord` en `repositories/events.ts`. **Solo por lote** — `feed_records` (local y backend) no tiene `id_ranch_animal` en ningún lado; el backend documenta explícitamente que es el único tipo de registro del sistema que NO genera `animal_event`. Se evaluó agregar una opción "individual" y se descartó (confirmado con Marvin) porque requeriría tocar el schema del backend — fuera de alcance de esta sesión. `registerFeedRecord` por eso NO pasa por `createEvent`, a diferencia de todos los demás módulos. Sync ya estaba resuelto de antes (`ENGORDE_CONFIG`/`FK_RESOLUTION.feed_records`/`FIELD_EXCLUDE.feed_records` en `sync.ts`) — no se tocó `sync.ts`. **Visibilidad del historial** (agregado el mismo día, a pedido explícito): `hooks/feeding/use-LotFeedHistory.ts` (nuevo hook compartido, consulta `feed_records WHERE id_lot = ?`) se usa en DOS lugares — `LotDetail.tsx` (historial propio del lote) y la pestaña "Alim." de `DetailAnimal.tsx` (historial del lote ACTUAL del animal, no un registro propio del animal — se le agregó `id_lot` a `AnimalCurrentLot`/`getAnimalCurrentLot` en `repositories/animals.ts` para poder resolverlo). Dejar claro en la UI que es el historial del lote, no del animal individual, para no generar la falsa expectativa de que existe alimentación por animal |
| Sanidad | ✅ | Registros → Sanidad (popup) | VaccinationForm, TreatmentForm, HealthIncidentForm + hooks |
| Movimientos | ✅ (recién rediseñado, sin test interactivo) | `Ranch/movements/MovimientosMenu` | ver sección propia arriba |
| Potreros | ✅ | Management → Potreros | PasturesMenu, LotDetail, use-Pastures |
| Cargas Masivas | ✅ (Sanidad-Vacunas desalineada, ver nota) | Management → Cargas Masivas → RegistrosMenu | ver sección propia |
| Sincronización | ✅ | Tab bar | SyncScreen, sync.ts |
| Pagos/Suscripciones | ✅ (recién agregado 2026-08-20, sin test interactivo) | Badge en Management, guard local en las 3 altas | ver sección propia arriba — solo lectura + límite de capacidad, sin pantallas de pago |
| Colaborador | ✅ (recién agregado 2026-09-21, sin test interactivo) | Perfil → "Gestión de Colaboradores" (Owner), QR desde ahí → escaneo en `worker/QrScannerRanch` | ver sección propia arriba — "Quitar" depende de confirmar que el DELETE de backend acepta rol Worker |
| Recuperar contraseña | ✅ (recién reescrito, sin test interactivo) | Login → VerificationCodeEmail → ChangePassword | ver sección Auth |
| Reportes | ❌ Pendiente | — | Solo vista básica en WeightsScreen |

---

## Seguridad — qué garantiza hoy el backend

El backend cerró por completo (2026-08-05, en tres pasadas) el chequeo de pertenencia a estancia
(`RanchUsersService.assertMember`) en TODA la superficie de API que este móvil usa: los 5
endpoints `POST /sync/*`, `ranch-animals`/`ranch-lots`/`ranch-pastures`/`movements` (CRUD + GET),
los 24 endpoints `POST/PATCH/DELETE /breeding/*`/`/rearing/*`/`/fattening/*`/`/health/*` (flujo
online), y los 13 controllers `GET :id`/`GET .../animal/:id`/`GET .../lot/:id`/`GET .../by-ranch/:id`
de detalle (vaccinations, treatments, health-incidents, parturitions, weanings,
animal-declared-history, gestation-diagnoses, breeding-services, weight-records,
rearing-selections, feed-records, fattening-entries, animal-exits). Un usuario autenticado ya no
puede leer ni mutar datos de una estancia ajena a través de ningún endpoint que este móvil
consuma, adivinando un ID. Probado con curl contra la DB local en los tres niveles (estancia ajena
real → 403 `RANCH_ACCESS_DENIED`; estancia propia → 200/201 normal). No requirió ningún cambio en
el móvil — todo el chequeo usa el `idUser` que ya viaja en el JWT.

---

## Convenciones

- **Ningún archivo no-ruta dentro de `app/`**: Expo Router (v6.0.23 acá, ver `node_modules/expo-router/build/getRoutesCore.js`)
  escanea TODO `.ts`/`.tsx` bajo `app/` como candidato a ruta, sin excepción por prefijo `_` (esa
  convención NO existe en esta versión — solo se ignoran `+html`, `+native-intent`, `+api`,
  `+middleware`, y el nombre reservado `_layout`). Un archivo sin export default ahí (ej. un
  módulo de estilos compartidos) hace que el router tire `"missing the required default export"`
  en cada arranque — bug real reportado 2026-08-08, la pantalla quedaba parpadeando/pegada en
  "Inicializando...". Todo módulo compartido que no sea una pantalla va en `constants/`, `hooks/`
  o `components/`, nunca dentro de `app/`.
- Estilos de formularios: `import { breedingFormStyles as styles } from '../../../../../../constants/breedingFormStyles'`
  (movido a `constants/` 2026-08-08 por el bug de arriba — antes vivía mal ubicado dentro de `app/`)
- **Navegación al montar (`router.replace`/`router.push` en un `useEffect` de arranque) solo dentro
  de `<DbProvider>`**, nunca en `RootLayout` directamente ni en un ancestro/hermano suyo — `DbProvider`
  no monta sus hijos (ni el `<Stack>`) hasta que la DB está lista, y navegar antes de que el `Stack`
  exista causa un loop de remounts infinito (bug real 2026-08-08, ver sección de arriba y `AuthGate`
  en `app/_layout.tsx`)
- Rutas de módulos Ranch anidados: registrar en `Ranch/_layout.tsx`, nunca en `(tabs)/_layout.tsx`
- Back buttons en pantallas raíz: `router.replace(origen)`, nunca `router.back()` desnudo
- Params a formularios: `useLocalSearchParams<{...}>()` + `useEffect` para pre-llenar
- IDs locales: UUID v4 (TEXT). `server_id` se llena tras sync exitosa
- Toda tabla transaccional tiene: `is_synced`, `server_id`, `sync_action`, `synced_at`, `created_at`, `updated_at`
- Credenciales/tokens sensibles → `expo-secure-store`, nunca `AsyncStorage` (aprendido esta sesión,
  ver `use-Auth.ts`)

---

## Variables de entorno

```
EXPO_PUBLIC_API_URL=<url del backend>/<prefijo>
```
`hooks/config/api.ts` es la única fuente — fallback hardcodeado a la URL de Render de producción si
la env var no está seteada. Configurar en `.env` local o por perfil en `eas.json`.

**⚠️ Los dos backends deployados en Render usan un `API_PREFIX` DISTINTO cada uno — no asumir que
son iguales** (encontrado y corregido 2026-08-20, verificado con `curl` directo, no adivinado):
el prefijo real de NestJS (`app.setGlobalPrefix(cfg.apiPrefix)` en `main.ts` del backend, leído de
la env var `API_PREFIX` de Render — no hay forma de verlo sin pegarle al backend real, `/api/docs`
NO sirve como referencia porque el Swagger vive en un path hardcodeado aparte, `path: 'api/docs'`,
que responde 200 sin importar cuál sea el prefijo real):

| Backend | Dominio | Prefijo real | Confirmado con |
|---|---|---|---|
| Producción | `estancia-360-app.onrender.com` | `/api/estancia-360` | `curl .../api/subscription-plans` → 404; `curl .../api/estancia-360/subscription-plans` → 200 |
| Test/preview | `estancia-360-app-test.onrender.com` | `/api` | `curl .../api/subscription-plans` → 200; `curl .../api/estancia-360/subscription-plans` → 404 |

`.env`, el fallback de `hooks/config/api.ts` y el perfil `production` de `eas.json` ya están
corregidos a `/api/estancia-360`. El perfil `preview` de `eas.json` queda tal cual, con solo
`/api` — **no tocarlo para "unificar" con producción**, son prefijos genuinamente distintos en
cada deploy. Si en algún momento el error es "todo devuelve 404" o "sync/login fallan raro", este
es el primer lugar a revisar — verificar con `curl -o /dev/null -w "%{http_code}\n" <url>` contra
un endpoint público real (`/subscription-plans`, sin auth) en vez de confiar en `/api/docs`.

---

## TAREAS PENDIENTES conocidas (para la próxima sesión)

1. ~~Resolver el cuelgue de SQLite en web~~ — **deprioritizado 2026-08-05**: confirmado que es
   exclusivo de web (ver sección de arriba), el simulador de iOS funciona perfecto. No vale la pena
   seguir invirtiendo tiempo acá salvo que se decida soportar web como target real más adelante.
2. **Testear interactivamente el módulo Movimientos rediseñado** — ahora sí es viable: el arranque
   con sesión iniciada dejó de loopear (ver bug de arranque resuelto 2026-08-08, arriba) y el
   simulador arranca bien. Nunca se completó un test end-to-end real (compra/venta/traslado/salida/
   baja multi-animal, confirmar/rechazar/cancelar venta pendiente, sync).
3. **Testear el flujo de recuperar contraseña** contra el backend real (necesita credenciales SMTP
   configuradas del lado del backend — ver TAREAS PENDIENTES del CLAUDE.md raíz; el envío por SMTP
   ya se confirmó funcionando desde el backend, falta probarlo de punta a punta desde la app).
4. ~~Reconciliar `BulkImportVaccinations` con la plantilla real~~ — **resuelto 2026-08-05**, ver
   sección Cargas Masivas arriba (se extendió a Tratamientos e Incidentes también, mismo problema).
   Falta el test interactivo con la plantilla real.
5. Revertir `.env` a la URL de producción antes de cualquier build/test que no sea contra el backend
   local de esta máquina.
6. **Confirmar que el bug de "no such table: main.animal_events_old" al guardar un pesaje quedó
   resuelto de una vez por todas** — ver sección Migraciones de schema local arriba. Causa raíz real
   encontrada 2026-08-09 (no era idempotencia, era `ALTER TABLE RENAME` de la v2 corrompiendo el FK
   de las 11 tablas que referencian `animal_events`) y arreglada con la migración v4
   (`fixDanglingEventFk`). Pendiente: que Marvin reintente el pesaje con este fix aplicado y confirme
   en la terminal de Metro que ya no explota (buscar logs `[migrations] v4 ...`).
7. **Testear interactivamente el módulo Alimentación** (recién reconstruido 2026-08-09, ver sección
   Módulos implementados) — nunca se probó en simulador/dispositivo real: Registros → Alimentación
   → elegir lote → guardar → confirmar que aparece como pendiente en `SyncScreen` y que sincroniza
   sin error 400 contra `/sync/engorde`.
8. **Confirmar en el Android físico que el "FOREIGN KEY constraint failed" de la migración v2 quedó
   resuelto** — ver sección Migraciones de schema local, entrada del 2026-08-17 (`PRAGMA
   foreign_keys=OFF` alrededor del loop de `runMigrations`). Sin verificar todavía en el dispositivo
   real donde se reportó. Si vuelve a fallar, revisar si aparece un warning de `foreign_key_check`
   en el log — indicaría datos huérfanos reales, no solo el problema de orquestación ya arreglado.
9. ~~Módulo "Colaborador"/"Encargado" — pausado esperando al backend~~ — **implementado
   2026-09-21**, sin depender de ningún endpoint nuevo. Ver sección propia "Módulo Colaborador"
   más abajo para el diseño completo. Pendiente real que queda de esta implementación: confirmar
   en vivo (Marvin, contra el backend de test) que `DELETE
   /ranch-users/ranch/{idRanch}/members/{idTargetUser}` efectivamente da de baja a un colaborador
   con rol Worker — el summary de Swagger de ese endpoint dice "Remove an administrator" y no hay
   forma de saber desde el spec si también acepta Workers; si el backend lo rechaza (403/404), el
   botón "Quitar" de `CollaboratorsScreen.tsx` ya maneja ese caso mostrando un mensaje en vez de
   fallar en silencio (ver `removeCollaborator()` en `hooks/collaborators/use-Collaborators.ts`),
   pero no hay manera real de sacar a alguien hasta que se confirme o se resuelva del lado backend.
