# GUÍA DE MIGRACIÓN: Uso de Función Atómica
## Sistema PMS Hotel - Reemplazar flujo manual por función atómica

**Audiencia:** Desarrolladores del equipo  
**Objetivo:** Migrar el código existente para usar `cobrarYFacturarAtomico()`

---

## 📋 CONTEXTO

Anteriormente, el flujo de cobro y facturación consistía en 3 llamadas separadas:
1. `generarCorrelativoComprobante()` → Crear comprobante
2. `INSERT pagos` → Registrar pago
3. `INSERT movimientos_caja` → Registrar movimiento

**Problema:** Si falla el paso 2 o 3, el comprobante queda creado pero sin pago asociado (inconsistencia).

**Solución:** Nueva función PostgreSQL `cobrar_y_facturar_atomico()` que hace todo en una transacción ACID.

---

## 🔄 FLUJO ANTERIOR (MANUAL)

### Código en `lib/actions/pagos.ts` (ANTES):

```typescript
export async function cobrarYFacturar(input: CobrarYFacturarInput) {
  const supabase = await createClient()

  // ❌ PASO 1: Generar comprobante (puede fallar)
  const { data: comprobante, error: comprobanteError } = await supabase
    .rpc('generar_correlativo_comprobante', {
      p_tipo_comprobante: input.tipo_comprobante,
      p_serie_id: input.serie_id,
      // ...
    })

  if (comprobanteError) {
    return { success: false, message: 'Error al generar comprobante' }
  }

  // ❌ PASO 2: Registrar pago (si falla, comprobante queda huérfano)
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      reserva_id: input.reserva_id,
      comprobante_id: comprobante.id,
      monto: input.monto,
      // ...
    })
    .select()
    .single()

  if (pagoError) {
    // ⚠️ PROBLEMA: Comprobante ya creado, no se revierte
    return { success: false, message: 'Error al registrar pago' }
  }

  // ❌ PASO 3: Registrar movimiento (si falla, comprobante + pago inconsistentes)
  if (input.metodo_pago === 'EFECTIVO') {
    await supabase.from('movimientos_caja').insert({
      sesion_caja_id: input.sesion_caja_id,
      pago_id: pago.id,
      // ...
    })
    // ⚠️ Si falla, no hay rollback de pasos anteriores
  }

  return { success: true, comprobante_id: comprobante.id }
}
```

---

## ✅ FLUJO NUEVO (ATÓMICO)

### Código con `cobrarYFacturarAtomico()` (DESPUÉS):

```typescript
import { cobrarYFacturarAtomico } from '@/lib/actions/facturacion-atomica'

export async function cobrarYFacturar(input: CobrarYFacturarInput) {
  // ✅ TODO EN UNA TRANSACCIÓN ATÓMICA
  const resultado = await cobrarYFacturarAtomico(
    // Datos del comprobante
    {
      tipo_comprobante: input.tipo_comprobante,
      serie_id: input.serie_id,
      reserva_id: input.reserva_id,
      base_imponible: input.base_imponible,
      total: input.total,
      moneda: input.moneda,
      tipo_cambio: input.tipo_cambio,
      fecha_emision: input.fecha_emision
    },
    // Datos del pago
    {
      monto: input.monto,
      moneda: input.moneda_pago,
      tipo_cambio: input.tipo_cambio_pago,
      metodo_pago: input.metodo_pago,
      referencia: input.referencia
    },
    // Contexto de caja
    {
      sesion_caja_id: input.sesion_caja_id,
      usuario_id: input.usuario_id,
      descripcion: `Pago de reserva ${input.reserva_id}`
    }
  )

  if (!resultado.success) {
    return {
      success: false,
      message: resultado.error || 'Error al procesar transacción'
    }
  }

  return {
    success: true,
    comprobante_id: resultado.comprobante_id,
    numero_comprobante: resultado.numero_comprobante,
    pago_id: resultado.pago_id
  }
}
```

---

## 🎯 VENTAJAS DEL FLUJO ATÓMICO

