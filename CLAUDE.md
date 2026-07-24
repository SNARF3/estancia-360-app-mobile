# CLAUDE.md — Estancia360

Sistema de gestión ganadera offline-first para bovinos.
Stack: React Native + Expo + TypeScript | SQLite local | Backend NestJS + PostgreSQL

---

## Arquitectura General

```
app/views/(tabs)/admin/
  management/        ← Home (Management.tsx) — 4 módulos en grilla
  Ranch/
    Animals/         ← Inventario de animales (AnimalMenu, AddAnimal, DetailAnimal)
    Pastures/        ← Potreros y Lotes (PasturesMenu)
    breeding/        ← Módulo Cría completo (Servicio, Diagnóstico, Parto, Destete, SelecciónRecría)
    rearing/         ← Módulo Recría (RearingMenu, WeightRecordForm)
    fattening/       ← Módulo Engorde (FatteningMenu, FatteningEntryForm, FeedRecordForm)
    health/          ← Módulo Sanidad (HealthMenu, VaccinationForm, TreatmentForm, HealthIncidentForm)
  sync/              ← Pantalla de sincronización (SyncScreen)
  weights/           ← Resumen de pesos recría/engorde (WeightsScreen)
  bulkImport/        ← Importación masiva desde Excel (BulkImportAnimals, BulkImportWeights, bulkImport menu)

hooks/
  auth/              ← use-Auth.ts (saveSession, getSession, logout, getToken)
  db.sqlite/
    database.ts      ← Schema DDL + constantes (EVENT_TYPES, PRODUCTIVE_STATUSES, etc.)
    db-pool.ts       ← Singleton SQLite (getDb())
    repositories/
      animals.ts     ← CRUD de animales
      events.ts      ← Todos los eventos (Cría, Recría, Engorde, Movimientos, Sanidad)
    sync.ts          ← syncAll(), syncCria(), syncRecria(), getPendingCount(), pullFromServer()
  breeding/          ← Hooks de formulario: use-BreedingService, use-GestationDiagnosis, etc.
  rearing/           ← use-WeightRecord.ts
  fattening/         ← use-FatteningEntry.ts, use-FeedRecord.ts
  health/            ← use-Vaccination.ts, use-Treatment.ts, use-HealthIncident.ts
  Ranch/             ← use-Pastures.ts (CRUD potreros y lotes)
  Animals/offline/   ← use-BulkImport.ts, use-BulkImportWeights.ts

components/
  navigation/BottomTabBar.tsx      ← 4 tabs admin: Mi Estancia, Sincronización, Pesos, Perfil
  common/LotSelectorModal.tsx      ← Modal para seleccionar lotes (con filtro por tipo)
  common/SyncLoadingOverlay.tsx    ← Modal bloqueante durante sync (no se puede cerrar)
  common/DateSelector.tsx
  layout/ScreenContainer.tsx
```

---

## Menú principal (Management.tsx)

4 accesos únicamente:
1. **Mis Animales** → `Ranch/Animals/AnimalMenu`
2. **Cargas Masivas** → `bulkImport/bulkImport` (animales, pesos)
3. **Potreros** → `Ranch/Pastures/PasturesMenu`
4. **Mi Equipo** → `management/QrWorkerGenerator`

Los módulos Cría, Recría, Engorde y Sanidad son acciones de un animal individual → solo accesibles desde AnimalMenu (menú 3 puntos), NO desde Management.

---

## Menú contextual de AnimalMenu (3 puntos)

8 acciones disponibles en orden:
1. Registrar Pesaje → `rearing/WeightRecordForm` (param: `animalCode`)
2. Vacunación → `health/VaccinationForm` (param: `animalCode`)
3. Tratamiento → `health/TreatmentForm` (param: `animalCode`)
4. Incidente Sanitario → `health/HealthIncidentForm` (param: `animalCode`)
5. Registrar Servicio → `breeding/BreedingServiceForm` (param: `animalCode`)
6. Diagnóstico Gestación → `breeding/GestationDiagnosisForm` (param: `animalCode`)
7. Registrar Parto → `breeding/ParturitionForm` (param: `animalCode`)
8. Registrar Destete → `breeding/WeaningForm` (param: `criaCode`)

