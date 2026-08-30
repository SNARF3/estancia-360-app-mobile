# Pagos / Suscripciones — contexto completo (backend, DB y web)

> Para la guía acotada a "qué necesita consumir la app móvil", ver `docs/mobile-guide-pagos.md`
> en este mismo repo — este documento es el contexto completo: qué es, cómo está armado el schema,
> cómo funciona el backend por dentro, y cómo lo usa el panel web (admin + enforcement al dueño).

## 1. Qué es

Módulo **administrativo** de suscripciones — **no es una pasarela de pagos**. El cobro real
(QR o transferencia bancaria) pasa por fuera del sistema: el dueño de la estancia paga como sea
con Estancia360, y un administrador de Estancia360 entra al panel web y registra manualmente que
ese pago se recibió. El sistema no procesa tarjetas ni cobra nada automáticamente — solo lleva la
cuenta de qué estancia pagó qué, hasta cuándo, y qué tan grande puede crecer su inventario de
animales según el plan que tiene.

El scope es **por estancia**, no por usuario — un mismo usuario puede ser dueño de una estancia en
plan Hacienda y trabajador en otra que todavía está en Free. La suscripción vive colgada de
`id_ranch`, nunca de `id_user`.

Implementado en 3 fases, **las tres ya terminadas**:
- **Fase 1** — backend + DB (este documento, secciones 2-6)
- **Fase 2** — panel admin en la web, donde Estancia360 activa planes y registra pagos (sección 7)
- **Fase 3** — enforcement duro en la web: si la estancia no tiene un plan pago activo, el panel
  entero queda bloqueado para el dueño (sección 7)

---

## 2. Modelo de datos

Migración de origen: `db-estancia-360/migrations/007_20260707_0000_payments_subscriptions_module`
(más `008_20260715_0000_subscription_payments_local_id`, que agregó idempotencia después).

```sql
subscription_plans (
    id_plan, name, capacity_min, capacity_max,   -- capacity_max NULL = sin límite
    price_monthly, price_annual, trial_days, is_active
)

ranch_subscriptions (
    id_ranch_subscription, id_ranch UNIQUE, id_plan,
    billing_cycle,          -- 'monthly' | 'annual' | NULL
    trial_ends_at,          -- DATE | NULL
    current_period_end,     -- DATE | NULL
    cancelled_at            -- DATE | NULL
    -- SIN columna `status` — ver sección 3
)

subscription_payments (
    id_payment, id_ranch_subscription, amount, payment_date,
    payment_method,          -- 'qr' | 'transfer'
    payment_source,          -- 'manual' | 'gateway' (gateway sin uso todavía, ver más abajo)
    external_reference,      -- referencia libre del comprobante, opcional
    period_extended_months,  -- cuántos meses extendió ESTE pago (explícito, no derivado)
    registered_by,           -- id_user del admin que lo cargó
    notes,
    local_id                 -- idempotencia ante doble clic, agregado en 008
    -- inmutable: no tiene updated_at, un pago registrado no se edita
)
```

**Decisiones de diseño que valen la pena entender:**

- **Sin columna `status`.** El estado (`trial`/`active`/`expired`/`cancelled`) se calcula en cada
  consulta a partir de las fechas — evita que un cron tenga que mantenerlo sincronizado y evita que
  quede desactualizado si alguien olvida correrlo. Ver algoritmo exacto en la sección 3.

- **`period_extended_months` es explícito, no derivado de `billing_cycle`.** El admin carga a mano
  cuántos meses extiende cada pago. Esto permite promos tipo "pagá 3 meses, te doy 4" sin necesitar
  un caso especial en el código — el admin simplemente carga `4` en ese pago puntual.

- **`payment_source`/`external_reference` existen pero `gateway` no se usa todavía.** Están ahí
  preparados para el día que exista una pasarela de pago real (Stripe, etc.) que pueda poblarlos vía
  webhook, sin necesitar una migración de schema en ese momento. Hoy `payment_source` siempre es
  `'manual'`.

