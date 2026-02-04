# 📋 ANÁLISIS EXHAUSTIVO: TIPOS DE NOTA DE CRÉDITO SEGÚN SUNAT

**Fecha:** 04 de febrero de 2026  
**Sistema:** PMS Hotel (NubeFact + Supabase)  
**Referencia:** Catálogo SUNAT + NubeFact API Doc V1

---

## 🎯 OBJETIVO

Determinar para cada tipo de Nota de Crédito:
1. **Cuándo aplicarlo** (escenario hotelero)
2. **Si hay devolución de dinero** (egreso de caja)
3. **Si libera la habitación** (estado_ocupacion)
4. **Si cancela la reserva** (estado CANCELADA)
5. **Validaciones SUNAT** (plazos)

---

## 📊 TIPOS DE NC SEGÚN CATÁLOGO SUNAT (Art. 10 Res. 097-2012)

### ✅ **TIPO 1: ANULACIÓN DE LA OPERACIÓN**

#### Definición SUNAT
> Anulación de operaciones por negocio no concretado. Cancela completamente el comprobante.

#### Escenarios Hoteleros
- **Cliente cancela reserva ANTES de check-in** (no llegó al hotel)
- **Cliente rechaza habitación asignada** y cancela todo
- **Error administrativo**: Se emitió comprobante pero el servicio nunca se prestó

#### Impacto Financiero
- ✅ **Hay devolución de dinero** (100% del monto pagado)
- 📊 **Tipo:** Depende del método original:
  - Si pagó EFECTIVO → Egreso de caja inmediato
  - Si pagó TARJETA → Reversión de cargo (sin egreso efectivo)
  - Si pagó YAPE/TRANSFERENCIA → Devolución digital

#### Impacto Operativo
- ✅ **Libera habitación**: `estado_ocupacion` → `LIBRE`
- ✅ **Cancela reserva**: `estado` → `CANCELADA`
- ⚠️ **Motivo requerido**: Debe justificarse por qué se anula

#### Validaciones SUNAT
- ⏰ **Boletas:** Máximo 7 días desde emisión (baja comunicada)
- ⏰ **Facturas:** Mismo mes de emisión (anulación inmediata)
- 📄 **Monto NC:** Debe ser 100% del comprobante original

#### Flujo Técnico
```typescript
// 1. Validar plazo SUNAT
if (tipo_comprobante === 'BOLETA') {
  dias_transcurridos = hoy - fecha_emision
  if (dias_transcurridos > 7) throw Error('Plazo SUNAT excedido')
}

// 2. Emitir NC en SUNAT
emitirNotaCreditoParcial({
  tipo_nota_credito: 1,
  monto_devolucion: comprobante.total_venta
})

// 3. Procesar devolución financiera
procesar_devolucion_atomica({
  monto: comprobante.total_venta,
  metodo_devolucion: metodo_elegido // EFECTIVO, TARJETA, etc.
})

// 4. Liberar recursos
UPDATE habitaciones SET estado_ocupacion = 'LIBRE'
UPDATE reservas SET estado = 'CANCELADA'
UPDATE comprobantes SET estado_sunat = 'ANULADO'
```

---

### ✅ **TIPO 6: DEVOLUCIÓN TOTAL**

#### Definición SUNAT
> Devolución del 100% del bien o servicio por parte del cliente. Implica que el servicio SÍ se prestó pero el cliente lo devuelve.

#### Escenarios Hoteleros
- **Huésped hace check-in pero DESISTE inmediatamente** (mismo día)
- **Problema grave en habitación** (inundación, falta de servicios) y cliente exige reembolso total
- **Insatisfacción total del servicio** y gerencia aprueba devolución

#### Impacto Financiero
- ✅ **Hay devolución de dinero** (100% del monto pagado)
- 📊 **Tipo:** Según método de devolución elegido
- ⚠️ **Diferencia con Tipo 1:** Aquí el servicio SÍ SE PRESTÓ (aunque sea parcialmente)

#### Impacto Operativo
- ✅ **Libera habitación**: `estado_ocupacion` → `LIBRE`
- ✅ **Cancela reserva**: `estado` → `CANCELADA`
- 📝 **Registro de limpieza**: Si huésped ya usó habitación → `estado_limpieza` = `SUCIA`

