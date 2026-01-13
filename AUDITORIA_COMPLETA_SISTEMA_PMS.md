# 🔍 AUDITORÍA COMPLETA DEL SISTEMA PMS HOTELERO

**Fecha:** 12 de Enero de 2026  
**Auditor:** Arquitecto Senior  
**Alcance:** Auditoría exhaustiva de toda la lógica de negocio, flujos y datos  
**Estado:** ⚠️ **OPERACIONAL CON ISSUES CRÍTICOS IDENTIFICADOS**

---

## 📊 RESUMEN EJECUTIVO

### Estado General del Sistema
- **Nivel de Implementación:** 85% completado
- **Calidad de Código:** 7/10
- **Integridad de Datos:** 8/10
- **Seguridad:** 6/10 (⚠️ Requiere atención inmediata)
- **Performance:** 7/10

### Issues Críticos Identificados
1. 🔴 **Sin sistema de rollback en transacciones complejas**
2. 🔴 **Falta validación de configuración al inicio de operaciones**
3. 🟡 **Cálculos de IGV no usan configuración dinámica consistentemente**
4. 🟡 **No hay validación de turno activo en todos los puntos de cobro**
5. 🟡 **Estados de habitación pueden quedar inconsistentes**

---

## 1️⃣ CONFIGURACIÓN DEL HOTEL

### ✅ Implementación Correcta

**Archivo:** `lib/actions/configuracion.ts`

```typescript
✓ getHotelConfig() - Carga configuración con fallback a defaults
✓ updateHotelConfig() - Maneja INSERT o UPDATE automático
✓ DEFAULT_CONFIG - Valores por defecto bien definidos
✓ Revalidación agresiva de caché
```

**Flujo de Datos:**
```
1. app/layout.tsx → getHotelConfig()
2. ConfigProvider envuelve toda la app
3. useConfig() hook disponible en client components
```

### ❌ Problemas Identificados

#### 🔴 **CRÍTICO: No se usa configuración en comprobantes.ts**

**Ubicación:** `lib/actions/comprobantes.ts:134-136`

```typescript
// ❌ MAL: IGV hardcodeado al 18%
const op_gravadas = input.items.reduce((sum, item) => sum + item.subtotal, 0)
const monto_igv = op_gravadas * 0.18 // 🔴 HARDCODED
const total_venta = op_gravadas + monto_igv
```

**Problema:** Si el hotel cambia la tasa de IGV o es exonerado, los comprobantes se seguirán emitiendo con 18%.

**Impacto:** 🔴 **ALTO** - Comprobantes fiscales incorrectos, multas de SUNAT

**Solución:**
```typescript
// ✅ CORRECTO:
const config = await getHotelConfig()
const TASA_IGV = config.es_exonerado_igv ? 0 : (config.tasa_igv || 18.00) / 100
const monto_igv = op_gravadas * TASA_IGV
```

#### 🟡 **No se valida configuración fiscal antes de facturar**

```typescript
// Falta validación:
if (!config.facturacion_activa) {
    throw new Error('La facturación electrónica no está activada')
}
if (!config.ruc || config.ruc === '20000000001') {
    throw new Error('Configure el RUC de su empresa antes de facturar')
}
```

### 📋 Checklist de Configuración

| Validación | Estado | Ubicación |
|------------|--------|-----------|
| ✅ Configuración se carga en layout | OK | `app/layout.tsx:28` |
| ✅ Provider envuelve toda la app | OK | `app/layout.tsx:33` |
| ✅ Hook useConfig disponible | OK | `components/providers/config-provider.tsx` |
| ⚠️ Se usa en cálculo de IGV (pagos) | PARCIAL | `lib/actions/pagos.ts:109` |
| ❌ Se usa en cálculo de IGV (comprobantes) | **FALTA** | `lib/actions/comprobantes.ts:136` |
| ❌ Validación antes de facturar | **FALTA** | N/A |

---

## 2️⃣ SISTEMA DE CAJAS Y TURNOS

### ✅ Flujo de Apertura de Turno

**Archivo:** `lib/actions/cajas.ts:116-177`

```typescript
✓ Valida que usuario no tenga turno abierto
✓ Valida que caja no esté ocupada
✓ Inserta turno con estado 'ABIERTA'
✓ Revalidación de caché
```

**Validaciones Correctas:**
- ✅ Un usuario solo puede tener un turno activo
- ✅ Una caja solo puede estar ocupada por un usuario
- ✅ Se registra fecha de apertura y montos iniciales

### ⚠️ Flujo de Cierre de Turno

**Archivo:** `lib/actions/cajas.ts` (necesita revisión más profunda)