Todos los formularios leen `animalCode` (o `criaCode`) de `useLocalSearchParams` y pre-llenan el campo al abrirse.

---

## Navegación y Layout

### Expo Router — cómo se registran las rutas en `(tabs)/_layout.tsx`

Solo se registran los **hijos directos** del segmento `(tabs)`:
- Carpetas con `_layout.tsx` propios → aparecen como segmento: `admin/management`, `admin/Ranch`, `worker`
- Archivos en carpetas sin `_layout.tsx` → aparecen como ruta completa: `admin/sync/SyncScreen`, `admin/bulkImport/BulkImportAnimals`, etc.

**NUNCA registrar rutas profundas** (ej. `admin/Ranch/breeding`) en `(tabs)/_layout.tsx` — genera WARN. Las subrutas de Ranch se registran en `Ranch/_layout.tsx`.

### Back buttons — regla crítica

**Todos los back buttons de pantallas "raíz de módulo" usan `router.replace`**, nunca `router.back()` desnudo. Esto evita acumulación de instancias en el Stack de Ranch:

| Pantalla | Back destino |
|---|---|
| AnimalMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| PasturesMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| RearingMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| FatteningMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| HealthMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| RanchMenu | `router.replace('/views/(tabs)/admin/management/Management')` |
| bulkImport | `router.replace('/views/(tabs)/admin/management/Management')` |

Formularios dentro de cada módulo (WeightRecordForm, VaccinationForm, etc.) pueden usar `router.back()` porque su origen inmediato es el menú del módulo.

### BottomTabBar — ocultar barra

`BottomTabBar.tsx` se oculta cuando `pathname` contiene:
`/admin/Ranch/Animals`, `/admin/Ranch/breeding`, `/admin/Ranch/rearing`,
`/admin/Ranch/fattening`, `/admin/Ranch/health`, `/admin/Ranch/Pastures`

---

## Sesión y Autenticación

- Sin sesión → `router.replace('/views/auth/Inicio')` (NOT Login)
- **Flujo auth**: Inicio → Login → Management (o Worker)
- **Back buttons auth** (todos explícitos):
  - Login → Inicio
  - RegisterRole → Inicio
  - Register → RegisterRole
  - RegisterRanch → Register
  - VerificationCodeEmail → Login
  - ChangePassword → Login
- **Logout**: borra `access_token`, `user_id`, `user_role`, `user_data` de AsyncStorage.

---

## Offline-First

- Toda escritura va a SQLite con `is_synced = 0`.
- `syncAll()` en `sync.ts` envía los pendientes al backend y devuelve `SyncResult`.
- `getPendingCount()` cuenta registros sin sincronizar (usado en SyncScreen badge).
- Durante sync: `SyncLoadingOverlay` bloquea toda la UI (no se puede descartar).

---

## Sincronización — Batch API (hasta Recría)

`sync.ts` usa dos endpoints batch:

### `POST /sync/cria`
Payload: `{ ranchPastures, ranchLots, ranchAnimals, animalDeclaredHistories, breedingServices, gestationDiagnoses, parturitions, weanings }`

### `POST /sync/recria`
Payload: `{ weightRecords, rearingSelections }`

### Formato de cada ítem
```ts
{
  localId: string,          // id local (UUID)
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  serverId?: string,        // si ya existe server_id previo
  data: { ... },            // campos de negocio
  happenedAt?: string       // created_at o updated_at
}
```

### FKs no resueltas — `localRef_` pattern
Si un campo FK apunta a un registro que aún no tiene `server_id` (está en el mismo batch), se envía como:
```
data.localRef_id_pasture = "uuid-local-del-potrero"   // en lugar de data.id_pasture
```
Si el registro referenciado YA tiene `server_id` (sincronizado previamente), se envía el `server_id` directamente.

