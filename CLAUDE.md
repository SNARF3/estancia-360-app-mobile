# CLAUDE.md — Estancia360 (móvil)

Sistema de gestión ganadera offline-first para bovinos.
Stack: React Native + Expo Router + TypeScript | SQLite local (`expo-sqlite`) | Backend NestJS + PostgreSQL (repo `estancia-360-app`, ver su propio `CLAUDE.md` — es la fuente de verdad de contratos de API y schema).

> Última reescritura completa: 2026-08-05, tras un reajuste grande para alinear el móvil con el
> backend real (Movimientos había quedado apuntando a tablas que el backend ya no tenía). Si estás
> retomando este proyecto en una sesión nueva, este archivo debería reflejar el estado real del
> código — si encontrás que algo acá no coincide con lo que ves en el repo, el código manda; por
> favor corregí este archivo de paso.

---

## ⚠️ Estado de verificación interactiva

**Confirmado 2026-08-05 en simulador de iOS (`npx expo start` → tecla `i`)**: el arranque completo
de la app funciona — `initDatabase()` corre entero sin colgarse (`[db] opening... → opened → WAL
set → foreign_keys set → synchronous set → running DDL (39 statements) → DDL done → fresh install
→ seed done`) y la pantalla de bienvenida renderiza correctamente (logo, textos, botones Iniciar
Sesión/Registrarse). Esto es la primera verificación interactiva real del repo — antes de esto todo
lo marcado como "reciente" en este archivo estaba solo compilado (`tsc --noEmit` limpio), nunca
corrido. A partir de acá, Jaime puede seguir probando el resto del flujo (login, Movimientos
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
        breeding/     ← Cría (BreedingMenu + 5 formularios)
        rearing/      ← Recría (RearingMenu, WeightRecordForm)
        fattening/    ← Engorde (FatteningMenu, FatteningEntryForm, FeedRecordForm)
        health/       ← Sanidad (HealthMenu + VaccinationForm/TreatmentForm/HealthIncidentForm)
        movements/    ← Movimientos (MovimientosMenu, Purchase/Sale/Transfer/RanchExitForm,
                         AnimalExitForm, PendingSalesScreen)
      Registros/      ← RegistrosMenu (accesos a cargas masivas por módulo)
      bulkImport/     ← Wizards de importación Excel (uno por módulo, ver sección propia)
      sync/           ← SyncScreen (upload + download + resolución de conflictos)
      weights/        ← WeightsScreen (resumen de pesos recría/engorde)
    worker/           ← Flujo del rol Worker (QR, WorkerManagement)
    users/            ← Perfil

hooks/
  auth/               ← use-Auth (SecureStore), use-UserLoginLogic, use-UserRegisterLogic,
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
  breeding/ · rearing/ · fattening/ · health/  ← un hook de formulario por entidad
  movements/            ← use-AnimalPurchase, use-AnimalSale, use-AnimalTransfer, use-AnimalRanchExit,
                          use-AnimalExit (baja), use-PendingSales (confirmar/rechazar/cancelar venta)
  Animals/
    online/             ← llamadas HTTP directas (axios) — registro/alta puntual con conexión
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

4 accesos:
1. **Mis Animales** → `Ranch/Animals/AnimalMenu`
2. **Cargas Masivas** → `Registros/RegistrosMenu` (ver sección Cargas Masivas)
3. **Potreros** → `Ranch/Pastures/PasturesMenu`
4. **Mi Equipo** → `management/QrWorkerGenerator`

Cría, Recría, Engorde y Sanidad son acciones de un animal individual → solo desde AnimalMenu (menú
3 puntos). **Movimientos** tiene su propio menú (`Ranch/movements/MovimientosMenu`), no vive dentro
de AnimalMenu porque opera sobre grupos de animales, no sobre uno solo — se accede desde `RanchMenu`.

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
| AnimalMenu, PasturesMenu, RearingMenu, FatteningMenu, HealthMenu, RanchMenu, MovimientosMenu, RegistrosMenu | `router.replace('/views/(tabs)/admin/management/Management')` |

Formularios dentro de cada módulo pueden usar `router.back()` (su origen inmediato es el menú del
módulo). Auth tiene sus propios back buttons explícitos, ver sección Auth.

### BottomTabBar — ocultar barra

Se oculta cuando el `pathname` contiene: `/admin/Ranch/Animals`, `/admin/Ranch/breeding`,
`/admin/Ranch/rearing`, `/admin/Ranch/fattening`, `/admin/Ranch/health`, `/admin/Ranch/movements`,
`/admin/Ranch/Pastures`.

---

## Sesión y Autenticación

- Credenciales de sync (email+password para re-login silencioso) guardadas en **`expo-secure-store`**
  (`hooks/auth/use-Auth.ts`, clave `sync_credentials`) — antes vivían en `AsyncStorage` en texto
  plano, migrado esta sesión. `logout()` limpia `access_token`, `user_id`, `user_role`, `user_data`
  de AsyncStorage Y las credenciales de SecureStore — pero **no borra la DB SQLite de negocio**
  (los datos productivos ya cargados quedan, solo se cierra la sesión).
- Sin sesión → `router.replace('/views/auth/Inicio')`.
- **Flujo**: Inicio → Login → Management (o Worker).
- **Back buttons**: Login→Inicio, RegisterRole→Inicio, Register→RegisterRole,
  RegisterRanch→Register, VerificationCodeEmail→Login, ChangePassword→Login.

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

---

## Cargas Masivas (Excel)

Wizards en `app/views/(tabs)/admin/bulkImport/`, uno por plantilla real en `cargas-masivas/` (raíz
del proyecto, fuera de este repo — son plantillas que Jaime controla/edita, no algo que el móvil
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
esperado explícitamente; el Excel es la plantilla que controla Jaime, así que el móvil era el que
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

## Módulos implementados

| Módulo | Estado | Acceso | Archivos clave |
|---|---|---|---|
| Animales | ✅ | Management → Mis Animales | AnimalMenu, AddAnimal, DetailAnimal |
| Cría | ✅ | AnimalMenu (3 puntos) | BreedingMenu + 5 formularios + hooks |
| Recría | ✅ | AnimalMenu (3 puntos) | RearingMenu, WeightRecordForm |
| Engorde | ✅ | AnimalMenu (3 puntos) | FatteningMenu, FatteningEntryForm, FeedRecordForm |
| Sanidad | ✅ | AnimalMenu (3 puntos) | HealthMenu + 3 formularios + hooks |
| Movimientos | ✅ (recién rediseñado, sin test interactivo) | `Ranch/movements/MovimientosMenu` | ver sección propia arriba |
| Potreros | ✅ | Management → Potreros | PasturesMenu, LotDetail, use-Pastures |
| Cargas Masivas | ✅ (Sanidad-Vacunas desalineada, ver nota) | Management → Cargas Masivas → RegistrosMenu | ver sección propia |
| Sincronización | ✅ | Tab bar | SyncScreen, sync.ts |
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

- Estilos de formularios: `import { breedingFormStyles as styles } from '../breeding/_breedingFormStyles'` — el
  prefijo `_` es obligatorio: Expo Router trata todo archivo dentro de `app/` como candidato a ruta y
  falla con "missing the required default export" si no lo tiene (bug reportado 2026-08-08, causaba
  el error mostrándose en pantalla al iniciar la app)
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
EXPO_PUBLIC_API_URL=<url del backend>/api
```
`hooks/config/api.ts` es la única fuente — fallback hardcodeado a la URL de Render de producción si
la env var no está seteada. Configurar en `.env` local (actualmente apuntando a localhost, ver
advertencia al principio de este archivo) o por perfil en `eas.json` (`preview`/`production` ya
tienen la URL correcta cada uno).

---

## TAREAS PENDIENTES conocidas (para la próxima sesión)

1. ~~Resolver el cuelgue de SQLite en web~~ — **deprioritizado 2026-08-05**: confirmado que es
   exclusivo de web (ver sección de arriba), el simulador de iOS funciona perfecto. No vale la pena
   seguir invirtiendo tiempo acá salvo que se decida soportar web como target real más adelante.
2. **Testear interactivamente el módulo Movimientos rediseñado** — ahora sí es viable, el simulador
   de iOS arranca bien (ver confirmación arriba). Nunca se completó un test end-to-end real
   (compra/venta/traslado/salida/baja multi-animal, confirmar/rechazar/cancelar venta pendiente,
   sync).
3. **Testear el flujo de recuperar contraseña** contra el backend real (necesita credenciales SMTP
   configuradas del lado del backend — ver TAREAS PENDIENTES del CLAUDE.md raíz; el envío por SMTP
   ya se confirmó funcionando desde el backend, falta probarlo de punta a punta desde la app).
4. ~~Reconciliar `BulkImportVaccinations` con la plantilla real~~ — **resuelto 2026-08-05**, ver
   sección Cargas Masivas arriba (se extendió a Tratamientos e Incidentes también, mismo problema).
   Falta el test interactivo con la plantilla real.
5. Revertir `.env` a la URL de producción antes de cualquier build/test que no sea contra el backend
   local de esta máquina.
