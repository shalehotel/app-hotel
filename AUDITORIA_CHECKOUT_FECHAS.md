# AUDITORÍA: Gestión de Fechas en Checkout

## PREGUNTA CRÍTICA
¿Cuándo se hace checkout, la fecha_salida se actualiza o permanece inmutable?

## RESPUESTA
✅ **CORRECTO**: El sistema usa la arquitectura correcta.

### Esquema de Base de Datos

```sql
CREATE TABLE reservas (
  -- FECHAS PACTADAS (INMUTABLES - Contrato original)
  fecha_entrada timestamptz NOT NULL,
  fecha_salida timestamptz NOT NULL,
  
  -- FECHAS REALES (LO QUE REALMENTE OCURRIÓ)
  check_in_real timestamptz,
  check_out_real timestamptz,
  
  estado estado_reserva_enum,
  ...
)
```

**Diferencia**:
- `fecha_entrada/fecha_salida`: Lo que se PACTÓ (reserva original, inmutable)
- `check_in_real/check_out_real`: Lo que REALMENTE ocurrió (auditoría, libro de huéspedes)

---

## AUDITORÍA DEL CÓDIGO DE CHECKOUT

### Archivo: `lib/actions/checkout.ts` (líneas 100-110)

```typescript
// 3. Actualizar estado de la reserva a CHECKED_OUT
const { error: updateReservaError } = await supabase
  .from('reservas')
  .update({
    estado: 'CHECKED_OUT',
    huesped_presente: false,
    check_out_real: new Date().toISOString()  // ✅ CORRECTO: Registra fecha real
  })
  .eq('id', input.reserva_id)
```

**✅ VERIFICACIÓN**: El checkout actualiza `check_out_real`, NO `fecha_salida`.

---

## COMPORTAMIENTO CORRECTO

### Escenario 1: Checkout a tiempo (10-feb)
```
Reserva: 6-feb al 9-feb (checkout 10-feb 13:00)
Checkout realizado: 10-feb 12:00

Resultado en BD:
- fecha_salida: 2026-02-10 13:00:00+00  (inmutable)
- check_out_real: 2026-02-10 12:00:00+00 (adelantado)
- estado: CHECKED_OUT
```

### Escenario 2: Checkout tarde (11-feb - CASO ACTUAL)
```
Reserva: 6-feb al 9-feb (checkout 10-feb 13:00)
Checkout realizado: 11-feb 14:30

Resultado en BD:
- fecha_salida: 2026-02-10 13:00:00+00  (inmutable)
- check_out_real: 2026-02-11 14:30:00+00 (atrasado 1 día)
- estado: CHECKED_OUT
```

### Escenario 3: Checkout muy tarde (15-feb)
```
Reserva: 6-feb al 9-feb (checkout 10-feb 13:00)
Checkout realizado: 15-feb 10:00

Resultado en BD:
- fecha_salida: 2026-02-10 13:00:00+00  (inmutable)
- check_out_real: 2026-02-15 10:00:00+00 (atrasado 5 días)
- estado: CHECKED_OUT
```

---

## LIBRO DE HUÉSPEDES

### Archivo: `lib/actions/reportes.ts` (líneas 88-89)

```typescript
const fechaIngreso = reserva.check_in_real || reserva.fecha_entrada  // ✅ CORRECTO
const fechaSalida = reserva.fecha_salida  // ❌ INCORRECTO
```

**❌ PROBLEMA CRÍTICO**: El libro usa fecha pactada en lugar de fecha real.

### Impacto

**Escenario**:
- Reserva: 6-feb al 9-feb (4 noches)
- Check-in real: 6-feb 14:00
- Check-out real: 11-feb 10:00 (2 días tarde)
- Estadía real: 5 noches

**Libro de Huéspedes registra**:
```
Entrada: 6-feb 14:00 (✅ correcto)
Salida: 10-feb (❌ incorrecto, debería ser 11-feb)
Noches: 4 (❌ incorrecto, fueron 5)
```

**Consecuencias**:
1. Estadísticas de ocupación incorrectas
2. Auditoría SUNAT con datos falsos
3. Imposible conciliar con facturación (si se cobró las 5 noches)

---

## AUDITORÍA COMPLETA

### ✅ CORRECTO: Checkout

**Archivo**: `lib/actions/checkout.ts`
- Actualiza `check_out_real` con fecha/hora real
- NO modifica `fecha_salida` (pactada permanece inmutable)
- Comportamiento: ✅ CORRECTO

### ❌ INCORRECTO: Libro de Huéspedes  

**Archivo**: `lib/actions/reportes.ts` (línea 88-89)
- Usa `check_in_real` para entrada ✅
- Usa `fecha_salida` para salida ❌ (debería usar `check_out_real`)
- **BUG**: Días de estadía calculados incorrectamente cuando checkout es tarde

### ❓ PENDIENTE REVISAR: Facturación

**¿Qué fecha usa para calcular noches cobradas?**
- Si usa `fecha_salida`: Cliente pagó 4 noches pero se quedó 5 (pérdida)
- Si usa `check_out_real`: Cliente pagó 5 noches correctamente ✅

**Acción**: Revisar `lib/actions/facturacion.ts` o similar

---

## SOLUCIÓN RECOMENDADA

### Fix Libro de Huéspedes

```typescript
// ANTES (línea 88-89 de reportes.ts)
const fechaIngreso = reserva.check_in_real || reserva.fecha_entrada
const fechaSalida = reserva.fecha_salida

// DESPUÉS
const fechaIngreso = reserva.check_in_real || reserva.fecha_entrada
const fechaSalida = reserva.check_out_real || reserva.fecha_salida  // ✅ Priorizar real

// Cálculo de días
const dias = Math.max(1, Math.ceil(
    (new Date(fechaSalida).getTime() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)
))
```

**Cambio**: `check_out_real || fecha_salida` (si no han hecho checkout, usar pactada como fallback)

---

## QUERY DE VERIFICACIÓN

```sql
-- Ver reservas con checkout tarde y diferencia en días
SELECT 
    r.codigo_reserva,
    r.fecha_entrada as entrada_pactada,
    r.fecha_salida as salida_pactada,
    r.check_in_real as entrada_real,
    r.check_out_real as salida_real,
    (r.fecha_salida::date - r.fecha_entrada::date) as noches_pactadas,
    (r.check_out_real::date - r.check_in_real::date) as noches_reales,
    (r.check_out_real::date - r.check_in_real::date) - (r.fecha_salida::date - r.fecha_entrada::date) as diferencia_dias
FROM reservas r
WHERE r.estado = 'CHECKED_OUT'
  AND r.check_out_real IS NOT NULL
  AND r.check_out_real::date > r.fecha_salida::date
ORDER BY r.check_out_real DESC
LIMIT 20;
```

**Propósito**: Identificar casos donde cliente se quedó más días de los pactados.

---

## RESUMEN EJECUTIVO

| Componente | Estado | Usa Fecha Correcta | Impacto |
|------------|--------|-------------------|---------|
| Checkout | ✅ | `check_out_real` | Ninguno |
| Libro Huéspedes | ❌ | `fecha_salida` (pactada) | **CRÍTICO** |
| Facturación | ❓ | Por revisar | **ALTO** |
| Estadísticas | ❓ | Por revisar | **MEDIO** |

**Prioridad**: Arreglar libro de huéspedes INMEDIATAMENTE (impacto legal/SUNAT).

<function_calls>
<invoke name="grep_search">
<parameter name="isRegexp">true