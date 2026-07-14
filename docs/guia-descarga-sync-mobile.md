# Guía móvil — Sincronización de DESCARGA (bootstrap e incremental)

> Endpoints nuevos: `GET /sync/ranches`, `GET /sync/catalogs`, `GET /sync/download/:idRanch`
>
> Complementa las guías de subida (`mobile-guide-cria.md`, `mobile-guide-recria.md`, `mobile-guide-engorde.md`),
> que cubren `POST /sync/cria`, `POST /sync/recria`, `POST /sync/engorde`.

---

## 1. Para qué sirve

Hasta ahora la app móvil solo podía **subir** datos (`POST /sync/*`). Estos tres endpoints nuevos
permiten **descargar** el estado de una estancia desde el servidor, para que el dispositivo pueda:

- Hacer **bootstrap** de una instalación nueva (o reinstalación) sin pasar por cada pantalla manualmente.
- Mantener la base local **al día** cuando otro usuario (o el propio operador desde otro dispositivo)
  registra cambios — recordar que el MVP permite **máx. 2 usuarios offline por estancia**.
- Reflejar **eliminaciones** hechas en el servidor (registros borrados desde otro dispositivo).

---

## 2. Flujo recomendado

```
1. Login → obtener JWT
2. GET /sync/ranches          → lista de estancias del usuario + su rol en cada una
3. GET /sync/catalogs          → catálogos estáticos (una sola vez, o si detectás versión vieja)
4. Para cada idRanch relevante:
   GET /sync/download/:idRanch              (bootstrap, sin "since")
   → paginar con nextCursor hasta que sea null
   → guardar serverTime devuelto como "lastSyncAt" local

5. En sincronizaciones posteriores:
   GET /sync/download/:idRanch?since=<lastSyncAt>
   → paginar con nextCursor hasta null
   → aplicar entities (upsert por id) y deletions (borrar localmente)
   → actualizar "lastSyncAt" = nuevo serverTime
```

**Importante**: `since` se compara contra `updatedAt` de cada tabla en el servidor. Guardar siempre
el `serverTime` que devuelve la respuesta (no `Date.now()` del dispositivo) y usarlo como `since`
en la siguiente llamada — evita problemas de reloj desincronizado entre cliente y servidor.

---

## 3. `GET /sync/ranches`

Requiere JWT (`Authorization: Bearer <token>`).

**Respuesta** (`200 OK`):
```json
[
  { "idRanch": 1, "name": "Estancia La Esperanza", "idRanchRole": 1, "ranchRoleName": "Dueño" },
  { "idRanch": 3, "name": "Estancia El Recreo", "idRanchRole": 2, "ranchRoleName": "Trabajador" }
]
```

- `idRanchRole`: 1=Dueño, 2=Trabajador, 3=Administrador (`ranch_roles`).
- Usar los `idRanch` devueltos para iterar `GET /sync/download/:idRanch`.
- Un usuario puede pertenecer a varias estancias (con roles distintos en cada una).

---

## 4. `GET /sync/catalogs`

Requiere JWT. Sin parámetros, sin paginación — son tablas pequeñas y estáticas.

**Respuesta** (`200 OK`):
```json
{
  "animalClasses":      [{ "id": 1, "name": "Ternera", "sex": "F", "isActive": true }, ...],
  "animalBreeds":       [{ "id": 1, "name": "Brahman", "isActive": true }, ...],
  "animalStatuses":     [{ "id": 1, "name": "Activo", "isActive": true }, ...],
  "eventTypes":         [{ "id": 1, "name": "Servicio reproductivo", "isActive": true }, ...],
  "productiveStatuses": [{ "id": 1, "name": "Cría", "isActive": true }, ...],
  "productionTypes":    [{ "id": 1, "name": "Cría", "isActive": true }, ...]
}
```

Descargar una sola vez en el primer arranque y guardar en SQLite local. Volver a pedir solo si
se detecta que la versión local quedó desactualizada (por ejemplo, si el backend agrega una nueva
raza o clase de animal — no hay versionado automático todavía, es bajo criterio del cliente).

`animalStatuses` ahora incluye también `4 = Pendiente de Movimiento` y `5 = Vendido` (usados por
el futuro módulo de Movimientos — todavía no aparecen en datos reales hasta que ese módulo esté implementado).

---

## 5. `GET /sync/download/:idRanch`

Requiere JWT. El usuario debe tener acceso a `idRanch` (verificado vía `ranch_users`,
si no → `403 Forbidden`).

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `since` | ISO 8601 | _(ninguno)_ | Si se omite → bootstrap completo. Si se incluye → solo lo creado/modificado/eliminado desde esa fecha (`updatedAt > since`). |
| `cursor` | string (base64, opaco) | _(ninguno)_ | Tomar literal de `nextCursor` de la respuesta anterior. No construirlo a mano. |
| `limit` | int 1–1000 | 200 | Cantidad máx. de filas **por tabla** en esta página. |

