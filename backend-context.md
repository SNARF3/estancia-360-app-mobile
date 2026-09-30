# backend-context.md — Endpoints del backend y su uso real en el móvil

> Generado 2026-09-21 leyendo el spec OpenAPI en vivo del backend de **producción**
> (`https://estancia-360-app.onrender.com/api/docs-json`, título `estancia-360-app`, v1.0) —
> no es una copia manual del Swagger UI, es el JSON real servido por NestJS/`@nestjs/swagger` en
> ese momento. **141 endpoints** en total, agrupados en 42 tags. Repo backend real (con más detalle
> de DTOs/entidades) en `/Users/marvinmolloramirez/Estancia360/backend/estancia-360-app` — recordar
> que el checkout local de ESE repo puede estar desactualizado respecto a `origin/test` (ver nota
> operativa #1 de `CLAUDE.md`); este documento en cambio viene del backend deployado real, no de un
> checkout, así que no tiene ese problema de desactualización.

## Cómo se determinó "usado" vs "no usado" (metodología)

El móvil llama al backend por **dos únicos caminos**, ambos revisados por completo:

1. **`hooks/db.postre-connection/db.connection.ts`** — expone `postRequest`/`getRequest`/`putRequest`
   sobre una instancia de `axios` (interceptor agrega `Authorization: Bearer <token>`). Se
   localizaron los ~20 call sites reales en todo el repo (`grep` de `postRequest\|getRequest\|putRequest`,
   con cuidado de que el patrón matchee también `postRequest<TipoGenérico>(...)`, que un primer grep
   ingenuo con `postRequest(` se comía). `putRequest` está **definida pero jamás invocada** — cero
   call sites reales.
2. **`hooks/db.sqlite/sync.ts`** — usa `fetch()` directo contra `API_BASE_URL` para los endpoints de
   sincronización batch y el re-login silencioso.

Para cada uno de los 141 endpoints del spec se buscó el path literal (o su prefijo distintivo, ej.
`ranch-animals`, `sync/cria`) en todo `app/` y `hooks/` para confirmar si existe algún call site. Un
tercer estado, **💀 Código muerto**, marca los pocos casos donde SÍ existe una llamada HTTP escrita en
el código pero el hook que la contiene no tiene ningún `import` real desde ninguna pantalla alcanzable
(la rama entera `hooks/Animals/online/` — ya documentada como código muerto en `CLAUDE.md`, confirmada
de nuevo acá endpoint por endpoint).

**Nota de arquitectura clave para leer esta tabla**: Estancia360 móvil es offline-first en serio —
Cría, Recría, Sanidad, Movimientos, Alimentación y Potreros/Lotes escriben **siempre** directo a
SQLite local y solo llegan al backend más tarde, empaquetados, a través de uno de los **5 endpoints
batch de `/sync/*`**. Por eso decenas de endpoints REST "individuales" (crear/editar/borrar/listar
un registro puntual de cría, sanidad, movimientos, etc.) existen en el backend — evidentemente para
el panel web — pero el móvil **nunca** los llama directo, ni para escribir ni para leer. Esto no es
un bug ni una casualidad: es el diseño documentado en `CLAUDE.md` (sección "Offline-First" y
"Módulo Movimientos").

## Resumen ejecutivo

| Estado | Cantidad | Significado |
|---|---|---|
| ✅ Usado | **18** | Hay al menos un call site real, alcanzable desde una pantalla que el usuario puede navegar |
| 💀 Código muerto | **3** | Hay un call site escrito, pero vive en un hook sin ningún import alcanzable (`hooks/Animals/online/*`) |
| ❌ No usado | **120** | Sin ningún call site en el repo móvil — panel web, funcionalidad no implementada en mobile, o cubierto indirectamente por un endpoint batch |

### Los 18 endpoints que el móvil sí llama

| Método | Endpoint | Para qué |
|---|---|---|
| POST | `/auth/login` | Login, login post-registro, re-login silencioso antes de sincronizar |
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/forgot-password` | Recuperar contraseña, paso 1 |
| POST | `/auth/reset-password` | Recuperar contraseña, paso 2 |
| POST | `/ranches` | Crear estancia nueva |
| GET | `/ranches/{idRanch}` | Metadata de estancia (post-login, post-vinculación QR) |
| GET | `/users/ranches/{idUser}` | Fallback de metadata cuando el login no devuelve `idRanch` |
| POST | `/ranch-users` | Vincular un Worker a una estancia (QR) |
| GET | `/countries` | Catálogo de países (registro de estancia) |
| GET | `/regions/{idCountry}` | Catálogo de regiones |
| GET | `/cities/{idRegion}` | Catálogo de ciudades |
| GET | `/subscriptions/my-ranch/{idRanch}` | Estado del plan (Perfil) |
| GET | `/sync/download/{idRanch}` | Descarga incremental/bootstrap de datos de la estancia |
| POST | `/sync/cria` | Sync batch de Cría |
| POST | `/sync/recria` | Sync batch de Recría |
| POST | `/sync/engorde` | Sync batch de Engorde/Alimentación |
| POST | `/sync/sanidad` | Sync batch de Sanidad |
| POST | `/sync/movimientos` | Sync batch de Movimientos (incluye altas, confirmaciones y cancelaciones — ver tabla) |

Es decir: **todo el volumen real de datos productivos (cría, recría, sanidad, movimientos,
alimentación, potreros/lotes) entra y sale del backend exclusivamente por esos 5 endpoints
`/sync/*` + `/sync/download`**, nunca por los ~90 endpoints REST individuales equivalentes que
también expone el backend.

### Hallazgos que valen la pena marcar aparte

- **`putRequest()` está definida en `db.connection.ts` pero no se usa en ningún lado del repo** —
  explica por qué `PUT /auth/change-password` y `PUT /ranch-animals/{idAnimal}` (los dos únicos PUT
  del backend) aparecen como no usados: no hay ninguna pantalla de "cambiar contraseña estando
  logueado" ni de "editar animal contra el backend" en el móvil hoy.
- **`GET /sync/catalogs` y `GET /sync/ranches` existen en el backend con tag `Offline Sync` y
  `[MOBILE]` en su summary — es decir, están pensados para el móvil — pero no tienen ningún call
  site.** Los catálogos (razas/clases/estados) están hardcodeados en `database.ts`
  (`BREED_SEEDS`/`ANIMAL_CLASSES`/`ANIMAL_STATUSES`) en vez de descargarse de `/sync/catalogs`, y el
  listado de estancias del usuario se resuelve hoy con `/ranches/{id}` o `/users/ranches/{id}`
  durante el login en vez de `/sync/ranches`. Vale la pena confirmar con el backend (mirando
  `origin/test`, no el checkout local desactualizado) si estos dos endpoints son nuevos y todavía no
  se cableó el móvil, o si son remanentes de un diseño anterior.
- **3 endpoints tienen código que los llama, pero ese código es inalcanzable** (`hooks/Animals/online/`
  completo — ya documentado como código muerto en `CLAUDE.md`): `POST /ranch-animals`,
  `GET /ranch-animals/{idRanch}` (`use-AnimalRegister.ts`/`use-GetListAnimals.ts` en `online/`) y
  `GET /animal-breeds` (`use-GetAnimalsData.ts` en `online/`). Las versiones `offline/` con el mismo
  nombre de hook son las que realmente se importan desde las pantallas.
- **Movimientos es el caso más sutil**: el backend expone `POST /movements/register`,
  `PATCH /movements/animal/{id}/confirm` y `PATCH /movements/{id}/cancel` como acciones puntuales,
  pero el móvil nunca los llama directo — hace todo el efecto localmente en SQLite
  (`registerMovement`, `confirmMovementAnimal`, `cancelMovement` en `repositories/events.ts`) y
  después sube el resultado agrupado dentro de `POST /sync/movimientos` (para el caso de cancelar,
  manda un payload mínimo `{status:'cancelled'}` como `operation:'update'` — ver comentarios densos
  en `sync.ts`, sección "Módulo Movimientos" de `CLAUDE.md`).
- **`QrWorkerGenerator.tsx` es una pantalla huérfana** (documentado en `CLAUDE.md`, tarea pendiente
  #9: "ningún botón la abre") que sí importa `use-RanchData.ts` → `GET /ranches/{idRanch}` — ese
  call site existe en el código pero hoy es inalcanzable desde la UI. No lo conté aparte como
  "código muerto" en la tabla porque el mismo endpoint SÍ es alcanzable por otras dos vías
  (`use-UserLoginLogic.ts`, `QrScannerRanch.tsx`), pero es bueno saberlo si se retoma el módulo
  Colaborador (ver tarea pendiente #9).
- **Endpoints de solo panel web/admin, esperables como "no usados" desde mobile**: todo `/admin/*`
  (gestión de usuarios admin y suscripciones), `/dashboard/{idRanch}`, `/roles`, `POST /auth/login/web`,
  `GET /subscription-plans` (catálogo público de planes — el móvil no vende planes, solo lee el
  propio con `/subscriptions/my-ranch`), y los 5 `/bulk-import/*` (el móvil hace su propio parseo de
  Excel client-side, nunca sube el archivo al backend).

---

## Detalle completo por módulo (tag de Swagger)

EL ORDEN DE LOS TAGS SIGUE EL ORDEN EN QUE APARECEN EN EL SPEC (no alfabético). Dentro de cada tag,
las filas siguen el orden real del spec.

### Health

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/health` | Application health | ❌ No usado | healthcheck de infraestructura (uptime monitors, etc.), no consumido por la app |

### Users

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/users/{idUser}` | Get a user by ID | ❌ No usado | — |
| GET | `/users/ranches/{idUser}` | Get a user with the ranches they belong to and their role in each | ✅ Usado | `hooks/auth/use-UserLoginLogic.ts` (fallback cuando el login no devuelve `idRanch`) |

### Admin — Users

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/admin/users` | List admin-team users (Root + Admin) [ADMIN] | ❌ No usado | — |
| POST | `/admin/users` | Create a new admin user [ADMIN] | ❌ No usado | — |

### Ranch Users

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranch-users` | Add a worker to a ranch [OWNER ONLY] | ✅ Usado | `hooks/workers/use-WorkerWithRanch.ts` → `QrScannerRanch.tsx` (vincular Worker a la estancia vía QR) |
| GET | `/ranch-users/ranch/{idRanch}` | List the members of a ranch (Owner, Workers, Administrators) [any active member] | ❌ No usado | no hay pantalla de "miembros de la estancia" en mobile todavía (ver tarea pendiente #9, módulo Colaborador) |

### Roles

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/roles` | List roles | ❌ No usado | — |
| POST | `/roles` | Create a role | ❌ No usado | — |
| GET | `/roles/{id}` | Get a role by ID | ❌ No usado | — |
| PUT | `/roles/{id}` | Update a role | ❌ No usado | — |
| DELETE | `/roles/{id}` | Delete a role | ❌ No usado | — |

### Countries

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/countries` | List active countries | ✅ Usado | `hooks/constants/use-LotationData.ts` → `RegisterRanch.tsx` |

### Regions

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/regions/{idCountry}` | List active regions for a country | ✅ Usado | `hooks/constants/use-LotationData.ts` → `RegisterRanch.tsx` |

### Cities

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/cities/{idRegion}` | List active cities for a region | ✅ Usado | `hooks/constants/use-LotationData.ts` → `RegisterRanch.tsx` |

### Animal Classes

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-classes` | Get all active animal classes | ❌ No usado | catálogo local hardcodeado en `database.ts` (ANIMAL_CLASSES) |
| GET | `/animal-classes/{id}` | Get an animal class by ID | ❌ No usado | — |

### Subscription Plans

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/subscription-plans` | List active commercial plans (public catalog) | ❌ No usado | catálogo público de planes — mobile no tiene pantalla de elegir/activar plan (eso es 100% panel web + cobro manual, ver módulo Pagos/Suscripciones) |

### Ranches

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranches` | Create a ranch (quien la crea queda como Owner) | ✅ Usado | `hooks/auth/use-RegisterRanch.ts` → `RegisterRanch.tsx` (paso 3 del registro de estancia nueva) |
| GET | `/ranches/{idRanch}` | Get detailed ranch info (city, production types, users) | ✅ Usado | `hooks/auth/use-UserLoginLogic.ts` (metadata post-login), `app/views/(tabs)/worker/QrScannerRanch.tsx` (metadata post-vinculación), `hooks/auth/use-RanchData.ts` (usado por `QrWorkerGenerator.tsx` — ver nota: esa pantalla es huérfana, ningún botón la abre) |

### Ranch Pastures

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranch-pastures` | Create a ranch pasture | ❌ No usado | `hooks/Ranch/use-Pastures.ts` es 100% SQLite local, cero llamadas HTTP; sube vía `/sync/cria` (`ranchPastures`) |
| GET | `/ranch-pastures/by-ranch/{idRanch}` | List pastures of a ranch | ❌ No usado | — |
| GET | `/ranch-pastures/{id}` | Get a ranch pasture by ID | ❌ No usado | — |
| PATCH | `/ranch-pastures/{id}` | Update a ranch pasture | ❌ No usado | — |
| DELETE | `/ranch-pastures/{id}` | Delete a ranch pasture | ❌ No usado | — |

### Ranch Lots

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranch-lots` | Create a ranch lot | ❌ No usado | `hooks/Ranch/use-Pastures.ts` es 100% SQLite local, cero llamadas HTTP; sube vía `/sync/cria` (`ranchLots`) |
| GET | `/ranch-lots/by-ranch/{idRanch}` | List lots of a ranch | ❌ No usado | — |
| GET | `/ranch-lots/{id}` | Get a ranch lot by ID | ❌ No usado | — |
| PATCH | `/ranch-lots/{id}` | Update a ranch lot | ❌ No usado | — |
| DELETE | `/ranch-lots/{id}` | Delete a ranch lot | ❌ No usado | — |

### Animal Breeds

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-breeds` | Get all active animal breeds | 💀 Código muerto | `hooks/Animals/online/use-GetAnimalsData.ts` — hook sin ningún import real (rama `online/` muerta); catálogo real viene de `BREED_SEEDS` hardcodeado en `database.ts` |

### Animal Statuses

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-states` | Get all active animal statuses | ❌ No usado | catálogo local hardcodeado (ANIMAL_STATUSES) |

### Ranch Animals

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranch-animals` | Register an animal in the ranch | 💀 Código muerto | `hooks/Animals/online/use-AnimalRegister.ts` — sin imports reales; el alta real es offline (`hooks/Animals/offline/use-AnimalRegister.ts`, SQLite + `/sync/cria`) |
| PUT | `/ranch-animals/{idAnimal}` | Update an animal in the ranch | ❌ No usado | no hay pantalla de edición de animal contra el backend |
| GET | `/ranch-animals/{idRanch}` | Get all animals of a ranch, paginated | 💀 Código muerto | `hooks/Animals/online/use-GetListAnimals.ts` — sin imports reales; el listado real es offline (`hooks/Animals/offline/use-GetListAnimals.ts`, lee SQLite) |
| GET | `/ranch-animals/one/{idAnimal}` | Get a single animal by ID | ❌ No usado | — |

### Animal Events

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-events/animal/{idRanchAnimal}` | Get all events of an animal, paginated | ❌ No usado | historial de eventos se lee de SQLite local (`use-AnimalHistory.ts`), no de este endpoint |
| GET | `/animal-events/{id}` | Get an animal event by ID | ❌ No usado | — |

### Breeding Services

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/breeding-services/by-ranch/{idRanch}` | List breeding services of a ranch, paginated | ❌ No usado | — |
| GET | `/breeding-services/animal/{idRanchAnimal}` | List breeding services of an animal, paginated | ❌ No usado | — |
| GET | `/breeding-services/{idService}` | Get a breeding service by ID | ❌ No usado | — |

### Gestation Diagnoses

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/gestation-diagnoses/by-ranch/{idRanch}` | List gestation diagnoses of a ranch, paginated | ❌ No usado | — |
| GET | `/gestation-diagnoses/animal/{idRanchAnimal}` | List gestation diagnoses of an animal, paginated | ❌ No usado | — |
| GET | `/gestation-diagnoses/{idDiagnosis}` | Get a gestation diagnosis by ID | ❌ No usado | — |

### Parturitions

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/parturitions/by-ranch/{idRanch}` | List parturitions of a ranch, paginated | ❌ No usado | — |
| GET | `/parturitions/animal/{idRanchAnimal}` | List parturitions of an animal (as mother), paginated | ❌ No usado | — |
| GET | `/parturitions/{idParturition}` | Get a parturition by ID | ❌ No usado | — |

### Weanings

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/breeding/weanings/by-ranch/{idRanch}` | List weanings of a ranch, paginated | ❌ No usado | — |
| GET | `/breeding/weanings/animal/{idRanchAnimal}` | List weanings of an animal (as calf), paginated | ❌ No usado | — |
| GET | `/breeding/weanings/{idWeaning}` | Get a weaning by ID | ❌ No usado | — |

### Animal Declared History

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-declared-history/animal/{idRanchAnimal}` | Get an animal's declared history by animal ID | ❌ No usado | se sube vía batch `/sync/cria`, nunca se lee individualmente desde mobile |
| GET | `/animal-declared-history/{idHistory}` | Get a declared history by its own ID | ❌ No usado | — |

### Weight Records

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/weight-records/animal/{idRanchAnimal}` | List weight records of an animal in chronological order (ASC) — used to compute ADG | ❌ No usado | el ADG/historial de pesajes por animal se calcula localmente sobre SQLite, no contra este endpoint |
| GET | `/weight-records/lot/{idLot}` | List weight records of a lot, paginated | ❌ No usado | — |
| GET | `/weight-records/{id}` | Get a weight record by ID | ❌ No usado | — |

### Rearing Selections

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/rearing-selections/animal/{idRanchAnimal}` | List rearing selections of an animal, paginated | ❌ No usado | — |
| GET | `/rearing-selections/{id}` | Get a rearing selection by ID | ❌ No usado | — |

### Fattening Entries

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/fattening-entries/animal/{idRanchAnimal}` | List fattening entries of an animal, paginated | ❌ No usado | — |
| GET | `/fattening-entries/{id}` | Get a fattening entry by ID | ❌ No usado | — |

### Feed Records

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/feed-records/lot/{idLot}` | List feed records of a lot, paginated | ❌ No usado | el historial de alimentación por lote se lee de SQLite local (`hooks/feeding/use-LotFeedHistory.ts`), no de este endpoint |
| GET | `/feed-records/{id}` | Get a feed record by ID | ❌ No usado | — |

### Vaccinations

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/vaccinations/animal/{idRanchAnimal}` | List vaccinations of an animal, paginated | ❌ No usado | — |
| GET | `/vaccinations/{id}` | Get a vaccination by ID | ❌ No usado | — |

### Treatments

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/treatments/animal/{idRanchAnimal}` | List treatments of an animal, paginated | ❌ No usado | — |
| GET | `/treatments/{id}` | Get a treatment by ID | ❌ No usado | — |

### Health Incidents

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/health-incidents/animal/{idRanchAnimal}` | List health incidents of an animal, paginated | ❌ No usado | — |
| GET | `/health-incidents/{id}` | Get a health incident by ID | ❌ No usado | — |

### Movements — Query

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/movements/ranch/{idRanch}` | List movements of a ranch, paginated | ❌ No usado | — |
| GET | `/movements/{id}` | Get a movement by ID, with its per-animal detail | ❌ No usado | — |

### Animal Exits

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/animal-exits/animal/{idRanchAnimal}` | List exits of an animal, paginated | ❌ No usado | — |
| GET | `/animal-exits/{id}` | Get an exit by ID | ❌ No usado | — |

### Auth

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/auth/login` | Login | ✅ Usado | `hooks/auth/use-UserLoginLogic.ts` (Login), `app/views/auth/RegisterRanch.tsx` (login explícito post-registro), `hooks/db.sqlite/sync.ts` (re-login silencioso para refrescar el JWT antes de sincronizar) |
| POST | `/auth/login/web` | Login (panel web) | ❌ No usado | login del panel web, no del móvil |
| POST | `/auth/register` | Register | ✅ Usado | `hooks/auth/use-UserRegisterLogic.ts` → `Register.tsx` |
| PUT | `/auth/change-password` | Change password | ❌ No usado | `putRequest()` (db.connection.ts) está definida pero NO se invoca en ningún lugar del repo — no hay pantalla de "cambiar contraseña estando logueado", solo el flujo de recuperación |
| POST | `/auth/forgot-password` | Forgot password — step 1 | ✅ Usado | `hooks/auth/use-UserVerificationCode.ts` → `VerificationCodeEmail.tsx` |
| POST | `/auth/reset-password` | Forgot password — step 2 | ✅ Usado | `hooks/auth/use-UserChangePassword.ts` → `ChangePassword.tsx` |

### Breeding — Cría

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/breeding/breeding-service` | Register a breeding service (natural, AI or embryo transfer) | ❌ No usado | alta 100% local (SQLite) — se sube recién en el próximo `POST /sync/cria`, nunca se llama directo |
| POST | `/breeding/gestation-diagnosis` | Register a gestation diagnosis for a previous breeding service | ❌ No usado | alta 100% local (SQLite) — se sube recién en el próximo `POST /sync/cria`, nunca se llama directo |
| POST | `/breeding/parturition` | Register a birth for a female with a positive gestation diagnosis | ❌ No usado | alta 100% local (SQLite) — se sube recién en el próximo `POST /sync/cria`, nunca se llama directo |
| POST | `/breeding/weaning` | Register a weaning for a calf | ❌ No usado | alta 100% local (SQLite) — se sube recién en el próximo `POST /sync/cria`, nunca se llama directo |
| POST | `/breeding/animal-declared-history` | Register an animal's declared reproductive history (pre-system data) | ❌ No usado | alta 100% local (SQLite) — se sube recién en el próximo `POST /sync/cria`, nunca se llama directo |
| PATCH | `/breeding/breeding-service/{id}` | Update a breeding service | ❌ No usado | sin pantalla de edición en mobile |
| DELETE | `/breeding/breeding-service/{id}` | Delete a breeding service (cascades to diagnosis → parturition) | ❌ No usado | edición/borrado individual es funcionalidad de panel web |
| PATCH | `/breeding/gestation-diagnosis/{id}` | Update a gestation diagnosis | ❌ No usado | sin pantalla de edición en mobile |
| DELETE | `/breeding/gestation-diagnosis/{id}` | Delete a gestation diagnosis (cascades to its parturition, if any) | ❌ No usado | edición/borrado individual es funcionalidad de panel web |
| PATCH | `/breeding/parturition/{id}` | Update a parturition | ❌ No usado | sin pantalla de edición en mobile |
| DELETE | `/breeding/parturition/{id}` | Delete a parturition | ❌ No usado | edición/borrado individual es funcionalidad de panel web |
| PATCH | `/breeding/weaning/{id}` | Update a weaning | ❌ No usado | sin pantalla de edición en mobile |
| DELETE | `/breeding/weaning/{id}` | Delete a weaning (reverts the calf to ps=Cría, clears its lot) | ❌ No usado | edición/borrado individual es funcionalidad de panel web |
| PATCH | `/breeding/animal-declared-history/{id}` | Update an animal's declared reproductive history | ❌ No usado | sin pantalla de edición en mobile |
| DELETE | `/breeding/animal-declared-history/{id}` | Delete an animal's declared reproductive history | ❌ No usado | edición/borrado individual es funcionalidad de panel web |

### Rearing — Recría

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/rearing/weight-record` | Register a weighing | ❌ No usado | alta 100% local — Pesajes/Recría escriben a SQLite y sincronizan vía `POST /sync/recria` |
| PATCH | `/rearing/weight-record/{id}` | Update a weighing | ❌ No usado | — |
| DELETE | `/rearing/weight-record/{id}` | Delete a weighing | ❌ No usado | — |
| POST | `/rearing/rearing-selection` | Register an animal's rearing-stage destination decision (replacement / fattening / sale) | ❌ No usado | alta 100% local — Pesajes/Recría escriben a SQLite y sincronizan vía `POST /sync/recria` |
| PATCH | `/rearing/rearing-selection/{id}` | Update a rearing selection (destination cannot be changed post-registration) | ❌ No usado | — |
| DELETE | `/rearing/rearing-selection/{id}` | Delete a rearing selection and revert the animal state if applicable | ❌ No usado | — |

### Fattening — Engorde

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/fattening/entry` | Manually register a fattening entry (ps=2 Recría → ps=3 Engorde) | ❌ No usado | el módulo Engorde viejo del móvil fue eliminado 2026-08-09 (código muerto sin punto de entrada); `fattening_entries` sigue sin UI móvil |
| PATCH | `/fattening/entry/{id}` | Update a fattening entry | ❌ No usado | — |
| DELETE | `/fattening/entry/{id}` | Delete a fattening entry (reverts the animal to ps=2, clears its lot) | ❌ No usado | — |
| POST | `/fattening/feed-record` | Register feed given to a lot (does not create an animal_event — lot-level, not per-animal) | ❌ No usado | Alimentación (`FeedRecordForm.tsx`) escribe directo a SQLite (`registerFeedRecord`, no pasa por `createEvent` ni por HTTP) y sincroniza vía `POST /sync/engorde`, nunca llama este endpoint individual |
| PATCH | `/fattening/feed-record/{id}` | Update a feed record | ❌ No usado | — |
| DELETE | `/fattening/feed-record/{id}` | Delete a feed record | ❌ No usado | — |

### Animal Health — Sanidad

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/health/vaccination` | Register a vaccination (or a withdrawal-free antiparasitic) | ❌ No usado | alta 100% local — Vacunación/Tratamiento/Incidente escriben a SQLite y sincronizan vía `POST /sync/sanidad` |
| PATCH | `/health/vaccination/{id}` | Update a vaccination | ❌ No usado | — |
| DELETE | `/health/vaccination/{id}` | Delete a vaccination | ❌ No usado | — |
| POST | `/health/treatment` | Register a treatment | ❌ No usado | alta 100% local — Vacunación/Tratamiento/Incidente escriben a SQLite y sincronizan vía `POST /sync/sanidad` |
| PATCH | `/health/treatment/{id}` | Update a treatment (recomputes withdrawalEndDate if withdrawalDays changes) | ❌ No usado | — |
| DELETE | `/health/treatment/{id}` | Delete a treatment | ❌ No usado | — |
| POST | `/health/health-incident` | Register a health incident (illness detected or quarantine) | ❌ No usado | alta 100% local — Vacunación/Tratamiento/Incidente escriben a SQLite y sincronizan vía `POST /sync/sanidad` |
| PATCH | `/health/health-incident/{id}` | Update a health incident (resolving an active quarantine reverts the animal to Activo) | ❌ No usado | — |
| DELETE | `/health/health-incident/{id}` | Delete a health incident (reverts an unresolved quarantine to Activo) | ❌ No usado | — |

### Movements

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/movements/register` | Register a batch movement (sale, purchase, pasture transfer, or ranch exit) | ❌ No usado | `registerMovement()` local (compra/venta/traslado/baja de estancia) + sync batch — ver nota de Movimientos arriba |
| PATCH | `/movements/animal/{idMovementAnimal}/confirm` | Confirm or reject ONE animal of a pending sale | ❌ No usado | confirmar/rechazar (`use-PendingSales.ts::decide`) es 100% local (`confirmMovementAnimal`); el cambio sube en el próximo `POST /sync/movimientos`, nunca llama a este PATCH directo |
| PATCH | `/movements/{idMovement}/cancel` | Cancel a pending movement (sale) | ❌ No usado | `cancelMovement()` local (`use-PendingSales.ts::cancel`) + sync batch manda `{status:'cancelled'}` dentro de `POST /sync/movimientos`, nunca llama a este PATCH directo |
| POST | `/movements/animal-exit` | Register a non-commercial animal exit (death, discard, loss) | ❌ No usado | baja individual (`AnimalExitForm.tsx`) escribe local y sincroniza vía `POST /sync/movimientos` |
| PATCH | `/movements/animal-exit/{id}` | Correct the reason or notes of an exit (the animal state does not change — exits are irreversible) | ❌ No usado | — |

### Subscriptions

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/admin/subscriptions` | List every ranch subscription [ADMIN] | ❌ No usado | — |
| GET | `/admin/subscriptions/metrics` | Subscription metrics (MRR, active clients) [ADMIN] | ❌ No usado | — |
| GET | `/admin/subscriptions/{idRanch}` | View a ranch's subscription [ADMIN] | ❌ No usado | — |
| POST | `/admin/subscriptions/{idRanch}/activate` | Activate/change a ranch's plan [ADMIN] | ❌ No usado | — |
| POST | `/admin/subscriptions/{idRanch}/payments` | Register a manual payment and extend the period [ADMIN] | ❌ No usado | — |
| PATCH | `/admin/subscriptions/{idRanch}/cancel` | Cancel a ranch's subscription [ADMIN] | ❌ No usado | — |
| GET | `/subscriptions/my-ranch/{idRanch}` | View my ranch's subscription status [MOBILE] | ✅ Usado | `hooks/subscriptions/use-Subscription.ts` (Perfil — barra de uso + banner de límite) |

### Dashboard

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/dashboard/{idRanch}` | Aggregated stats for the ranch's web dashboard | ❌ No usado | reportes/dashboard es funcionalidad de panel web; mobile solo tiene `WeightsScreen` (vista básica propia, no consume este endpoint) |

### Offline Sync

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| GET | `/sync/ranches` | List ranches the authenticated user can access [MOBILE] | ❌ No usado | sin ningún call site en el repo — el listado de estancias del usuario se resuelve hoy vía `GET /ranches/{idRanch}` / `GET /users/ranches/{idUser}` en el login, no vía este endpoint |
| GET | `/sync/catalogs` | Download system catalogs [MOBILE] | ❌ No usado | sin ningún call site en el repo — catálogos (razas/clases/estados) están hardcodeados en `database.ts`, no se descargan de acá pese a que el endpoint existe |
| GET | `/sync/download/{idRanch}` | Download ranch data — bootstrap or incremental [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::downloadFromServer` |
| POST | `/sync/cria` | Sync offline data for the Cría module [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::syncCria` |
| POST | `/sync/recria` | Sync offline data for the Recría module [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::syncRecria` |
| POST | `/sync/engorde` | Sync offline data for the Engorde module [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::syncEngorde` |
| POST | `/sync/sanidad` | Sync offline data for the Sanidad module [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::syncSanidad` |
| POST | `/sync/movimientos` | Sync offline data for the Movimientos module [MOBILE] | ✅ Usado | `hooks/db.sqlite/sync.ts::syncMovimientos` (bespoke, ver nota Movimientos) |

### Bulk Import

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/bulk-import/animals` | Bulk-register animals (Planilla_Alta_Inventario.xlsx) | ❌ No usado | los wizards de carga masiva del móvil parsean el Excel y escriben fila-por-fila directo a SQLite local (`repositories/events.ts`); no llaman a este endpoint del backend en ningún punto |
| POST | `/bulk-import/weights` | Bulk-register weight records (Registros_Pesajes.xlsx) | ❌ No usado | ídem |
| POST | `/bulk-import/gestation` | Bulk-register pregnancy diagnoses / tactos (Planilla_Gestación.xlsx) | ❌ No usado | ídem |
| POST | `/bulk-import/health` | Bulk-register vaccinations/treatments/health incidents (Plantilla_Carga_Masiva_Sanidad_Estancia360.xlsx) | ❌ No usado | ídem |
| POST | `/bulk-import/movements` | Bulk-register movements + exits (Plantilla_Carga_Masiva_Movimientos_Estancia360.xlsx) | ❌ No usado | ídem |

### Ranch Members

| Método | Endpoint | Descripción (Swagger) | Estado | Detalle de uso en el móvil |
|---|---|---|---|---|
| POST | `/ranch-users/ranch/{idRanch}/members` | Add a new administrator to the ranch [OWNER ONLY] | ❌ No usado | — |
| DELETE | `/ranch-users/ranch/{idRanch}/members/{idTargetUser}` | Remove an administrator from the ranch [OWNER ONLY] | ❌ No usado | — |

---

## Cómo mantener esto actualizado

Este documento es una foto de **2026-09-21** contra producción. Si el backend agrega/cambia
endpoints, o el móvil cablea alguno de los actualmente "no usados" (empezando candidatos obvios:
`/sync/catalogs`, `/sync/ranches`, el módulo Colaborador con `GET /ranch-users/ranch/{idRanch}` y
`POST/DELETE /ranch-users/ranch/{idRanch}/members`), conviene re-generar la tabla en vez de
editarla a mano:

```bash
curl -s "https://estancia-360-app.onrender.com/api/docs-json" -o /tmp/swagger.json
python3 -c "import json; d=json.load(open('/tmp/swagger.json')); print(len(d['paths']))"
```

y volver a correr un `grep` de los paths nuevos contra `app/` y `hooks/` (cuidado con el gotcha de
`postRequest<Tipo>(...)` — un grep de `postRequest(` sin más se come esos call sites porque el `(`
no viene inmediatamente después de la palabra).
