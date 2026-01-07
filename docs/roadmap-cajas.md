# 🏦 ROADMAP v2.0 - MÓDULO DE CAJAS & TESORERÍA

## 📋 VISIÓN GENERAL ACTUALIZADA

Sistema de gestión de cajas blindado que incluye:

* **Control de turnos con Cierre Ciego** (Seguridad)
* **Gestión de Egresos/Gastos Menores** (Movimientos)
* **Arqueo Multimoneda** (PEN / USD)
* **Series de facturación atómicas**
* **Auditoría Forense** (Sobrantes/Faltantes reales)

---

## 🎯 HITO 0: Configuración Financiera (NUEVO)

**Objetivo**: Preparar el terreno para multimoneda y denominaciones.

### Archivo: `lib/config/denominaciones.ts` (o en BD)

**Estructura**:

```typescript
export const DENOMINACIONES = {
  PEN: [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10],
  USD: [100, 50, 20, 10, 5, 1]
}

```

*Nota: Idealmente esto vive en `hotel_configuracion` columna `config_financiera` (JSONB).*

---

## 🎯 HITO 1: Server Actions - Gestión de Cajas (CRUD)

*(Se mantiene igual, solo validando que soporte asignación de monedas si fuera necesario en el futuro).*

---

## 🎯 HITO 2: Server Actions - Series de Comprobantes

*(Se mantiene igual. La lógica de correlativos atómicos es vital).*

---

## 🎯 HITO 3: Server Actions - Turnos de Caja (CORE)

**Objetivo**: Lógica de apertura, cierre ciego y contingencias.

### Archivo: `lib/actions/turnos.ts`

**Nuevas/Modificadas Funciones**:

```typescript
// Abrir turno (Soporte Multimoneda en apertura)
abrirTurno(data: {
  caja_id: string
  usuario_id: string
  monto_apertura_pen: number
  monto_apertura_usd: number // Nuevo
}): Promise<Result>

// Cerrar turno (AHORA ES CIERRE CIEGO)
// El backend recibe lo contado, compara con sistema y guarda la diferencia.
cerrarTurno(data: {
  turno_id: string
  // Montos declarados (Lo que el usuario contó)
  declarado_pen: number
  declarado_usd: number
  // Detalles del arqueo (billetaje)
  arqueo_pen: Record<string, number> 
  arqueo_usd: Record<string, number>
}): Promise<{
  success: true,
  // NO devolvemos la diferencia al frontend inmediatamente para no delatar
  mensaje: "Turno cerrado correctamente"
}>

// ADMINISTRATIVO: Cierre Forzoso
forceCloseTurno(turnoId: string, adminId: string): Promise<Result>

```

**Schema Actualizado (`caja_turnos`)**:

* Agregar columnas: `monto_apertura_usd`, `monto_cierre_declarado_usd`, `monto_cierre_sistema_usd`.

---

## 🎯 HITO 4: Server Actions - Movimientos de Caja (NUEVO)

**Objetivo**: Registrar salidas de dinero (pagos menores, compras) o ingresos extras (sencillo).

### Archivo: `lib/actions/movimientos.ts`

**Funciones a crear**:

```typescript
// Registrar movimiento
createMovimiento(data: {
  turno_id: string // Se vincula al turno activo
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  moneda: 'PEN' | 'USD'
  motivo: string // "Compra de papel", "Pago taxi", "Dotación sencillo"
  evidencia_url?: string // Foto del recibo (opcional)
}): Promise<Result>

// Listar movimientos de un turno
getMovimientosByTurno(turnoId: string): Promise<Result>

```

**Schema a crear (`caja_movimientos`)**:

```sql
CREATE TABLE public.caja_movimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_turno_id uuid REFERENCES public.caja_turnos(id) NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL, -- Quién lo hizo
    tipo text CHECK (tipo IN ('INGRESO', 'EGRESO')) NOT NULL,
    moneda text DEFAULT 'PEN',
    monto numeric(12,2) NOT NULL,
    motivo text NOT NULL,
    created_at timestamptz DEFAULT now()
);

```

**Impacto en Cierre**:

* `Total Sistema = (Apertura + Pagos + IngresosManuales) - EgresosManuales`

---

## 🎯 HITO 5 & 6: UI Configuración y Middleware

*(Se mantienen igual. El middleware `check-turno` es vital).*

---

## 🎯 HITO 7: UI - Modal Apertura de Turno (Actualizado)

**Cambios**:

* Inputs duales: "Monto Apertura Soles (S/)" y "Monto Apertura Dólares ($)".
* Validación de caja disponible.