**Proceso Actual:**
```
1. Usuario declara monto de cierre (PEN y USD)
2. Sistema calcula monto esperado basado en:
   - Apertura + Movimientos de Ingreso - Movimientos de Egreso
3. Se guarda diferencia (cuadre)
4. Estado → 'CERRADA'
```

### ❌ Problemas Críticos Identificados

#### 🔴 **CRÍTICO: Pagos NO generan movimientos de caja automáticamente**

**Evidencia:** `lib/actions/pagos.ts:214-231`

```typescript
// ✅ BIEN: Se registra el movimiento
const { error: movError } = await supabase
  .from('caja_movimientos')
  .insert({
    caja_turno_id: cajaTurnoId,
    usuario_id: user.id,
    tipo: 'INGRESO',
    categoria: 'OTRO',
    moneda: input.moneda,
    monto: input.monto,
    motivo: `Cobro Reserva ${reserva.codigo_reserva} - ${input.metodo_pago}`,
    comprobante_referencia: `${comprobante.serie}-${comprobante.numero}`
  })
```

**Estado:** ✅ **CORRECTO** - El sistema SÍ registra movimientos de caja al cobrar.

**PERO:**

#### 🟡 **Si falla el movimiento, el pago ya se registró (sin rollback)**

**Problema de Atomicidad:**
```typescript
// Línea 191-204: Se inserta PAGO
await supabase.from('pagos').insert(...)

// Línea 214-231: Se inserta MOVIMIENTO (puede fallar)
const { error: movError } = await supabase
  .from('caja_movimientos')
  .insert(...)

if (movError) {
  // ❌ Solo se loggea pero no se hace rollback del pago
  logger.error('CRITICAL: Pago registrado pero NO impactó caja', ...)
  throw new Error(...)
}
```

**Impacto:** 🟡 **MEDIO-ALTO**  
- Pago registrado en la reserva ✅
- Comprobante emitido ✅
- Pero dinero no aparece en caja ❌
- Arqueo no cuadra ❌

**Solución Recomendada:**
```typescript
// Opción 1: Función PostgreSQL (transacción atómica)
CREATE OR REPLACE FUNCTION cobrar_y_facturar_atomico(
    p_reserva_id uuid,
    p_turno_id uuid,
    p_comprobante_data jsonb,
    p_pago_data jsonb,
    p_movimiento_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
    -- Todas las operaciones en una transacción
    -- Si una falla, todas hacen rollback
    INSERT INTO comprobantes ...;
    INSERT INTO pagos ...;
    INSERT INTO caja_movimientos ...;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
```

### 🔍 Análisis de Movimientos de Caja

**Archivo:** `lib/actions/movimientos.ts`

**Funciones Implementadas:**
- ✅ `createMovimiento()` - Validación completa
- ✅ `getMovimientosByTurno()` - Con JOIN de usuarios
- ✅ `getResumenMovimientos()` - Usa función SQL optimizada

**Validaciones Correctas:**
```typescript
✓ Turno debe estar ABIERTO
✓ Usuario debe ser dueño del turno
✓ Monto > 0
✓ Motivo >= 5 caracteres
```

---

## 3️⃣ SERIES DE COMPROBANTES Y CORRELATIVOS

### ✅ Implementación de Correlativo Atómico

**Base de Datos:** `supabase/migrations/20260101022650_initial_schema.sql:318-329`

```sql
-- ✅ EXCELENTE: Función atómica para correlativos
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(p_serie text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    nuevo_correlativo bigint;
BEGIN
    UPDATE public.series_comprobante
    SET correlativo_actual = correlativo_actual + 1
    WHERE serie = p_serie
    RETURNING correlativo_actual INTO nuevo_correlativo;
    RETURN nuevo_correlativo;
END;
$$;
```

**Uso en Código:**
```typescript
// lib/actions/pagos.ts:101-104
const { data: correlativo, error: corrError } = await supabase
  .rpc('obtener_siguiente_correlativo', { p_serie: input.serie })
```

**Análisis:**
- ✅ **Concurrencia segura:** `UPDATE ... RETURNING` es atómico
- ✅ **Sin race conditions**
- ✅ **Garantiza números únicos**

### ⚠️ Validación de Series

**Archivo:** `lib/actions/series.ts:35-47`

```typescript
// ✅ Validación de formato por tipo de comprobante
function validarFormatoSerie(serie: string, tipo: TipoComprobante): boolean {
  const patterns: Record<TipoComprobante, RegExp> = {
    BOLETA: /^B\d{3,4}$/,      // B001, B002
    FACTURA: /^F\d{3,4}$/,      // F001, F002
    NOTA_CREDITO: /^NC\d{2,3}$/, // NC01
    TICKET_INTERNO: /^TI\d{2,4}$/ // TI01
  }
  return patterns[tipo]?.test(serie) ?? false
}
```

