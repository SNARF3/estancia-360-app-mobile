# Guía Mobile — Módulo SANIDAD (React Native)

> Guía de integración para el desarrollador de la app móvil.
> Cubre el flujo de Sanidad: vacunaciones, tratamientos (con período de retiro) e incidentes sanitarios.

---

## ¿Qué es Sanidad?

Sanidad registra eventos de salud de un animal, sin importar su etapa productiva (Cría, Recría o Engorde). A diferencia de los demás módulos, **no depende del rubro habilitado en la estancia** — aplica siempre, para todos los usuarios.

```
Cualquier animal activo (ps=1, 2 ó 3 — nunca ps=4/baja)
    ↓
POST /health/vaccination      ← vacunas y antiparasitarios sin retiro
POST /health/treatment        ← medicamentos con período de retiro (bloquea venta futura)
POST /health/health-incident  ← detección de enfermedad o cuarentena
```

**Importante:** la mortalidad NO se registra acá. Se registra en `animal_exits` (módulo Movimientos, pendiente), que es el que da de baja al animal de forma irreversible (RN-07).

---

## Endpoints Online

### Vacunaciones

**POST /health/vaccination**
```json
{
  "idRanchAnimal": 4,
  "vaccineName": "Aftosa",
  "dose": "5ml",
  "responsible": "Dr. Pérez",
  "eventDate": "2027-02-01T08:00:00.000Z",
  "isSynced": false
}
```
- Sin período de retiro. Para antiparasitarios CON retiro, usar `treatment` en su lugar.
- RN-02: si el animal está en ps=4 (baja), retorna `400 ANIMAL_IS_BAJA`.

**PATCH /health/vaccination/:id** — actualiza `vaccineName`, `dose`, `responsible`, `notes`
**DELETE /health/vaccination/:id** — elimina el registro (sin side-effects sobre el animal)

---

### Tratamientos (con período de retiro)

**POST /health/treatment**
```json
{
  "idRanchAnimal": 4,
  "illness": "Mastitis",
  "medication": "Penicilina",
  "dose": "10ml",
  "durationDays": 5,
  "withdrawalDays": 7,
  "responsible": "Dr. Pérez",
  "eventDate": "2027-02-01T08:00:00.000Z",
  "isSynced": false
}
```
- **`withdrawalDays`** (opcional): días de retiro sanitario del medicamento. Si se envía, el backend calcula automáticamente:
  ```
  withdrawalEndDate = eventDate + withdrawalDays
  ```
- **RN-18**: mientras `withdrawalEndDate >= hoy`, el animal no debería poder venderse. Ese bloqueo se implementa en el módulo Movimientos (pendiente) — por ahora el campo se calcula y guarda, pero no hay enforcement en una venta real todavía.
- RN-02: animal en ps=4 (baja) rechaza con `400 ANIMAL_IS_BAJA`.

**PATCH /health/treatment/:id**
- Si se envía un nuevo `withdrawalDays`, el backend **recalcula** `withdrawalEndDate` usando la `eventDate` ORIGINAL del tratamiento (no la fecha del update).

**DELETE /health/treatment/:id** — elimina el registro (sin side-effects sobre el animal)

---

### Incidentes Sanitarios

**POST /health/health-incident**
```json
{
  "idRanchAnimal": 4,
  "incidentType": "quarantine",
  "description": "Sospecha de enfermedad respiratoria",
  "eventDate": "2027-02-01T08:00:00.000Z",
  "isSynced": false
}
```
- `incidentType`: `"illness_detected"` (sin side-effect) | `"quarantine"` (**pone automáticamente `ranch_animals.id_status = 2` — En Observación**)
- No existe `"mortality"` en este módulo — la mortalidad va en `animal_exits` (Movimientos).

**PATCH /health/health-incident/:id**
```json
{ "resolvedAt": "2027-02-10" }
```
- Si el incidente era `quarantine` y estaba sin resolver, marcar `resolvedAt` **revierte automáticamente** `ranch_animals.id_status = 1` (Activo).
- `incidentType` no es editable después de creado — si se cargó mal, eliminar y volver a crear.

**DELETE /health/health-incident/:id**
- Si era una cuarentena todavía activa (sin `resolvedAt`), el backend revierte al animal a `id_status = 1` (Activo) antes de borrar.

---

## Endpoints GET (consulta)

