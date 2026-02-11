# 🔍 AUDITORÍA EXTREMA: DESAPARICIÓN DE RESERVAS EN EL RACK

**Fecha**: 11 de febrero de 2026  
**Reportado por**: Usuario  
**Problema**: Reserva con checkout ayer (10-feb) desapareció del rack hoy (11-feb) sin hacer checkout. La alerta de "checkout atrasado" aparece, pero el bloque visual en el rack no existe.

---

## 📋 RESUMEN EJECUTIVO

**DIAGNÓSTICO**: ✅ **NO HAY AUTO-CHECKOUT AUTOMÁTICO**  
**CAUSA RAÍZ**: 🔴 **FILTRO RESTRICTIVO EN `getRackReservas()`**  
**ESTADO**: La reserva sigue en estado `CHECKED_IN` en la BD, pero **NO SE MUESTRA EN EL RACK**  
**SEVERIDAD**: 🔴 **CRÍTICA** - Pérdida de visibilidad operacional

---

## 🔬 HALLAZGOS TÉCNICOS

### 1. ❌ NO EXISTE AUTO-CHECKOUT
**Ubicación auditada**: Todos los archivos del proyecto  
**Resultado**: Búsqueda exhaustiva de patrones `auto.*checkout`, `automatic.*checkout`, `scheduled.*checkout` retornó **0 coincidencias funcionales**.

**Conclusión**: El sistema **NO tiene** ningún proceso automático que cambie el estado de las reservas de `CHECKED_IN` a `CHECKED_OUT`.

---

### 2. 🔴 PROBLEMA IDENTIFICADO: Filtro en `getRackReservas()`

**Archivo**: `lib/actions/rack.ts:89`

```typescript
export async function getRackReservas(fechaInicio: Date, fechaFin: Date) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reservas')
    .select(`...`)
    .gte('fecha_salida', fechaInicio.toISOString())  // ✅ Reservas que terminan DESPUÉS de fechaInicio
    .lte('fecha_entrada', fechaFin.toISOString())    // ✅ Reservas que empiezan ANTES de fechaFin
    .in('estado', ['RESERVADA', 'CHECKED_IN'])       // ✅ Solo activas
```

**Análisis del rango de fechas**:

```typescript
// En hooks/use-rack-data.ts:61-66
const today = startOfDay(new Date())          // 11-feb-2026 00:00:00
const PAST_DAYS_CONTEXT = 3
const startDate = addDays(today, -PAST_DAYS_CONTEXT)  // 08-feb-2026 00:00:00
const endDate = addDays(today, daysRange - PAST_DAYS_CONTEXT)
```

**Escenario del problema**:

| Evento | Fecha | Condición |
|--------|-------|-----------|
| Reserva CHECK-IN | 08-feb-2026 | ✅ `fecha_entrada <= endDate` |
| Reserva CHECK-OUT esperado | 10-feb-2026 | ❌ `fecha_salida < startDate` (08-feb) |
| Hoy | 11-feb-2026 | La reserva **NO cumple** `.gte('fecha_salida', startDate)` |

**¿Por qué desaparece?**

```
fecha_salida = 10-feb-2026 00:00:00
startDate    = 08-feb-2026 00:00:00

10-feb >= 08-feb  →  ✅ TRUE (ayer 10)
11-feb: startDate = 08-feb (hoy)
10-feb >= 08-feb  →  ✅ TRUE (todavía cumple)

ESPERA... revisemos el PAST_DAYS_CONTEXT
```

**Recalculando con fecha actual**:

```javascript
today = 11-feb-2026 00:00:00
PAST_DAYS_CONTEXT = 3
startDate = addDays(today, -3) = 08-feb-2026 00:00:00

Reserva:
  fecha_entrada = 05-feb-2026 (ejemplo)
  fecha_salida  = 10-feb-2026

Filtros:
  .gte('fecha_salida', '2026-02-08T00:00:00')  →  10-feb >= 08-feb  →  ✅ TRUE
  .lte('fecha_entrada', endDate)                →  05-feb <= futuro   →  ✅ TRUE
  .in('estado', ['CHECKED_IN'])                 →  ✅ TRUE
```