- **`subscription_payments` es inmutable** — no hay `PATCH`/`DELETE` para un pago ya registrado, ni
  columna `updated_at`. Es un historial de auditoría, no un registro editable.

- **`subscription_payments.local_id`** — a diferencia del resto del proyecto (donde `local_id` es
  para reconciliar sync offline del móvil), acá es contra **doble clic** del admin en "Registrar
  pago" desde el panel web — el módulo entero no tiene sync offline, este es el único caso de
  `local_id` que no tiene nada que ver con el móvil.

- **Backfill al crear la migración**: toda estancia que ya existía en ese momento quedó con una fila
  en `ranch_subscriptions` apuntando al plan Free (`id_plan=1`), vía un `INSERT ... WHERE NOT EXISTS`
  idempotente. Desde entonces, toda estancia nueva nace en Free automáticamente
  (`RanchesService.create()` la crea en la misma transacción que crea la estancia).

---

## 3. Estado efectivo (`effectiveStatus`)

Calculado en runtime por `RanchSubscriptionsService.getEffectiveStatus()`
(`src/modules/payment-modules/ranch-subscriptions/services/ranch-subscriptions.service.ts`):

```typescript
getEffectiveStatus(subscription): 'trial' | 'active' | 'expired' | 'cancelled' {
    if (subscription.cancelledAt) return 'cancelled';

    const today = hoy a medianoche;

    if (subscription.trialEndsAt && today < trialEndsAt)         return 'trial';
    if (subscription.currentPeriodEnd && today <= currentPeriodEnd) return 'active';
    if (!subscription.trialEndsAt && !subscription.currentPeriodEnd) return 'active';  // caso Free
    return 'expired';
}
```

El orden importa: `cancelledAt` gana siempre, aunque `currentPeriodEnd` todavía esté vigente (una
cancelación es una decisión explícita, no depende de fechas). Una estancia en Free (sin
`trialEndsAt` ni `currentPeriodEnd` seteados nunca) siempre da `active` — Free no vence.

---

## 4. Catálogo de planes (seed real)

| id | Plan | Capacidad | Mensual | Anual | Trial |
|---|---|---|---|---|---|
| 1 | Free | 0–30 animales | 0 Bs | 0 Bs | 0 días |
| 2 | Estancia | 31–350 | 100 Bs | 1000 Bs | 7 días |
| 3 | Hacienda | 351–1500 | 300 Bs | 3000 Bs | 14 días |
| 4 | Ganadero Plus | 1501+ (`capacity_max = NULL`, sin límite) | 450 Bs | 4500 Bs | 21 días |

`capacityMax = null` en la respuesta de la API significa "sin límite" — es el caso de Ganadero Plus.

---

## 5. Capacidad — dónde se chequea y cómo se cuenta

**Headcount de una estancia** = filas de `ranch_animals` con `id_ranch` = esa estancia Y
`id_productive_status` **distinto** de Baja (`4`) — un animal con `id_productive_status = NULL`
cuenta como activo (`RanchAnimalsService.countActiveByRanch()`).

**Capacidad efectiva** (`RanchSubscriptionsService.getEffectiveCapacity()`):
- Si el estado efectivo es `expired` o `cancelled` → la capacidad cae a la del plan **Free** (30),
  sin importar qué plan tenga asignado — así se frena el crecimiento de una estancia que dejó de
  pagar, sin tocar sus animales existentes.
- Si no, la capacidad es la del plan actual (`capacityMax`, o `null` = sin límite).

**Los 3 puntos exactos donde se valida antes de crear un animal** (`assertCapacityAvailable`,
lanza `400 SUBSCRIPTION_CAPACITY_EXCEEDED` si `headcount actual + nuevos > capacidad`):

1. `RanchAnimalsService.create()` — alta directa de un animal (`POST /ranch-animals`).
2. `RegisterParturitionUseCase` — **solo** si `criaStatus=alive` y se está creando una cría nueva
   (no si `idCria` ya viene resuelto, caso del sync offline del móvil donde el animal ya se creó
   como su propio alta antes de que llegue el evento de parto).