---

## 🎯 HITO 8: Widget Caja Activa (Actualizado)

**Objetivo**: Panel de control rápido en el Header/Sidebar.

**Display**:

```
┌──────────────────────────────────┐
│ 🟢 TURNO ACTIVO: Juan Pérez      │
│ 💵 Caja Principal                │
│ -------------------------------- │
│ [ ➕ Ingreso ]  [ ➖ Egreso ]    │ <--- NUEVOS BOTONES
│ [ 🔒 Cerrar Turno ]              │
└──────────────────────────────────┘

```

**Funcionalidad**:

* Botón **Egreso**: Abre modal para registrar "Salida de dinero" (Hito 4).
* Pide: Monto, Moneda, Motivo.
* Resta visualmente del "Disponible en Caja" (Opcional: Ocultar disponible para mayor seguridad).



---

## 🎯 HITO 9: UI - Cierre de Turno "CIEGO" (CRÍTICO)

**Objetivo**: Modal de cierre donde el usuario NO ve cuánto espera el sistema.

### Componente: `components/cajas/modal-cierre-ciego.tsx`

**Paso 1: Conteo de Dinero (Arqueo)**

* **Sin pistas:** No mostrar "El sistema espera S/ 1000".
* **Calculadora de Billetes (Configurable del Hito 0):**
* Pestaña SOLES: `[__] x S/ 200`, `[__] x S/ 100`... -> Total PEN.
* Pestaña DÓLARES: `[__] x $100`, `[__] x$ 50`... -> Total USD.


* **Otros Medios:** Input manual para sumar vouchers de Tarjeta y Yape (Validación cruzada).

**Paso 2: Confirmación**

* Mensaje: *"Estás declarando S/ 1,500.00 y $ 50.00. Una vez cerrado no hay cambios."*
* Botón: "Confirmar Cierre".

**Paso 3: Feedback Post-Cierre**

* Una vez procesado, **recién** se muestra el resultado:
* ✅ CUADRE EXACTO
* ó
* ⚠️ DESCUADRE (Se notifica al admin internamente).



---

## 🎯 HITO 10: UI - Historial y Auditoría

**Cambios**:

* Las tablas deben mostrar columnas separadas para PEN y USD.
* Filtro nuevo: "Ver solo turnos con Descuadre".
* Botón para Admin: **"Cierre Forzoso"** (para turnos abandonados).

---

## 🎯 HITO 11: Reporte Detallado de Turno

**Sección Nueva: "Flujo de Efectivo"**:

```
+ Apertura:      S/  50.00
+ Ventas (Efec): S/ 500.00
+ Ingresos Ext:  S/   0.00
- Egresos (Gtos):S/ -20.00  (Ej: Compra Limpiavidrios)
--------------------------
= TEÓRICO:       S/ 530.00

```

*Esto permite auditoría rápida de por qué falta dinero.*

---

## 🎯 HITO 12: Integración de Pagos (Link)

*(Se mantiene la lógica crítica: `pago` -> `caja_turno_id`).*

---

## 📊 RESUMEN DE CAMBIOS EN BD

Para aplicar este roadmap, necesitas ejecutar estos cambios en tu esquema SQL:

```sql
-- 1. Actualizar caja_turnos para multimoneda
ALTER TABLE public.caja_turnos 
ADD COLUMN monto_apertura_usd numeric(12,2) DEFAULT 0,
ADD COLUMN monto_cierre_declarado_usd numeric(12,2) DEFAULT 0,
ADD COLUMN monto_cierre_sistema_usd numeric(12,2) DEFAULT 0;

-- 2. Crear tabla de movimientos (La "Caja Chica")
CREATE TABLE public.caja_movimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_turno_id uuid REFERENCES public.caja_turnos(id) NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL,
    tipo text CHECK (tipo IN ('INGRESO', 'EGRESO')) NOT NULL, -- Ingreso=Sencillo, Egreso=Gasto
    moneda text DEFAULT 'PEN',
    monto numeric(12,2) NOT NULL,
    motivo text NOT NULL, -- Obligatorio
    comprobante_referencia text, -- Opcional (si compró algo con factura)
    created_at timestamptz DEFAULT now()
);

-- 3. Índices para velocidad
CREATE INDEX idx_movimientos_turno ON public.caja_movimientos(caja_turno_id);

```

### ✅ ESTADO DEL ROADMAP

Con estos ajustes, tu módulo de cajas pasa de ser un simple registro a una herramienta de **Control Financiero Real**. Cubre robos, errores, gastos operativos y operación turística (dólares).