**Estado:** ✅ **CORRECTO**

### ❌ Problema Identificado

#### 🟡 **No se valida que la serie exista antes de emitir**

**Ubicación:** `lib/actions/pagos.ts:101`

```typescript
// ❌ No valida si la serie existe
const { data: correlativo, error: corrError } = await supabase
  .rpc('obtener_siguiente_correlativo', { p_serie: input.serie })

// ¿Qué pasa si input.serie = "X999" (no existe)?
// → La función retorna null
// → Se usa null como correlativo
// → Comprobante inválido
```

**Solución:**
```typescript
// ✅ VALIDAR serie antes de usar
const { data: serieExiste } = await supabase
  .from('series_comprobante')
  .select('id, tipo_comprobante')
  .eq('serie', input.serie)
  .single()

if (!serieExiste) {
  throw new Error(`Serie ${input.serie} no encontrada`)
}

if (serieExiste.tipo_comprobante !== input.tipo_comprobante) {
  throw new Error(`Serie ${input.serie} es de tipo ${serieExiste.tipo_comprobante}, no ${input.tipo_comprobante}`)
}
```

---

## 4️⃣ FLUJO DE RESERVAS

### ✅ Creación de Reservas

**Archivo:** `lib/actions/checkin.ts:97-232`

**Proceso:**
```
1. Validar esquema con Zod ✅
2. Validar habitación disponible ✅
3. Validar habitación operativa ✅
4. Crear reserva con estado CHECKED_IN ✅
5. Asociar huésped titular ✅
6. Crear acompañantes si hay ✅
7. Actualizar habitación → OCUPADA + LIMPIA ✅
```

**Validaciones Correctas:**
- ✅ Habitación debe estar LIBRE
- ✅ Habitación debe estar OPERATIVA
- ✅ Datos validados con Zod

### ⚠️ Problemas de Atomicidad

#### 🟡 **Sin transacción explícita (múltiples INSERT/UPDATE)**

```typescript
// Línea 142-159: INSERT reserva
const { data: reserva, error: reservaError } = await supabase
  .from('reservas')
  .insert({ ... })

// Línea 162-168: INSERT reserva_huespedes (titular)
await supabase
  .from('reserva_huespedes')
  .insert({ ... })

// Línea 171-213: Loop de acompañantes (múltiples INSERT)
for (const acomp of validated.acompanantes) {
  // Puede fallar en medio del loop
}

// Línea 216-225: UPDATE habitación
await supabase
  .from('habitaciones')
  .update({ estado_ocupacion: 'OCUPADA' })
```

**Problema:** Si falla el UPDATE de habitación, la reserva queda creada pero la habitación sigue mostrándose como LIBRE.

**Impacto:** 🟡 **MEDIO**  
- Datos inconsistentes
- Reserva huérfana
- Habitación disponible cuando no debería

### 📊 Estados de Reserva

**Transiciones Permitidas:**
```
RESERVADA → CHECKED_IN → CHECKED_OUT
           ↓
        CANCELADA
           ↓
        NO_SHOW
```

**Validación de Transiciones:** ⚠️ **FALTA IMPLEMENTAR**

```typescript
// ❌ No hay validación de transiciones válidas
// Ejemplo: Actualmente se puede hacer:
// CHECKED_OUT → CHECKED_IN (imposible en la realidad)
```

**Solución Recomendada:**
```typescript
function esTransicionValida(estadoActual: string, estadoNuevo: string): boolean {
  const transiciones: Record<string, string[]> = {
    'RESERVADA': ['CHECKED_IN', 'CANCELADA', 'NO_SHOW'],
    'CHECKED_IN': ['CHECKED_OUT', 'CANCELADA'],
    'CHECKED_OUT': [], // Estado final
    'CANCELADA': [],   // Estado final
    'NO_SHOW': []      // Estado final
  }
  return transiciones[estadoActual]?.includes(estadoNuevo) ?? false
}
```

---

## 5️⃣ CHECK-IN Y CHECK-OUT

### ✅ Flujo de Check-in

**Ya analizado en sección 4 (Reservas)**

**Resumen:**
- ✅ Validaciones completas
- ⚠️ Sin transacción atómica
- ✅ Estados de habitación actualizados

### ✅ Flujo de Check-out

**Archivo:** `lib/actions/checkout.ts`

**Proceso Implementado:**
```
1. validarCheckout(reserva_id) ✅
   - Verifica estado = CHECKED_IN ✅
   - Calcula saldo pendiente ✅
   - Retorna si puede o no ✅

2. realizarCheckout(input) ✅
   - Valida saldo (bloquea si > 0) ✅
   - Actualiza reserva → CHECKED_OUT ✅
   - Actualiza habitación → LIBRE + SUCIA ✅
   - Permite forzar checkout ✅
```