```
GET /vaccinations/animal/:idRanchAnimal      ← vacunaciones del animal (paginado, DESC)
GET /vaccinations/:id                        ← vacunación por ID

GET /treatments/animal/:idRanchAnimal        ← tratamientos del animal (paginado, DESC)
GET /treatments/:id                          ← tratamiento por ID

GET /health-incidents/animal/:idRanchAnimal  ← incidentes del animal (paginado, DESC)
GET /health-incidents/:id                    ← incidente por ID
```

Todos aceptan `?page=1&limit=20`.

---

## Sincronización offline — POST /sync/sanidad

Para operaciones registradas sin conexión.

**Orden de procesamiento:**
1. `vaccinations`
2. `treatments`
3. `healthIncidents`

**Estructura del batch:**
```json
{
  "idRanch": 1,
  "vaccinations": [
    {
      "localId": "vac-uuid-001",
      "operation": "create",
      "happenedAt": "2027-05-10T08:00:00.000Z",
      "data": { "idRanchAnimal": 4, "vaccineName": "Aftosa", "dose": "5ml" }
    }
  ],
  "treatments": [
    {
      "localId": "trt-uuid-001",
      "operation": "create",
      "happenedAt": "2027-05-10T08:00:00.000Z",
      "data": { "idRanchAnimal": 4, "medication": "Ivermectina", "withdrawalDays": 21 }
    }
  ],
  "healthIncidents": [
    {
      "localId": "inc-uuid-001",
      "operation": "create",
      "happenedAt": "2027-05-10T08:00:00.000Z",
      "data": { "idRanchAnimal": 4, "incidentType": "illness_detected", "description": "Cojera leve" }
    }
  ]
}
```

**Respuesta:**
```json
{
  "totalSucceeded": 3,
  "totalFailed": 0,
  "vaccinations": { "succeeded": 1, "failed": 0, "results": [{ "localId": "vac-uuid-001", "status": "success", "serverId": 2 }] },
  "treatments": { "succeeded": 1, "failed": 0, "results": [{ "localId": "trt-uuid-001", "status": "success", "serverId": 2 }] },
  "healthIncidents": { "succeeded": 1, "failed": 0, "results": [{ "localId": "inc-uuid-001", "status": "success", "serverId": 4 }] }
}
```

Usar `localRef_idRanchAnimal` para referenciar un animal creado en el mismo batch de `/sync/cria` (aún sin `serverId` propio).

---

## Idempotencia offline (localId)

Igual que el resto de los módulos: el móvil genera un UUID único por registro creado offline (`localId`). Si el servidor ya procesó ese `localId`, devuelve el mismo `serverId` sin duplicar. `update`/`delete` requieren `serverId` (el que devolvió el primer `create`).

```json
// ✅ CORRECTO — siempre incluir localId en create
{ "localId": "vac-uuid-generado-en-dispositivo", "operation": "create", "data": { ... } }

// ✅ CORRECTO — update/delete requieren serverId
{ "localId": "cualquier-string-unico", "serverId": 5, "operation": "update", "data": { "dose": "6ml" } }
```

---

## Reglas de negocio críticas

| Regla | Descripción |
|---|---|
| RN-17 | Todo registro sanitario requiere un animal específico (`idRanchAnimal` obligatorio) |
| RN-02 | Animal dado de baja (ps=4) no puede recibir más eventos — aplica a los 3 tipos |
| RN-18 | `withdrawalEndDate >= hoy` debería bloquear la venta — el cálculo ya existe, el enforcement se hace en Movimientos |

---

## Notas importantes

- **Sanidad no está agrupado con Cría/Recría/Engorde**: esos tres son los módulos "principales" que a futuro se separarán por plan de suscripción; Sanidad está disponible para todos los usuarios sin importar el plan.
- **`health_incidents.incident_type` solo acepta 2 valores**: `illness_detected` y `quarantine`. No existe `mortality` — eso se registra en `animal_exits` (Movimientos).
- **Cuarentena y `id_status`**: es el único de los 3 tipos de registro que toca el estado del animal, y lo hace sobre `id_status` (operativo), nunca sobre `id_productive_status` (productivo, ps).
- **`withdrawalEndDate` es de solo lectura para el cliente**: nunca se envía en el DTO, siempre lo calcula el backend a partir de `eventDate` + `withdrawalDays`.