#### Validaciones SUNAT
- ⏰ **Plazo:** No tiene límite temporal (puede ser después de 7 días)
- 📄 **Monto NC:** Debe ser 100% del comprobante original
- 🧾 **Requisito:** Justificar por qué hubo devolución total

#### Flujo Técnico
```typescript
// Similar a Tipo 1, pero SIN validación de plazo
emitirNotaCreditoParcial({ tipo_nota_credito: 6 })
procesar_devolucion_atomica()
liberarHabitacion()
```

---

### ✅ **TIPO 9: DISMINUCIÓN EN EL VALOR**

#### Definición SUNAT
> Reducción del precio por diversos motivos (deficiencia en servicio, descuento posterior, error en precio).

#### Escenarios Hoteleros
- **Acortamiento de estadía** (Cliente se va antes de lo pactado) ← **USO ACTUAL**
- **Descuento por mal servicio** (Aire acondicionado no funcionó 2 noches)
- **Corrección de precio** (Se cobró tarifa incorrecta)
- **Bonificación parcial** (Compensación por inconvenientes)

#### Impacto Financiero
- ⚠️ **DEPENDE del contexto:**
  - **Acortamiento:** ✅ Sí hay devolución (cliente pagó por adelantado)
  - **Descuento retroactivo:** ✅ Sí hay devolución (si ya pagó)
  - **Corrección precio:** ✅ Sí hay devolución (si pagó de más)
  - **Bonificación futura:** ❌ No hay devolución (crédito a cuenta)

#### Impacto Operativo
- ❌ **NO libera habitación** (si cliente sigue hospedado)
- ✅ **Libera habitación** (solo en caso de acortamiento con check-out)
- ⏱️ **Ajusta fecha_salida** (en acortamiento)

#### Validaciones SUNAT
- ⏰ **Plazo:** No tiene límite (puede emitirse meses después)
- 📄 **Monto NC:** Puede ser parcial (menor al total)
- 🧾 **Motivo:** Debe especificar razón de la disminución

#### Flujo Técnico
```typescript
// CASO 1: Acortamiento con devolución
if (escenario === 'ACORTAMIENTO') {
  emitirNotaCreditoParcial({ tipo_nota_credito: 9 })
  procesar_devolucion_atomica({ monto: diferencia })
  actualizarFechaSalida()
}

// CASO 2: Descuento sin devolución (crédito)
if (escenario === 'DESCUENTO_SIN_DEVOLUCION') {
  emitirNotaCreditoParcial({ tipo_nota_credito: 9 })
  // NO llamar procesar_devolucion_atomica
  registrarCreditoCliente()
}

// CASO 3: Descuento con devolución (mal servicio)
if (escenario === 'COMPENSACION') {
  emitirNotaCreditoParcial({ tipo_nota_credito: 9 })
  procesar_devolucion_atomica({ metodo: 'EFECTIVO' })
  // NO liberar habitación (cliente sigue hospedado)
}
```

---

### ✅ **TIPO 10: OTROS CONCEPTOS**

#### Definición SUNAT
> Ajustes diversos que no encajan en los tipos anteriores. Comodín para situaciones especiales.

#### Escenarios Hoteleros
- **Ajuste contable interno** (corrección de asientos)
- **Compensación no monetaria** (upgrade de habitación en lugar de reembolso)
- **Regularización de diferencias** de cambio
- **Anulación de consumos de minibar** facturados por error

#### Impacto Financiero
- ⚠️ **DEPENDE TOTALMENTE del motivo específico**
- Puede o no implicar devolución de dinero
- Requiere análisis caso por caso

#### Impacto Operativo
- ❌ **Generalmente NO afecta estado de habitación**
- ❌ **Generalmente NO afecta estado de reserva**
- 📝 **Requiere documentación adicional**

#### Validaciones SUNAT
- ⏰ **Plazo:** Variable según concepto
- 📄 **Monto:** Puede ser total o parcial
- 🧾 **Motivo:** CRÍTICO - debe explicarse muy bien

#### Flujo Técnico
```typescript
// Requiere configuración manual por caso
emitirNotaCreditoManual({
  tipo_nota_credito: 10,
  monto_devolucion: monto,
  motivo: motivo_detallado, // Muy importante
  incluye_devolucion: preguntarUsuario() // UI debe preguntar
})
```