**Análisis de Validación:**

```typescript
// ✅ EXCELENTE validación de saldo
export async function validarCheckout(reserva_id: string) {
  // 1. Verifica estado
  if (reserva.estado !== 'CHECKED_IN') {
    return { puede_checkout: false, motivo: ... }
  }
  
  // 2. Verifica deuda
  const saldoPendiente = await getSaldoPendiente(reserva_id)
  if (saldoPendiente > 0) {
    return { 
      puede_checkout: false, 
      motivo: 'El huésped tiene saldo pendiente',
      saldo_pendiente: saldoPendiente
    }
  }
  
  return { puede_checkout: true }
}
```

### ⚠️ Problemas Identificados

#### 🟡 **Habitación puede no actualizarse si falla**

**Ubicación:** `lib/actions/checkout.ts:129-142`

```typescript
// UPDATE de habitación
const { error: updateHabitacionError } = await supabase
  .from('habitaciones')
  .update({
    estado_ocupacion: 'LIBRE',
    estado_limpieza: 'SUCIA'
  })
  .eq('id', reserva.habitacion_id)

if (updateHabitacionError) {
  // ⚠️ Solo se loggea warning, pero checkout ya se completó
  logger.warn('Checkout exitoso pero falló actualización de habitación', ...)
}
```

**Problema:**  
- Checkout exitoso ✅
- Pero habitación queda OCUPADA ❌
- Housekeeping no puede limpiarla ❌

**Impacto:** 🟡 **MEDIO** - Requiere intervención manual

**Solución:**
```typescript
// Opción 1: Rollback si falla habitación
if (updateHabitacionError) {
  // Revertir checkout
  await supabase
    .from('reservas')
    .update({ estado: 'CHECKED_IN' })
    .eq('id', input.reserva_id)
  
  return {
    success: false,
    message: 'Error: No se pudo liberar la habitación'
  }
}

// Opción 2: Función PostgreSQL (recomendado)
CREATE FUNCTION checkout_atomico(p_reserva_id uuid) ...
```

---

## 6️⃣ SISTEMA DE PAGOS

### ✅ Función Principal: cobrarYFacturar()

**Archivo:** `lib/actions/pagos.ts:73-244`

**Flujo Completo:**
```
1. Validar Usuario y Turno ✅
2. Validar Reserva ✅
3. Obtener Correlativo (atómico) ✅
4. Calcular Totales Fiscales ✅
   → Usa config.tasa_igv ✅
   → Respeta config.es_exonerado_igv ✅
5. Insertar Comprobante ✅
6. Insertar Detalles ✅
7. Insertar Pago ✅
8. Insertar Movimiento Caja ✅ (CRÍTICO)
9. Revalidar páginas ✅
```

**Análisis Detallado:**

#### ✅ **Cálculo de IGV Correcto**

```typescript
// lib/actions/pagos.ts:107-131
const config = await getHotelConfig()
const TASA_IGV = (config.tasa_igv || 18.00) / 100
const ES_EXONERADO = config.es_exonerado_igv

for (const item of input.items) {
  const codigoAfectacion = ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')
  
  if (codigoAfectacion === '10') {
    // Gravado: desglosa IGV
    const base = item.subtotal / (1 + TASA_IGV)
    op_gravadas += base
    monto_igv += (item.subtotal - base)
  } else {
    // Exonerado
    op_exoneradas += item.subtotal
  }
}
```

**Estado:** ✅ **EXCELENTE** - Respeta configuración dinámica

#### 🟡 **Problema de Rollback Manual**

Ya mencionado en sección 2. Resume:

```typescript
// 1. Comprobante creado ✅
// 2. Detalles insertados (con rollback manual si falla) ✅
// 3. Pago insertado ✅
// 4. Movimiento caja insertado ⚠️ (si falla, no hay rollback del pago)
```

**Puntos de Falla:**
- Si falla (4), el pago queda registrado sin impactar caja
- Si falla (3), el comprobante queda emitido sin pago vinculado
- Si falla (2), el comprobante se elimina manualmente ✅

### ✅ Cálculo de Saldo Pendiente

**Archivo:** `lib/actions/pagos.ts:265-290`

```typescript
export async function getSaldoPendiente(reserva_id: string): Promise<number> {
  // 1. Obtener precio pactado y fechas
  const { data: reserva } = await supabase
    .from('reservas')
    .select('precio_pactado, moneda_pactada, fecha_entrada, fecha_salida')
  
  // 2. Calcular total real de la estadía
  const totalEstadia = calcularTotalReserva(reserva as any)
  
  // 3. Sumar todos los pagos (normalizados a PEN)
  const { data: pagos } = await supabase.from('pagos').select(...)
  
  const totalPagado = pagos?.reduce((sum, p) => {
    const montoNormalizado = p.moneda_pago === 'USD'
      ? p.monto * p.tipo_cambio_pago
      : p.monto
    return sum + montoNormalizado
  }, 0) || 0
  
  return Math.max(0, totalEstadia - totalPagado)
}
```