| Aspecto | Antes (Manual) | Después (Atómico) |
|---------|----------------|-------------------|
| **Transacciones** | 3 separadas | 1 atómica |
| **Rollback** | ❌ Manual/inexistente | ✅ Automático |
| **Correlativos** | Posible duplicado | ✅ Lock optimista |
| **Consistencia** | ⚠️ Puede fallar | ✅ Garantizada |
| **Performance** | 3 round-trips | 1 round-trip |
| **Complejidad** | Alta | Baja |

---

## 📝 PASOS DE MIGRACIÓN

### 1. Identificar archivos que usan el flujo manual

```bash
# Buscar llamadas a generar_correlativo_comprobante
grep -r "generar_correlativo_comprobante" lib/actions/*.ts

# Buscar inserts de pagos seguidos de movimientos
grep -A 10 "from('pagos').insert" lib/actions/*.ts
```

### 2. Reemplazar imports

```typescript
// ANTES:
import { generarCorrelativoComprobante } from '@/lib/actions/comprobantes'

// DESPUÉS:
import { cobrarYFacturarAtomico } from '@/lib/actions/facturacion-atomica'
```

### 3. Refactorizar la lógica

**ANTES:**
```typescript
// 30+ líneas de lógica secuencial con manejo de errores complejo
const comprobante = await step1()
if (error) return error
const pago = await step2(comprobante.id)
if (error) return error // ⚠️ comprobante huérfano
const movimiento = await step3(pago.id)
// ...
```

**DESPUÉS:**
```typescript
// 1 llamada atómica
const resultado = await cobrarYFacturarAtomico(
  comprobanteData,
  pagoData,
  contextoData
)

return resultado // ✅ Todo o nada
```

### 4. Actualizar tests

```typescript
// tests/pagos.test.ts

describe('cobrarYFacturar', () => {
  it('debe crear comprobante, pago y movimiento atómicamente', async () => {
    const resultado = await cobrarYFacturarAtomico(/* ... */)

    expect(resultado.success).toBe(true)
    expect(resultado.comprobante_id).toBeDefined()
    expect(resultado.pago_id).toBeDefined()
  })

  it('debe revertir todo si falla', async () => {
    // Simular error: serie inexistente
    const resultado = await cobrarYFacturarAtomico({
      serie_id: 'uuid-inexistente',
      // ...
    })

    expect(resultado.success).toBe(false)
    
    // Verificar que NO se creó nada
    const comprobantes = await getComprobantesByReserva(reserva_id)
    expect(comprobantes).toHaveLength(0)
  })
})
```

---

## 🔍 ARCHIVOS A REVISAR

### Alta prioridad (usar función atómica):
1. ✅ `lib/actions/pagos.ts` - Función `cobrarYFacturar()` (líneas ~90-200)
2. ⬜ `lib/actions/reservas.ts` - Si tiene flujo similar
3. ⬜ `components/cajas/registrar-pago-dialog.tsx` - Validar UI

### Baja prioridad (mantener actual):
- `lib/actions/comprobantes.ts` - Solo creación de comprobante manual (casos especiales)
- `lib/actions/cajas.ts` - Movimientos manuales (retiros, ingresos manuales)

---

## 🛠️ EJEMPLO COMPLETO

### Caso real: Pago de reserva con facturación