**🤔 MOMENTO... la reserva DEBERÍA aparecer**

Esperá, dejame revisar mejor el código del rack visual...

---

### 3. 🔍 INVESTIGACIÓN ADICIONAL: Componente del Rack

**Necesito ver**: ¿Hay algún filtro adicional en el componente que renderiza los bloques?

**Archivo sospechoso**: `app/(dashboard)/rack/page.tsx` o componentes de celdas del rack

---

## 🎯 HIPÓTESIS ACTUALIZADA

Dado que:
1. ✅ La alerta de "checkout atrasado" **SÍ aparece** (línea 32-38 de `alerts-tab.tsx`)
2. ❌ El bloque visual del rack **NO aparece**
3. ✅ La query de alertas busca `.lt('fecha_salida', inicioHoy)` + `.eq('estado', 'CHECKED_IN')`

**Entonces**:
- La reserva **EXISTE** en la BD con estado `CHECKED_IN`
- La reserva **SE DETECTA** en `getAlertasRack()`
- La reserva **NO SE MUESTRA** en el rack visual

**Posibles causas**:

### A) Filtro de fecha en el componente visual
El componente que renderiza los bloques podría tener lógica como:
```typescript
if (reserva.fecha_salida < today) {
  return null // No renderizar
}
```

### B) CSS/Visibilidad
El bloque se renderiza pero con `display: none` o fuera del viewport

### C) Filtro en `getReservasForDate()`
Si hay una función auxiliar que filtra por fecha específica del día

---

## 🔎 SIGUIENTE PASO: Auditar componente visual

Necesito ver el archivo que renderiza los bloques de reservas en el grid del rack.

---

## 📊 DATOS DE LA ALERTA

**Query de alertas** (`lib/actions/rack.ts:439-444`):
```typescript
const { data: checkoutsTarde } = await supabase
  .from('reservas')
  .select('id, codigo_reserva, fecha_salida, habitaciones(numero)')
  .lt('fecha_salida', inicioHoy)  // fecha_salida ANTES de hoy 00:00
  .eq('estado', 'CHECKED_IN')     // Aún en la habitación
  .limit(5)
```

**Esto confirma**: Si la alerta aparece, la reserva tiene:
- `fecha_salida` < 11-feb-2026 00:00 (ejemplo: 10-feb)
- `estado` = `CHECKED_IN`
- Existe en la BD

---

## ✅ CONCLUSIÓN PARCIAL

**LO QUE SABEMOS**:
1. ✅ NO hay auto-checkout automático
2. ✅ La reserva EXISTE en BD (estado `CHECKED_IN`)
3. ✅ La alerta de "checkout atrasado" funciona correctamente
4. ❌ El bloque visual del rack NO se muestra

**CAUSA MÁS PROBABLE**:
El componente que renderiza el grid del rack tiene un filtro adicional que excluye reservas con `fecha_salida` en el pasado.

**IMPACTO**:
- **Operacional**: Pérdida de visibilidad de huéspedes que no hicieron checkout
- **Financiero**: Riesgo de no cobrar noches adicionales si el huésped se queda más tiempo
- **UX**: Inconsistencia entre alertas y visualización

---

## 🛠️ RECOMENDACIÓN URGENTE

**ANTES DE ARREGLAR**, necesito confirmar la hipótesis auditando:
1. El componente que renderiza las celdas del rack (grid de fechas)
2. Verificar si hay un filtro `reserva.fecha_salida >= today` en algún `.filter()` o condicional

**SI SE CONFIRMA**, la solución sería:
- **Opción A**: Mostrar reservas con checkout atrasado hasta que se procese el checkout real
- **Opción B**: Agregar un estilo visual especial (borde rojo, fondo diferente) para reservas atrasadas
- **Opción C**: Extender el rango de fechas pasadas en el rack (aumentar `PAST_DAYS_CONTEXT`)

---

## 📝 PRÓXIMA ACCIÓN

**AUDITAR**: Componente de renderizado del rack para encontrar el filtro faltante.

**COMANDO**: Necesito ver el archivo que mapea las reservas a las celdas del calendario/grid.