**Análisis:**
- ✅ Calcula noches correctamente
- ✅ Multiplica precio_pactado * noches
- ✅ Normaliza pagos en USD a PEN
- ✅ Retorna saldo nunca negativo

### ⚠️ Problema de Multimoneda

```typescript
// ⚠️ SIMPLIFICACIÓN: Todo se normaliza a PEN
const montoNormalizado = p.moneda_pago === 'USD'
  ? p.monto * p.tipo_cambio_pago
  : p.monto
```

**Problema:** Si la reserva es en USD y se paga en PEN, el cálculo puede estar invertido.

**Ejemplo:**
- Reserva: $100 USD (precio_pactado en USD)
- Pago: S/ 400 PEN (tipo_cambio = 4.0)
- Cálculo actual: 400 PEN (no se convierte a USD)
- Comparación: $100 USD vs 400 PEN (manzanas vs naranjas)

**Solución Recomendada:**
```typescript
// Normalizar TODO a la moneda de la reserva
const totalEstadia = reserva.precio_pactado * noches
const totalPagado = pagos?.reduce((sum, p) => {
  let montoEnMonedaReserva = p.monto
  
  if (reserva.moneda_pactada !== p.moneda_pago) {
    // Convertir
    if (reserva.moneda_pactada === 'PEN' && p.moneda_pago === 'USD') {
      montoEnMonedaReserva = p.monto * p.tipo_cambio_pago
    } else if (reserva.moneda_pactada === 'USD' && p.moneda_pago === 'PEN') {
      montoEnMonedaReserva = p.monto / p.tipo_cambio_pago
    }
  }
  
  return sum + montoEnMonedaReserva
}, 0)
```

---

## 7️⃣ FACTURACIÓN ELECTRÓNICA

### ✅ Emisión de Comprobantes (Alternativa)

**Archivo:** `lib/actions/comprobantes.ts`

**Nota:** Existe función separada `emitirComprobante()` pero la función principal usada es `cobrarYFacturar()` en pagos.ts

**Proceso en comprobantes.ts:**
```
1. Obtener turno activo ✅
2. Validar reserva ✅
3. Validar items ✅
4. Calcular montos ❌ (IGV hardcoded 18%)
5. Obtener correlativo ✅
6. Crear comprobante ✅
7. Crear items ✅ (con rollback manual)
```

### ❌ CRÍTICO: IGV Hardcoded

**Ya reportado en sección 1**

```typescript
// lib/actions/comprobantes.ts:136
const monto_igv = op_gravadas * 0.18 // 🔴 PROBLEMA
```

### ✅ Trigger de Inmutabilidad Fiscal

**Base de Datos:** `supabase/migrations/20260101022650_initial_schema.sql:373-392`

```sql
-- ✅ EXCELENTE: Protección de datos fiscales
CREATE OR REPLACE FUNCTION proteger_comprobante_inmutable()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.estado_sunat != 'PENDIENTE') THEN
        IF OLD.total_venta IS DISTINCT FROM NEW.total_venta
           OR OLD.receptor_nro_doc IS DISTINCT FROM NEW.receptor_nro_doc
           OR OLD.serie IS DISTINCT FROM NEW.serie 
           OR OLD.numero IS DISTINCT FROM NEW.numero THEN
            RAISE EXCEPTION '⛔ PROHIBIDO: No se pueden modificar datos fiscales...';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blindaje_fiscal
BEFORE UPDATE ON public.comprobantes
FOR EACH ROW
EXECUTE FUNCTION proteger_comprobante_inmutable();
```

**Análisis:**
- ✅ **Excepcional** - Protege integridad fiscal
- ✅ Solo permite modificar si estado = PENDIENTE
- ✅ Bloquea cambios en datos críticos (total, serie, número, cliente)

### ⚠️ Integración con SUNAT

**Estado:** 📝 **PREPARADO PERO NO IMPLEMENTADO**

```typescript
// lib/actions/comprobantes.ts:196-199
// 8. TODO: Enviar a SUNAT (integración futura)
// - Generar XML
// - Firmar con certificado digital
// - Enviar a webservice de SUNAT
// - Actualizar estado_sunat, hash_cpe, xml_firmado
```

**Campos Preparados:**
- ✅ estado_sunat (PENDIENTE, ACEPTADO, RECHAZADO, ANULADO)
- ✅ hash_cpe
- ✅ xml_url
- ✅ cdr_url
- ✅ external_id