---

## 📋 MATRIZ DE DECISIÓN: ¿QUÉ HACER CON CADA TIPO?

| Tipo NC | Nombre | Devolución $ | Egreso Caja | Libera Hab. | Cancela Reserva | Plazo SUNAT | Uso Hotel |
|---------|--------|--------------|-------------|-------------|-----------------|-------------|-----------|
| **1** | Anulación operación | ✅ SÍ (100%) | ✅ Si EFECTIVO | ✅ SÍ | ✅ SÍ | 7d Boleta / Mes Factura | Cliente no llegó |
| **6** | Devolución total | ✅ SÍ (100%) | ✅ Si EFECTIVO | ✅ SÍ | ✅ SÍ | Sin límite | Cliente devuelve servicio |
| **9** | Disminución valor | ⚠️ DEPENDE | ⚠️ Según caso | ⚠️ Según caso | ❌ NO | Sin límite | Acortamiento, descuentos |
| **10** | Otros conceptos | ⚠️ DEPENDE | ⚠️ Según caso | ❌ NO | ❌ NO | Variable | Ajustes especiales |

---

## 🚨 TIPOS DE NC NO USADOS EN HOTELERÍA (Referencia)

| Código | Nombre | Por qué no aplica |
|--------|--------|-------------------|
| 2 | Anulación por error en RUC | Específico para datos del cliente, poco común |
| 3 | Corrección error descripción | Solo corrige texto, no genera devolución |
| 4 | Descuento global | Para descuentos posteriores a emisión completa |
| 5 | Descuento por ítem | Ídem anterior, por línea específica |
| 7 | Devolución por ítem | Similar a Tipo 6 pero por producto específico |
| 8 | Bonificación | Para entregas gratuitas posteriores |
| 11-13 | IVAP / Exportación / Ajustes | No aplican a servicios hoteleros locales |

---

## 🎯 ANÁLISIS DEL CÓDIGO ACTUAL

### ¿Qué está CORRECTO?

✅ **Acortamiento de estadía (estadias.ts):**
```typescript
// Usa Tipo 9 correctamente
emitirNotaCreditoParcial({ tipo_nota_credito: 9 })
procesar_devolucion_atomica() // Crea egreso ✅
// Actualiza fecha_salida ✅
```

### ¿Qué está INCOMPLETO?

❌ **NC Manual (emitir-nota-credito-dialog.tsx):**
```typescript
// Permite Tipos 1, 6, 9, 10
// PERO no pregunta:
// 1. ¿Hay devolución de dinero? ← FALTA
// 2. ¿Por qué método? (efectivo, tarjeta, etc.) ← FALTA
// 3. ¿Liberar habitación? ← FALTA
// 4. ¿Cancelar reserva? ← FALTA
```

---

## 📐 REGLAS DE NEGOCIO POR TIPO

### TIPO 1 (Anulación)
```typescript
const REGLAS_TIPO_1 = {
  devolucion_dinero: true, // SIEMPRE
  metodo_devolucion: 'PREGUNTAR_USUARIO', // Puede ser distinto al pago original
  liberar_habitacion: true, // SIEMPRE
  cancelar_reserva: true, // SIEMPRE
  validar_plazo_sunat: true, // CRÍTICO
  monto: 'TOTAL' // 100% del comprobante
}
```

### TIPO 6 (Devolución Total)
```typescript
const REGLAS_TIPO_6 = {
  devolucion_dinero: true, // SIEMPRE
  metodo_devolucion: 'PREGUNTAR_USUARIO',
  liberar_habitacion: true, // SIEMPRE
  cancelar_reserva: true, // SIEMPRE
  validar_plazo_sunat: false, // No tiene límite
  monto: 'TOTAL', // 100% del comprobante
  requiere_check_limpieza: true // Si huésped ya usó habitación
}
```