3. `RegisterMovementUseCase` — solo para `movementType='purchase'`. **Importante**: el chequeo se
   hace **una sola vez para todo el movimiento**, contando `dto.animals.length` de una — si comprás
   5 animales y solo hay lugar para 4, el movimiento entero se rechaza (todo o nada), no se
   procesan 4 y falla el 5°.

`assertCapacityAvailable` vive en `RanchSubscriptionsService` y es lo único que estos 3 puntos
comparten — no hay lógica duplicada, cada uno llama al mismo método central.

---

## 6. Backend — estructura y endpoints

```
src/modules/payment-modules/
  subscription-plans/        ← catálogo, CRUD de solo lectura hacia afuera
  ranch-subscriptions/       ← entidad + service con toda la lógica (estado, capacidad, activar, extender, cancelar)
  subscription-payments/     ← historial de pagos, inmutable

src/app/subscriptions/       ← orquestación, es lo que expone el controller HTTP
  subscriptions.controller.ts
  subscriptions.service.ts
  use-cases/
    activate-plan.use-case.ts
    register-subscription-payment.use-case.ts
    cancel-subscription.use-case.ts
```

Fue **el primer módulo del proyecto con seguridad JWT real desde el día uno** (`@AdminUp()`/
`@UserUp()` de verdad, no comentado "para testing" como estaba el resto en ese momento). De paso,
armarlo destapó un bug preexistente en `AuthRolesGuard` — comparaba `user.rol`, un campo que no
existe en el payload del JWT (el campo real es `user.idRole`) — lo que hacía que el guard denegara
siempre. Se corrigió ahí mismo.

### Endpoints — panel admin (`@AdminUp()`, rol ≤ 2)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/admin/subscriptions` | Lista todas las suscripciones |
| GET | `/admin/subscriptions/metrics` | MRR + clientes activos (ver nota abajo) |
| GET | `/admin/subscriptions/:idRanch` | Una suscripción puntual |
| POST | `/admin/subscriptions/:idRanch/activate` | Asigna un plan — body `{ idPlan, billingCycle? }` |
| POST | `/admin/subscriptions/:idRanch/payments` | Registra un pago — body `{ amount, paymentDate, paymentMethod, periodExtendedMonths, externalReference?, notes?, localId? }` |
| PATCH | `/admin/subscriptions/:idRanch/cancel` | Cancela (setea `cancelledAt`) |

**`activate`**: si el plan tiene `priceMonthly > 0` (o sea, no es Free), `billingCycle` es
**obligatorio** — si se omite, `400 BILLING_CYCLE_REQUIRED`. No es solo validación de forma:
`billingCycle` decide si `getMetrics()` usa `priceMonthly` o `priceAnnual/12`, así que dejarlo sin
definir haría que el MRR asuma mensual sin que nadie se entere. Si el plan tiene `trialDays > 0`,
`activate` arranca el trial (`trialEndsAt = hoy + trialDays`) y limpia `cancelledAt`/`billingCycle`
previos.

**`payments`**: extiende `currentPeriodEnd` en `periodExtendedMonths` meses, contados desde la
fecha vigente actual (o desde hoy si ya venció) — y también limpia `trialEndsAt` (un pago real
cierra cualquier trial pendiente).

**`metrics`**: MRR y `activeClients` **solo cuentan suscripciones en estado `active`** — un
`trial` no suma, aunque el operador ya esté usando el plan pago, porque todavía no generó ningún
pago real. Excluye siempre el plan Free.

### Endpoint ranch-facing (`@UserUp()`, cualquier usuario autenticado)

`GET /subscriptions/my-ranch/:idRanch` — el usuario tiene que pertenecer a esa estancia (cualquier
`ranch_role`), si no → `403 PERMISSION_DENIED`. Es el **único** endpoint de este módulo pensado para
ser consumido fuera del panel admin — lo usan tanto la web (para el enforcement de la sección 7)
como, potencialmente, el móvil.