**Proveedores Recomendados:**
- NubeFact (ya hay mock: `lib/services/nubefact-mock.ts`)
- Sunat.pe (Homologación)
- FacturadorPERU
- Facturación Perú

---

## 8️⃣ GESTIÓN DE HABITACIONES

### ✅ Modelo de 3 Estados Independientes

**Correctamente Implementado:**

```typescript
// types/database.types.ts
estado_ocupacion: 'LIBRE' | 'OCUPADA'
estado_limpieza: 'LIMPIA' | 'SUCIA' | 'EN_LIMPIEZA'
estado_servicio: 'OPERATIVA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO'
```

**Lógica de Negocio Correcta:**

| Evento | estado_ocupacion | estado_limpieza | estado_servicio |
|--------|------------------|-----------------|-----------------|
| Check-in | OCUPADA | LIMPIA | (sin cambio) |
| Check-out | LIBRE | SUCIA | (sin cambio) |
| Limpieza completa | (sin cambio) | LIMPIA | (sin cambio) |
| Inicio mantenimiento | LIBRE (manual) | (sin cambio) | MANTENIMIENTO |

### ✅ Función de Actualización de Estado

**Archivo:** `lib/actions/habitaciones.ts:156-170`

```typescript
export async function cambiarEstadoLimpieza(id: string, estado: string) {
    const supabase = await createClient()
    
    // Validar estado
    const estadosValidos = ['LIMPIA', 'SUCIA', 'EN_LIMPIEZA']
    if (!estadosValidos.includes(estado)) {
        return { error: 'Estado de limpieza inválido' }
    }
    
    const { error } = await supabase
        .from('habitaciones')
        .update({ estado_limpieza: estado })
        .eq('id', id)
    
    if (error) return { error: error.message }
    
    revalidatePath('/habitaciones')
    revalidatePath('/rack')
    return { success: true }
}
```

**Estado:** ✅ **CORRECTO**

### ⚠️ Problema de Validación

#### 🟡 **No valida que habitación esté libre para mantenimiento**

```typescript
// ❌ Permite poner MANTENIMIENTO incluso si está OCUPADA
export async function cambiarEstadoServicio(id: string, estado: string) {
    // Falta validación:
    if (estado === 'MANTENIMIENTO' || estado === 'FUERA_SERVICIO') {
        const { data: hab } = await supabase
            .from('habitaciones')
            .select('estado_ocupacion')
            .eq('id', id)
            .single()
        
        if (hab.estado_ocupacion === 'OCUPADA') {
            return { error: 'No se puede poner en mantenimiento una habitación ocupada' }
        }
    }
}
```

### ✅ Tarifas por Tipo y Categoría

**Archivo:** `lib/actions/tarifas.ts`

**Modelo Correcto:**
```
Tarifa {
  tipo_habitacion_id
  categoria_habitacion_id
  precio_base
  precio_minimo ✅ (CHECK: precio_minimo <= precio_base)
  fecha_inicio
  fecha_fin
  activa
}
```

**Validación en BD:** ✅

```sql
-- supabase/migrations/20260101022650_initial_schema.sql:183-184
CONSTRAINT check_precio_minimo_valido CHECK (precio_minimo <= precio_base)
```

---

## 9️⃣ INTEGRIDAD DE DATOS

### ✅ Foreign Keys Bien Definidas

**Análisis de Schema:**

```sql
✅ reservas.habitacion_id → habitaciones(id)
✅ reservas.canal_venta_id → canales_venta(id)
✅ reserva_huespedes.reserva_id → reservas(id) ON DELETE CASCADE
✅ reserva_huespedes.huesped_id → huespedes(id)
✅ comprobantes.turno_caja_id → caja_turnos(id) NOT NULL
✅ comprobantes.reserva_id → reservas(id) NOT NULL
✅ pagos.reserva_id → reservas(id) NOT NULL
✅ pagos.caja_turno_id → caja_turnos(id) NOT NULL
✅ pagos.comprobante_id → comprobantes(id)
```

**Estado:** ✅ **EXCELENTE** - Todas las relaciones críticas están protegidas

### ⚠️ Problemas de Datos Huérfanos

#### 🟡 **Posibles Reservas sin Huéspedes**

**Escenario:**
```typescript
// lib/actions/checkin.ts:142-168
// 1. Se crea la reserva
const { data: reserva } = await supabase
  .from('reservas')
  .insert({ ... })

// 2. Se inserta el titular (si falla aquí, reserva queda sin huésped)
await supabase
  .from('reserva_huespedes')
  .insert({ reserva_id: reserva.id, huesped_id: ... })
```