### Respuesta del servidor
```ts
{ ranchPastures: { "local-uuid": "server-id" }, ranchLots: { ... }, ... }
```
Tras la respuesta: `UPDATE tabla SET is_synced=1, server_id=?, synced_at=? WHERE id=?`

### Tablas pendientes de backend (no incluidas en sync aún)
- Engorde: `fattening_entries`, `feed_records`
- Sanidad: `vaccinations`, `treatments`, `health_incidents`
- Movimientos: `animal_purchases`, `animal_sales`, `animal_transfers`, `animal_exits`

---

## Módulos implementados

| Módulo         | Estado        | Acceso | Archivos clave |
|----------------|---------------|--------|----------------|
| Animales       | ✅ Completo    | Management → Mis Animales | AnimalMenu, AddAnimal, DetailAnimal |
| Cría           | ✅ Completo    | AnimalMenu (3 puntos) | BreedingMenu + 5 formularios + hooks |
| Recría         | ✅ Básico      | AnimalMenu (3 puntos) | RearingMenu, WeightRecordForm |
| Engorde        | ✅ Básico      | AnimalMenu (3 puntos) | FatteningMenu, FatteningEntryForm, FeedRecordForm |
| Sanidad        | ✅ Completo    | AnimalMenu (3 puntos) | HealthMenu + 3 formularios + hooks |
| Potreros       | ✅ Completo    | Management → Potreros | PasturesMenu, use-Pastures |
| Cargas Masivas | ✅ Básico      | Management → Cargas Masivas | bulkImport menu, BulkImportAnimals, BulkImportWeights |
| Sincronización | ✅ Completo    | Tab bar | SyncScreen, sync.ts, SyncLoadingOverlay |
| Reportes       | ❌ Pendiente   | — | Solo vista básica de pesos en WeightsScreen |

---

## Módulo Sanidad — COMPLETO

Tablas SQLite: `vaccinations`, `treatments`, `health_incidents`.
Funciones en `events.ts`: `registerVaccination()`, `registerTreatment()`, `registerHealthIncident()`.

- `health/HealthMenu.tsx` — stats del mes (vacunaciones, tratamientos activos, incidentes, retiro)
- `health/VaccinationForm.tsx` + `hooks/health/use-Vaccination.ts`
- `health/TreatmentForm.tsx` + `hooks/health/use-Treatment.ts` — período de retiro calculado en pantalla
- `health/HealthIncidentForm.tsx` + `hooks/health/use-HealthIncident.ts` — cuarentena llama `setAnimalObservation()`

**Pendiente:** Validar período de retiro activo al registrar Venta — `hasActiveWithdrawal()` ya existe en `animals.ts`.

---

## Flujo del Animal

```
Nacimiento/Compra → productive_status=CRIA (1)
  ↓ Destete (registerWeaning) → is_weaned=TRUE, productive_status=RECRIA (2)
  ↓ Selección (registerFatteningEntry) → productive_status=ENGORDE (3)
  ↓ Venta/Muerte (registerSale/registerExit) → productive_status=BAJA (4), status=INACTIVO
```

---

## Convenciones

- Estilos de formularios: `import { breedingFormStyles as styles } from '../breeding/breedingFormStyles'`
- Rutas de módulos Ranch anidados: registrar en `Ranch/_layout.tsx`, NUNCA en `(tabs)/_layout.tsx`
- Back buttons en pantallas raíz: `router.replace(origen)`, nunca `router.back()` desnudo
- Params a formularios: usar `useLocalSearchParams<{ animalCode: string }>()` + `useEffect` para pre-llenar
- IDs locales: UUID v4 (TEXT). `server_id` se llena tras sync exitosa
- Toda tabla transaccional tiene: `is_synced`, `server_id`, `sync_action`, `synced_at`, `created_at`, `updated_at`

---

## Variables de entorno

```
EXPO_PUBLIC_API_URL=https://api.estancia360.com  (o la URL del backend en Railway)
```

Configurar en `.env` local o en la plataforma de build (EAS).