**Forma de la respuesta** (igual en ambos GET, admin y ranch-facing):
```json
{
  "subscription": {
    "id": 1, "idRanch": 1,
    "ranch": { "id": 1, "name": "Estancia Test", "productionTypes": [{ "id": 1, "name": "Cria" }] },
    "idPlan": 2, "billingCycle": "monthly",
    "trialEndsAt": null, "currentPeriodEnd": "2027-03-13", "cancelledAt": null,
    "effectiveStatus": "active",
    "plan": { "id": 2, "name": "Estancia", "capacityMin": 31, "capacityMax": 350, "priceMonthly": 100, "priceAnnual": 1000, "trialDays": 7, "isActive": true },
    "createdAt": "2026-07-15T23:15:48.007Z"
  }
}
```

---

## 7. Web — panel admin (Fase 2) y enforcement al dueño (Fase 3)

Repo: `code/estancia-360-web` (antes vivía en `app-web/estancia-360-web`, movido el 2026-08-06).

### Fase 2 — panel admin (`src/features/admin/`)

`admin-subscriptions-page.tsx` lista todas las estancias con su plan/estado, con 3 acciones por
fila (cada una es un dialog): **activar plan** (`activate-plan-dialog.tsx`), **registrar pago**
(`register-payment-dialog.tsx`, genera `localId: crypto.randomUUID()` en cada envío para la
idempotencia contra doble clic mencionada en la sección 2) y **cancelar** (`cancel-subscription-dialog.tsx`).
`admin-metrics-page.tsx` muestra MRR y clientes activos. Solo accesible con sesión de rol Admin/Root
(`AdminLayout`, gateado con `requireAdmin` en el router).

### Fase 3 — enforcement duro al dueño de estancia (`src/features/subscriptions/`)

Este es el punto más importante para entender la diferencia con el móvil: **la web bloquea todo el
panel**, no solo la creación de animales.

`RequireActivePlan` (`components/require-active-plan.tsx`) envuelve **todo** el layout del panel de
usuario (`RanchLayout`, todo lo que hay debajo de `/dashboard`). Al montar, pide
`GET /subscriptions/my-ranch/:idRanch` y evalúa `hasActivePaidPlan()`:

```typescript
// src/features/subscriptions/types.ts
function hasActivePaidPlan(subscription): boolean {
  return subscription.idPlan !== FREE_PLAN_ID
      && (subscription.effectiveStatus === 'active' || subscription.effectiveStatus === 'trial');
}
```

Si da `false` (Free, o un plan pago pero `expired`/`cancelled`) → en vez de renderizar el panel,
se muestra `PlanRequiredPage` — una pantalla de "necesitás un plan pago para entrar acá", y ninguna
página de adentro (Animales, Cría, Sanidad, lo que sea) llega a montarse. Si da `true`, la
suscripción queda disponible por contexto (`RanchSubscriptionContext`) para que el layout y las
páginas de adentro no tengan que volver a pedirla — así es como, por ejemplo, el menú lateral sabe
qué rubros mostrar sin otro fetch.

**Por qué la web es dura y el móvil es blando**: es una decisión de producto explícita, no una
inconsistencia. El plan Free (hasta 30 animales, gratis) ya funciona como el self-service/demo real
del producto — un operador de campo puede seguir usando la app móvil sin pagar nunca mientras esté
dentro de esa capacidad. El panel web, en cambio, se pensó como una herramienta de gestión/oficina
que justifica el paso a un plan pago — bloquearla completa es lo que empuja la conversión.

---

## 8. Qué necesita el desarrollo móvil (resumen — ver `docs/mobile-guide-pagos.md` para el detalle)

- **Un solo endpoint relevante**: `GET /subscriptions/my-ranch/:idRanch`, mismo shape de la sección
  6. Úsalo para mostrar avisos locales ("tu plan vence en 3 días", "llegaste al límite") **antes**
  de que el usuario intente la acción.
- **Cero sync offline en este módulo** — no hay `POST /sync/pagos`, no hay tablas de pagos en el
  SQLite local, el móvil solo lee.
- **Enforcement soft, no duro**: nunca bloquear el acceso a datos ya sincronizados. Solo hay que
  manejar el `400 SUBSCRIPTION_CAPACITY_EXCEEDED` en los 3 puntos de alta de animales (alta
  directa, parto con cría viva, compra vía Movimientos) — mostrar el mensaje del backend y no
  dejar avanzar esa acción puntual, nada más.