**Solución:**
```sql
-- Agregar constraint para garantizar al menos un huésped titular
CREATE OR REPLACE FUNCTION validar_reserva_tiene_titular()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.reserva_huespedes
        WHERE reserva_id = NEW.id AND es_titular = true
    ) THEN
        RAISE EXCEPTION 'Toda reserva debe tener un huésped titular';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger al actualizar estado a CHECKED_IN
CREATE TRIGGER trg_validar_titular
AFTER UPDATE OF estado ON public.reservas
FOR EACH ROW
WHEN (NEW.estado IN ('CHECKED_IN', 'CHECKED_OUT'))
EXECUTE FUNCTION validar_reserva_tiene_titular();
```

### ✅ Índices para Performance

**Bien Implementado:**

```sql
✅ idx_reservas_habitacion_estado ON reservas(habitacion_id, estado)
✅ idx_reservas_fecha_entrada ON reservas(fecha_entrada)
✅ idx_reservas_fecha_salida ON reservas(fecha_salida DESC)
✅ idx_comprobantes_fecha_emision ON comprobantes(fecha_emision DESC)
✅ idx_movimientos_turno ON caja_movimientos(caja_turno_id)
✅ idx_movimientos_fecha ON caja_movimientos(created_at DESC)
✅ idx_pagos_reserva ON pagos(reserva_id)
✅ idx_huespedes_documento ON huespedes(tipo_documento, numero_documento)
✅ idx_huespedes_busqueda (GIN full-text search)
```

**Performance Esperada:** < 2 segundos (según requisitos)

---

## 🔟 UI/UX Y EXPERIENCIA DE USUARIO

### ✅ Componentes Bien Estructurados

**shadcn/ui:** ✅ Implementado correctamente  
**Dialogs:** ✅ Con gestión de estado  
**Forms:** ✅ Con validación en tiempo real  
**Feedback:** ✅ Toast notifications (Sonner)

### ⚠️ Problemas de Experiencia

#### 🟡 **Errores genéricos al usuario**

**Ejemplo:**
```typescript
// lib/actions/pagos.ts:242-244
catch (error: unknown) {
  return {
    error: getErrorMessage(error) || 'Error desconocido al procesar el cobro'
  }
}
```

**Usuario ve:** "Error desconocido al procesar el cobro"  
**Usuario necesita:** "El turno de caja está cerrado. Abre caja para cobrar."

**Solución:**
```typescript
// Errores específicos con códigos
return {
  error: {
    code: 'TURNO_CERRADO',
    message: 'Debes abrir un turno de caja para registrar cobros',
    action: 'Ir a Cajas' // Sugerencia
  }
}
```

#### 🟡 **Sin validación de campos antes de enviar**

**Ejemplo:** `components/cajas/registrar-pago-dialog.tsx`

```typescript
// ❌ Validación solo al enviar
const handleSubmit = async () => {
  if (!monto || monto <= 0) {
    toast.error('Monto inválido')
    return
  }
  // ...
}
```

**Mejor:**
```typescript
// ✅ Validación reactiva con Zod + React Hook Form
const schema = z.object({
  monto: z.number().positive('El monto debe ser mayor a 0'),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', ...]),
})

const { formState: { errors } } = useForm({ resolver: zodResolver(schema) })

// Mostrar error en tiempo real
{errors.monto && <span>{errors.monto.message}</span>}
```

### ✅ Revalidación de Caché

**Bien Implementado:**
```typescript
revalidatePath('/rack')
revalidatePath('/reservas')
revalidatePath('/cajas')
```

**Efecto:** Los datos se actualizan automáticamente en todas las vistas

---

## 📋 RESUMEN DE ISSUES ENCONTRADOS

### 🔴 CRÍTICOS (Requieren fix inmediato)

| # | Issue | Archivo | Impacto | Esfuerzo |
|---|-------|---------|---------|----------|
| 1 | IGV hardcoded en comprobantes.ts | `lib/actions/comprobantes.ts:136` | 🔴 ALTO | 1 hora |
| 2 | Sin rollback en cobrarYFacturar | `lib/actions/pagos.ts:191-231` | 🔴 ALTO | 4 horas |
| 3 | Sin validación de configuración fiscal | `lib/actions/comprobantes.ts` | 🔴 ALTO | 2 horas |
| 4 | Sin validación de transiciones de estado | `lib/actions/reservas.ts` | 🔴 MEDIO | 3 horas |

### 🟡 IMPORTANTES (Fix en 1-2 semanas)