### TIPO 9 (Disminución)
```typescript
const REGLAS_TIPO_9 = {
  devolucion_dinero: 'PREGUNTAR_USUARIO', // Depende del motivo
  metodo_devolucion: 'CONDICIONAL',
  liberar_habitacion: 'CONDICIONAL', // Solo si acortamiento CON checkout
  cancelar_reserva: false, // Generalmente NO
  validar_plazo_sunat: false,
  monto: 'PARCIAL_O_TOTAL', // Flexible
  
  // Subtipos:
  subtipo_acortamiento: {
    devolucion_dinero: true,
    liberar_habitacion: true // Si es check-out anticipado
  },
  subtipo_descuento: {
    devolucion_dinero: true,
    liberar_habitacion: false // Cliente sigue hospedado
  },
  subtipo_correccion: {
    devolucion_dinero: true,
    liberar_habitacion: false
  }
}
```

### TIPO 10 (Otros)
```typescript
const REGLAS_TIPO_10 = {
  devolucion_dinero: 'PREGUNTAR_USUARIO', // Totalmente variable
  metodo_devolucion: 'CONDICIONAL',
  liberar_habitacion: 'PREGUNTAR_USUARIO',
  cancelar_reserva: 'PREGUNTAR_USUARIO',
  validar_plazo_sunat: false,
  monto: 'FLEXIBLE',
  requiere_motivo_detallado: true // MUY IMPORTANTE
}
```

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### FASE 1: Modificar Dialog NC Manual (UI)

**Archivo:** `emitir-nota-credito-dialog.tsx`

**Cambios:**
1. Al seleccionar Tipo NC, mostrar advertencias específicas
2. Agregar selector de método de devolución (EFECTIVO, TARJETA, YAPE, PLIN, TRANSFERENCIA, NINGUNO)
3. Agregar checkbox "¿Liberar habitación?"
4. Agregar checkbox "¿Cancelar reserva?"
5. Validar plazo SUNAT para Tipo 1 (boletas 7 días)

```tsx
const CONFIGURACION_TIPO_NC = {
  1: {
    nombre: 'Anulación de la operación',
    devolucion_obligatoria: true,
    mostrar_selector_metodo: true,
    liberar_habitacion_default: true,
    cancelar_reserva_default: true,
    advertencia: 'BOLETAS: Solo 7 días desde emisión. FACTURAS: Solo mes actual.'
  },
  6: {
    nombre: 'Devolución total',
    devolucion_obligatoria: true,
    mostrar_selector_metodo: true,
    liberar_habitacion_default: true,
    cancelar_reserva_default: true,
    advertencia: 'Implica que el servicio SÍ se prestó pero el cliente lo devuelve.'
  },
  9: {
    nombre: 'Disminución en el valor',
    devolucion_obligatoria: false, // Preguntar
    mostrar_selector_metodo: true,
    mostrar_pregunta_devolucion: true, // ¿Hay devolución de dinero?
    liberar_habitacion_default: false,
    cancelar_reserva_default: false,
    advertencia: 'Para descuentos, ajustes o acortamientos. ¿El cliente recibirá dinero?'
  },
  10: {
    nombre: 'Otros conceptos',
    devolucion_obligatoria: false,
    mostrar_selector_metodo: true,
    mostrar_pregunta_devolucion: true,
    liberar_habitacion_manual: true, // Usuario decide
    cancelar_reserva_manual: true, // Usuario decide
    advertencia: 'Requiere documentación. Especifique muy bien el motivo.'
  }
}
```

### FASE 2: Modificar Server Action

**Archivo:** `lib/actions/comprobantes.ts` - `emitirNotaCreditoManual()`

**Input Extendido:**
```typescript
export type EmitirNotaCreditoManualInput = {
  comprobante_original_id: string
  tipo_nota_credito: number // 1, 6, 9, 10
  monto_devolucion: number
  motivo: string
  
  // NUEVOS CAMPOS:
  incluye_devolucion_dinero: boolean // ¿Hay devolución efectiva?
  metodo_devolucion?: 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'PENDIENTE'
  liberar_habitacion: boolean // ¿Cambiar estado_ocupacion a LIBRE?
  cancelar_reserva: boolean // ¿Cambiar estado a CANCELADA?
}
```