### Respuesta (`200 OK`)

```json
{
  "serverTime": "2026-06-13T15:42:10.123Z",
  "nextCursor": "eyJyYW5jaF9hbmltYWxzIjo1MH0=",
  "entities": {
    "ranchPastures": [...],
    "ranchLots": [...],
    "ranchAnimals": [...],
    "animalEvents": [...],
    "breedingServices": [...],
    "gestationDiagnoses": [...],
    "parturitions": [...],
    "weanings": [...],
    "animalDeclaredHistories": [...],
    "weightRecords": [...],
    "rearingSelections": [...],
    "fatteningEntries": [...],
    "feedRecords": [...]
  },
  "deletions": [
    { "table": "weight_records", "ids": [12, 15] },
    { "table": "rearing_selections", "ids": [3] }
  ]
}
```

### 5.1 `entities` — orden y por qué importa

El orden de las claves dentro de `entities` **respeta dependencias FK**. Si vas a hacer
upserts en SQLite local con foreign keys habilitadas, insertar en este orden:

```
ranchPastures → ranchLots → ranchAnimals → animalEvents
→ breedingServices → gestationDiagnoses → parturitions → weanings → animalDeclaredHistories
→ weightRecords → rearingSelections
→ fatteningEntries → feedRecords
```

Cada fila trae `id` (serverId), `createdAt`, `updatedAt`, y `localId` cuando la tabla lo soporta
(permite hacer match con registros creados offline que ya se subieron previamente vía `/sync/cria`,
`/sync/recria`, `/sync/engorde`).

**Upsert recomendado**: `INSERT ... ON CONFLICT (id) DO UPDATE` (por `id` = serverId, no por `localId`).

### 5.2 Paginación (`cursor` / `nextCursor`)

- La paginación es **por tabla**, con un cursor tipo keyset (`id > cursorId`), pero el cliente
  maneja **un solo cursor opaco** para las 13 tablas a la vez.
- Si `nextCursor` es **distinto de `null`**, significa que **al menos una tabla** tiene más filas
  pendientes. Repetir la llamada con el mismo `since` y `cursor=<nextCursor>`.
- Cuando `nextCursor` es `null`, la descarga de esa sincronización terminó — guardar `serverTime`
  como nuevo `since`.
- Tablas que ya terminaron de paginar pueden devolver `[]` en páginas siguientes mientras otras
  tablas más grandes siguen entregando filas — esto es normal, simplemente no hay más para esa tabla.

Ejemplo de loop:
```javascript
let cursor;
let serverTime;
do {
  const res = await fetch(
    `https://api.estancia.com/sync/download/${idRanch}` +
    (since ? `?since=${encodeURIComponent(since)}` : '') +
    (cursor ? `${since ? '&' : '?'}cursor=${encodeURIComponent(cursor)}` : ''),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await res.json();
  applyEntities(body.data.entities);
  applyDeletions(body.data.deletions);
  cursor = body.data.nextCursor;
  serverTime = body.data.serverTime;
} while (cursor);