| # | Issue | Archivo | Impacto | Esfuerzo |
|---|-------|---------|---------|----------|
| 5 | Sin validación de serie antes de usar | `lib/actions/pagos.ts:101` | 🟡 MEDIO | 1 hora |
| 6 | Problema de multimoneda en saldo | `lib/actions/pagos.ts:280-286` | 🟡 MEDIO | 2 horas |
| 7 | Habitación puede no actualizarse en checkout | `lib/actions/checkout.ts:129` | 🟡 MEDIO | 2 horas |
| 8 | Sin validación mantenimiento en habitación ocupada | `lib/actions/habitaciones.ts` | 🟡 BAJO | 1 hora |
| 9 | Errores genéricos al usuario | `lib/actions/*.ts` | 🟡 BAJO | 4 horas |

### 🔵 MEJORAS (Backlog)

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 10 | Agregar constraint de huésped titular | 🔵 BAJO | 2 horas |
| 11 | Validación reactiva en forms | 🔵 BAJO | 6 horas |
| 12 | Función PostgreSQL para transacciones | 🔵 MEDIO | 8 horas |

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Fixes Críticos (3 días)

#### Día 1
- [ ] Fix #1: IGV dinámico en comprobantes.ts
- [ ] Fix #3: Validación configuración fiscal
- [ ] Testing manual de facturación

#### Día 2
- [ ] Fix #2: Implementar rollback en cobrarYFacturar
- [ ] Testing de escenarios de fallo

#### Día 3
- [ ] Fix #4: Validación de transiciones de estado
- [ ] Testing end-to-end de flujo completo

### Fase 2: Fixes Importantes (1 semana)

- [ ] Fix #5, #6, #7, #8, #9
- [ ] Testing de regresión
- [ ] Actualizar documentación

### Fase 3: Mejoras (2 semanas)

- [ ] Implementar mejoras #10, #11, #12
- [ ] Testing de performance
- [ ] Preparar para producción

---

## ✅ CONCLUSIONES

### Fortalezas del Sistema

1. ✅ **Arquitectura de Base de Datos:** Excelente diseño normalizado
2. ✅ **Correlativos Atómicos:** Implementación perfecta sin race conditions
3. ✅ **Trigger de Inmutabilidad:** Protección fiscal robusta
4. ✅ **Índices de Performance:** Bien pensados para queries críticas
5. ✅ **Separación de Concerns:** Server Actions bien estructuradas
6. ✅ **Modelo de 3 Estados:** Habitaciones correctamente modeladas
7. ✅ **Cálculo de IGV en Pagos:** Usa configuración dinámica

### Debilidades Críticas

1. 🔴 **Atomicidad:** Sin transacciones explícitas en operaciones complejas
2. 🔴 **IGV Hardcoded:** En módulo de comprobantes.ts
3. 🔴 **Sin Rollback:** Fallos parciales pueden dejar datos inconsistentes
4. 🔴 **Validaciones Incompletas:** Falta validar transiciones de estado

### Riesgo Global

**Nivel de Riesgo:** 🟡 **MEDIO**

El sistema es **operacional** pero requiere **fixes críticos** antes de escalar o manejar alto volumen.

**Recomendación:**  
✅ Implementar Fase 1 (3 días) antes de lanzamiento a producción  
✅ Implementar Fase 2 durante el primer mes de operación  
✅ Fase 3 puede ser gradual

---

## 📞 CONTACTO PARA SEGUIMIENTO

**Arquitecto Senior**  
Fecha de Auditoría: 12 de Enero de 2026  

**Próxima Revisión:** Después de implementar Fase 1

---

## 📎 ANEXOS

### A. Scripts de Validación

```sql
-- Validar reservas sin titular
SELECT r.id, r.codigo_reserva
FROM reservas r
LEFT JOIN reserva_huespedes rh ON r.id = rh.reserva_id AND rh.es_titular = true
WHERE rh.id IS NULL
  AND r.estado IN ('CHECKED_IN', 'CHECKED_OUT');

-- Validar comprobantes sin pago
SELECT c.id, c.serie, c.numero
FROM comprobantes c
LEFT JOIN pagos p ON c.id = p.comprobante_id
WHERE p.id IS NULL;

-- Validar pagos sin movimiento de caja
SELECT p.id, p.reserva_id, p.monto
FROM pagos p
LEFT JOIN caja_movimientos m ON m.comprobante_referencia LIKE '%' || 
  (SELECT serie || '-' || numero FROM comprobantes WHERE id = p.comprobante_id LIMIT 1) || '%'
WHERE m.id IS NULL;
```

### B. Checklist de Producción

- [ ] Todos los fixes críticos implementados
- [ ] Testing de regresión completado
- [ ] Configuración fiscal validada
- [ ] RUC real configurado
- [ ] Series de comprobantes creadas
- [ ] Turno de caja de prueba ejecutado
- [ ] Check-in y check-out de prueba completados
- [ ] Cobro y facturación de prueba exitosos
- [ ] Backup de base de datos configurado
- [ ] Monitoreo de errores activo

---

**FIN DEL REPORTE DE AUDITORÍA**