```typescript
'use server'

import { cobrarYFacturarAtomico } from '@/lib/actions/facturacion-atomica'
import { getSaldoPendiente } from '@/lib/actions/pagos'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { getCurrentUser } from '@/lib/actions/usuarios'

export async function procesarPagoReserva(input: {
  reserva_id: string
  monto: number
  moneda: 'PEN' | 'USD'
  metodo_pago: 'EFECTIVO' | 'TARJETA'
  tipo_comprobante: 'BOLETA' | 'FACTURA'
  serie_id: string
  sesion_caja_id: string
}) {
  try {
    // 1. Validaciones previas
    const saldo = await getSaldoPendiente(input.reserva_id)
    if (input.monto > saldo) {
      return { 
        success: false, 
        message: 'El monto excede el saldo pendiente' 
      }
    }

    const config = await getHotelConfig()
    const usuario = await getCurrentUser()

    // 2. Calcular montos (IGV dinámico)
    const tasaIGV = config.es_exonerado_igv ? 0 : (config.tasa_igv / 100)
    const base_imponible = input.monto / (1 + tasaIGV)
    const igv = input.monto - base_imponible

    // 3. Ejecutar transacción atómica
    const resultado = await cobrarYFacturarAtomico(
      // Comprobante
      {
        tipo_comprobante: input.tipo_comprobante,
        serie_id: input.serie_id,
        reserva_id: input.reserva_id,
        base_imponible: base_imponible,
        total: input.monto,
        moneda: input.moneda,
        tipo_cambio: input.moneda === 'USD' ? config.tipo_cambio : 1.00
      },
      // Pago
      {
        monto: input.monto,
        moneda: input.moneda,
        tipo_cambio: input.moneda === 'USD' ? config.tipo_cambio : 1.00,
        metodo_pago: input.metodo_pago,
        referencia: input.referencia_transaccion
      },
      // Contexto
      {
        sesion_caja_id: input.sesion_caja_id,
        usuario_id: usuario.id,
        descripcion: `Pago ${input.tipo_comprobante} - Reserva ${input.reserva_id}`
      }
    )

    if (!resultado.success) {
      return {
        success: false,
        message: resultado.error
      }
    }

    // 4. Revalidar cache
    revalidatePath('/reservas')
    revalidatePath('/cajas')

    return {
      success: true,
      message: `${input.tipo_comprobante} ${resultado.numero_comprobante} emitida correctamente`,
      data: {
        comprobante_id: resultado.comprobante_id,
        numero_comprobante: resultado.numero_comprobante,
        pago_id: resultado.pago_id
      }
    }

  } catch (error) {
    logger.error('Error al procesar pago de reserva', {
      error: getErrorMessage(error),
      reserva_id: input.reserva_id
    })

    return {
      success: false,
      message: 'Error inesperado al procesar el pago'
    }
  }
}
```

---

## ⚠️ CONSIDERACIONES

### 1. Manejo de errores
La función atómica retorna `{ success: false, error: string }` en lugar de lanzar excepciones. Siempre verificar `resultado.success`.

### 2. Tipos de datos
Los parámetros están fuertemente tipados. Ver interfaces en `lib/actions/facturacion-atomica.ts`.

### 3. Migration requerida
Antes de usar la función, aplicar la migration:
```bash
npx supabase db push
```

### 4. Casos especiales
Si necesitas crear comprobante SIN pago (e.g., notas de crédito), usa el flujo manual de `lib/actions/comprobantes.ts`.

---

## 📊 CHECKLIST DE MIGRACIÓN

- [ ] Identificar todos los lugares con flujo manual
- [ ] Reemplazar imports
- [ ] Refactorizar lógica a función atómica
- [ ] Actualizar tests unitarios
- [ ] Probar en desarrollo
- [ ] Revisar logs para errores
- [ ] Validar en staging
- [ ] Desplegar a producción

---

## 🆘 TROUBLESHOOTING

### Error: "función cobrar_y_facturar_atomico no existe"
**Causa:** Migration no aplicada  
**Solución:** Ejecutar `npx supabase db push`

### Error: "Serie no encontrada o inválida"
**Causa:** ID de serie incorrecto o serie desactivada  
**Solución:** Verificar que `series.estado = true` y UUID es correcto

### Error: "violates foreign key constraint"
**Causa:** IDs de reserva, sesión o usuario no existen  
**Solución:** Validar que existen antes de llamar la función

---

## 📚 REFERENCIAS

- [RESUMEN_CORRECCIONES_IMPLEMENTADAS.md](RESUMEN_CORRECCIONES_IMPLEMENTADAS.md) - Documentación completa
- [lib/actions/facturacion-atomica.ts](lib/actions/facturacion-atomica.ts) - Código fuente
- [supabase/migrations/20260201120000_add_cobrar_facturar_atomico.sql](supabase/migrations/20260201120000_add_cobrar_facturar_atomico.sql) - SQL

---

**Última actualización:** 2025-01-31  
**Autor:** Arquitecto Senior