await saveLastSyncAt(idRanch, serverTime);
```

> Nota: la respuesta real viene envuelta por el formato estándar `{ data: ... }` del backend
> (helper `OkRes`). Ajustar `body.data` según el wrapper que uses.

### 5.3 `deletions` — eliminaciones (tombstones)

Cada vez que el backend hace un **hard delete** de un registro sincronizable (por ejemplo,
`DELETE /rearing/weight-record/:id`, `DELETE /breeding/parturition/:id`, etc.), se guarda un
tombstone en `sync_deletions` con `table`, `record_id`, `id_ranch`, `deleted_at`.

- En **bootstrap** (`since` omitido): `deletions` viene vacío `[]` — no hay nada que borrar,
  todo lo que existe ya está en `entities`.
- En **incremental**: `deletions` agrupa por tabla los IDs eliminados desde `since`. El cliente
  debe borrar esas filas de su base local (y, en cascada, sus dependientes si corresponde —
  por ejemplo, si se borra un `parturitions.id`, el `ranch_animal` de la cría puede seguir existiendo,
  pero el registro de parto ya no).

Tablas que actualmente pueden generar tombstones (todo lo que tiene `DELETE` implementado):
`weight_records`, `rearing_selections`, `fattening_entries`, `feed_records`,
`breeding_services`, `gestation_diagnoses`, `parturitions`, `weanings`, `animal_declared_history`.

---

## 6. Campos por entidad (resumen rápido)

Todas las filas incluyen `createdAt` y `updatedAt` (ISO 8601). Los campos `idXxx` son `number`
(serverId). `localId` aparece cuando la tabla lo soporta (coincide con el `localId` enviado en
`/sync/cria`, `/sync/recria`, `/sync/engorde` al crear el registro offline).

| Entidad | Campos propios relevantes |
|---|---|
| `ranchPastures` | `idRanch, name, localId?, areaHectares, description?, isActive` |
| `ranchLots` | `idRanch, idRanchPasture, name, localId?, lotType, capacity?, isActive` |
| `ranchAnimals` | `idRanch, idMother?, idFather?, idBreed, idStatus, idProductiveStatus?, idAnimalClass, idLot?, code, localId?, birthdate, weight?, sex, origin?` |
| `animalEvents` | `idRanchAnimal, idEventType, notes?, isSynced, eventDate` |
| `breedingServices` | `idEvent, localId?, idAnimalMale?, serviceType, semenBreed?, technician?, reproductiveLot?` |
| `gestationDiagnoses` | `idEvent, localId?, idService, method, result, gestationDays?, estimatedBirth?, veterinarian?` |
| `parturitions` | `idEvent, localId?, idDiagnosis, idCria?, birthType, criaWeight? (decimal, NUMERIC 6,2), criaStatus, motherCondition?` |
| `weanings` | `idEvent, localId?, idCria, idLotDest, weaningWeight?, weaningAge?` |
| `animalDeclaredHistories` | `idRanchAnimal, localId?, prevBirthsCount?, prevLastBirthYear?, prevAvgWeaningWeight?, notes?` |
| `weightRecords` | `idEvent, idLot, localId?, weight, weightType, bodyCondition?, ageDays?, notes?` |
| `rearingSelections` | `idEvent, idLotDest?, localId?, destination, weightAtSelection?, bodyCondition?, geneticScore?` |
| `fatteningEntries` | `idEvent, initialWeight?, systemType` |
| `feedRecords` | `idLot, idUser?, localId?, feedDate, feedType, quantity?, unit?, cost?, notes?, isSynced` |

> `parturitions.criaWeight` ahora acepta decimales (ej. `35.5`) — antes era entero. Si tenías
> validación estricta de "entero" en el cliente para este campo, quitarla.

---

## 7. Códigos HTTP

| Código | Significado |
|---|---|
| `200 OK` | Respuesta normal (incluso si `entities` viene vacío en alguna tabla). |
| `400 Bad Request` | `since`/`cursor`/`limit` con formato inválido. |
| `401 Unauthorized` | Token JWT inválido o expirado. |
| `403 Forbidden` | El usuario no tiene acceso (`ranch_users`) al `idRanch` solicitado. |

---

## 8. Cambios adicionales incluidos en esta entrega (afectan también a `/sync/cria`, `/sync/recria`, `/sync/engorde`)

### 8.1 `localRef_<campo>` ahora valida estrictamente

Antes: si un `localRef_idAnimal` (o similar) no coincidía con ningún `localId` del batch,
el campo se **omitía silenciosamente** → podía terminar guardando `NULL` en la base.

Ahora: la operación falla explícitamente con:
```json
{
  "localId": "evt-001",
  "status": "failed",
  "error": "localRef_idRanchAnimal=\"9\" no corresponde a ningún localId registrado en este batch"
}
```

**Implicación para el cliente**: si necesitás referenciar un animal/registro que **ya existe en
el servidor** (no creado en este mismo batch), enviar el **serverId real** en el campo normal
(`idRanchAnimal: 9`), **NO** usar `localRef_idRanchAnimal`. `localRef_*` es solo para registros
creados en el mismo batch que todavía no tienen serverId.

### 8.2 `parturitions.cria_weight` ahora admite decimales

Columna en DB pasó de `INT` a `NUMERIC(6,2)`. El campo `criaWeight` en `RegisterParturitionDto`
y en la respuesta (`ParturitionDto` / `ParturitionSyncDto`) acepta y devuelve valores como `35.5`.
Si el cliente truncaba o redondeaba este valor antes de enviarlo, ya no es necesario.

---

## 9. Checklist de integración

- [ ] Login → guardar JWT
- [ ] `GET /sync/ranches` → guardar lista de estancias + rol del usuario en cada una
- [ ] `GET /sync/catalogs` → guardar catálogos en SQLite (una vez)
- [ ] Por cada `idRanch`: `GET /sync/download/:idRanch` sin `since` (bootstrap), paginar con `nextCursor` hasta `null`
- [ ] Guardar `serverTime` de la última página como `lastSyncAt` por estancia
- [ ] Aplicar `entities` con upsert por `id` (orden FK respetado)
- [ ] Aplicar `deletions` borrando localmente los IDs listados por tabla
- [ ] En sincronizaciones periódicas: repetir con `since=<lastSyncAt>`
- [ ] Revisar que `localRef_*` solo se use para registros del mismo batch (ver 8.1)
- [ ] `parturitions.criaWeight` ya soporta decimales (ver 8.2)