- Si la suscripción está vencida/cancelada, la capacidad cae a 30 (Free) — un mensaje del tipo
  "tu plan venció, algunas funciones están limitadas hasta que se renueve" es más útil para el
  operador que solo mostrar el error crudo del 400 cuando ya intentó cargar el animal 31.

---

## 9. Implementación en el móvil — no existe nada todavía, es desde cero

Confirmado (2026-08-15): no hay ningún archivo relacionado a Pagos/Suscripciones en
`code/estancia-360-app-mobile` — ni hooks, ni pantallas, ni tipos. Esta sección es una guía
concreta de por dónde arrancar, siguiendo las convenciones ya establecidas en ese repo (ver su
`CLAUDE.md` para el detalle completo de estructura — `hooks/<dominio>/use-X.ts` +
`app/views/(tabs)/...` es el patrón repetido en todos los módulos existentes).

**Alcance real para esta primera versión — solo lectura, sin pantallas de pago:**
El móvil **no** necesita una pantalla para "elegir plan" ni para "pagar" — eso ya existe y funciona
en el panel web (Fase 2, sección 7), que es donde el admin de Estancia360 gestiona todo. Lo que el
móvil necesita es **mostrarle al operador en qué estado está su plan** y **avisar livianamente**
cuando una acción va a chocar contra el límite, no bloquear como si fuera el panel web.

**Pasos sugeridos:**

1. **`hooks/config/api.ts`** ya expone `EXPO_PUBLIC_API_URL` — no hace falta nada nuevo ahí.
2. **Nuevo `hooks/subscriptions/use-Subscription.ts`** — un hook que llama
   `GET /subscriptions/my-ranch/:idRanch` (con el `id_ranch` de la sesión activa, ver
   `hooks/auth/use-Auth.ts` para cómo se guarda hoy) y devuelve `{ subscription, isLoading, error }`.
   Sin caché offline, sin SQLite — se pide en caliente cuando hace falta (por ejemplo al entrar al
   menú principal), igual que hace la web con `RequireActivePlan`.
3. **Mostrar el estado en algún lugar visible** — un badge o card en `Management.tsx` (el menú
   principal) con el nombre del plan y, si `effectiveStatus` es `trial` o `expired`, un aviso corto
   (ej. "Prueba termina en X días" / "Plan vencido — algunas funciones están limitadas"). No hace
   falta más que eso para la v1.
4. **Manejar `SUBSCRIPTION_CAPACITY_EXCEEDED` en los 3 lugares donde el móvil ya crea animales**:
   - Alta directa de animal (`hooks/Animals/online/` — el flujo que pega a `POST /ranch-animals`)
   - Registrar parto con cría viva (`hooks/breeding/use-Parturition.ts` o equivalente)
   - Compra vía Movimientos (`hooks/movements/use-AnimalPurchase.ts`, ya existe desde el rediseño de
     Movimientos)

   En los tres, si la respuesta HTTP es `400` con `error: "SUBSCRIPTION_CAPACITY_EXCEEDED"`, mostrar
   el `message` del backend en vez del error genérico — no hace falta lógica de negocio nueva, el
   backend ya validó todo, el móvil solo necesita no tragarse ese código como un error cualquiera.
5. **Nada de esto pasa por `hooks/db.sqlite/sync.ts`** — no agregar Pagos a ninguno de los 5
   endpoints batch existentes, no crear tablas nuevas en `database.ts`/`migrations.ts`. Es tráfico
   100% online, fuera del ciclo offline-first del resto de la app.

**Qué NO construir** (ya cubierto en otro lado, evita reinventar):
- Pantalla de elegir/activar plan → eso lo hace un admin desde la web.
- Registro de pagos/comprobantes → ídem, panel web.
- Cualquier lógica de cálculo de `effectiveStatus` o capacidad → el backend ya la calcula y la
  devuelve resuelta en el JSON, el móvil solo la lee y la muestra.