**Lógica:**
```typescript
// 1. Validar plazo SUNAT si es Tipo 1
if (input.tipo_nota_credito === 1) {
  validarPlazoSUNAT(comprobanteOriginal)
}

// 2. Emitir NC en SUNAT
const resultadoNC = await emitirNotaCreditoParcial(...)

// 3. Si hay devolución de dinero, procesarla
if (input.incluye_devolucion_dinero && input.metodo_devolucion) {
  await procesar_devolucion_atomica({
    p_reserva_id: reserva.id,
    p_monto_devolucion: input.monto_devolucion,
    p_metodo_devolucion: input.metodo_devolucion,
    ...
  })
}

// 4. Si libera habitación
if (input.liberar_habitacion) {
  await liberarHabitacion(reserva.habitacion_id)
}

// 5. Si cancela reserva
if (input.cancelar_reserva) {
  await cancelarReserva(reserva.id, 'NC_TIPO_' + input.tipo_nota_credito)
}

// 6. Marcar comprobante como ANULADO (tipos 1 y 6)
if ([1, 6].includes(input.tipo_nota_credito)) {
  await anularComprobante(input.comprobante_original_id)
}
```

### FASE 3: Validación SUNAT

**Nueva función:** `lib/actions/comprobantes.ts`

```typescript
export async function validarPlazoSUNAT(comprobante: Comprobante) {
  const diasTranscurridos = differenceInDays(new Date(), new Date(comprobante.fecha_emision))
  
  if (comprobante.tipo_comprobante === 'BOLETA') {
    if (diasTranscurridos > 7) {
      throw new Error(
        `⏰ Plazo SUNAT excedido: Esta boleta fue emitida hace ${diasTranscurridos} días. ` +
        `SUNAT solo permite anular boletas dentro de 7 días.`
      )
    }
  }
  
  if (comprobante.tipo_comprobante === 'FACTURA') {
    const mesEmision = format(new Date(comprobante.fecha_emision), 'yyyy-MM')
    const mesActual = format(new Date(), 'yyyy-MM')
    
    if (mesEmision !== mesActual) {
      throw new Error(
        `⏰ Plazo SUNAT excedido: Esta factura fue emitida en ${mesEmision}. ` +
        `SUNAT solo permite anular facturas del mes actual.`
      )
    }
  }
  
  return true
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### UI (Dialog)
- [ ] Agregar configuración por tipo de NC
- [ ] Mostrar advertencias específicas según tipo
- [ ] Selector de método de devolución
- [ ] Pregunta "¿Hay devolución de dinero?" (Tipos 9 y 10)
- [ ] Checkbox "Liberar habitación"
- [ ] Checkbox "Cancelar reserva"
- [ ] Validación de plazo SUNAT (front)

### Server Action
- [ ] Extender `EmitirNotaCreditoManualInput`
- [ ] Validar plazo SUNAT (Tipo 1)
- [ ] Condicionar llamada a `procesar_devolucion_atomica`
- [ ] Liberar habitación si corresponde
- [ ] Cancelar reserva si corresponde
- [ ] Marcar comprobante como ANULADO (Tipos 1 y 6)

### Testing
- [ ] Caso 1: NC Tipo 1 + EFECTIVO → Egreso + Libera + Cancela
- [ ] Caso 2: NC Tipo 1 + TARJETA → No egreso + Libera + Cancela
- [ ] Caso 3: NC Tipo 6 + YAPE → No egreso físico + Libera + Cancela
- [ ] Caso 4: NC Tipo 9 + Con devolución → Egreso + No libera
- [ ] Caso 5: NC Tipo 9 + Sin devolución → No egreso + No libera
- [ ] Caso 6: NC Tipo 10 + Configuración manual
- [ ] Validación plazo: Boleta 8 días atrás → Error
- [ ] Validación plazo: Factura mes anterior → Error

---

## 📚 CONCLUSIONES

### DIAGNÓSTICO
El sistema actual tiene dos flujos:
1. **Automático (acortamiento):** ✅ CORRECTO - usa RPC, crea egresos, actualiza fechas
2. **Manual (desde UI):** ❌ INCOMPLETO - solo crea NC en SUNAT, ignora flujo financiero/operativo

### SOLUCIÓN
NO es agregar egreso a TODOS los tipos de NC (eso sería error).  
La solución es **preguntar al usuario según el tipo** y ejecutar el flujo apropiado.

### PRIORIDAD
🔴 **ALTA** - Actualmente el flujo manual puede causar:
- Descuadre de caja (NC con devolución efectiva no registrada)
- Habitaciones bloqueadas innecesariamente
- Multas SUNAT (anulaciones fuera de plazo)

---

**Siguiente paso:** Aprobar plan e implementar cambios según fases.
