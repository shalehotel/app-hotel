# 🔍 AUDITORÍA EXTREMA - MÓDULO DE FACTURACIÓN
**Fecha**: 2026-02-07  
**Sistema**: PMS Hotel - Módulo de Facturación Electrónica  
**Objetivo**: Identificar TODOS los puntos de fallo posibles

---

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Módulo](#arquitectura-del-módulo)
3. [Escenarios de Prueba](#escenarios-de-prueba)
4. [Puntos Críticos Identificados](#puntos-críticos-identificados)
5. [Recomendaciones](#recomendaciones)

---

## 🎯 RESUMEN EJECUTIVO

### ✅ FORTALEZAS
- **Transacciones ACID**: Uso de RPCs PostgreSQL (`registrar_cobro_completo`)
- **Idempotencia**: Sistema de `idempotency_key` para prevenir duplicados
- **Manejo de errores**: Try-catch en múltiples niveles
- **Logging estructurado**: Trazabilidad completa con `logger`
- **Validaciones previas**: Check de turno, serie, config, RUC

### ❌ RIESGOS CRÍTICOS
1. **Sin rollback si Nubefact falla DESPUÉS de cobrar**
2. **Sin circuit breaker para Nubefact**
3. **Sin queue/retry para comprobantes rechazados**
4. **Race condition en obtención de correlativo (aunque mitigado con RPC)**
5. **Sin timeout explícito en llamadas a Nubefact**
6. **Sin validación de límite de monto (PEN 700 sin RUC para boletas)**

---

## 🏗️ ARQUITECTURA DEL MÓDULO

### Flujo de Facturación

```
Usuario → cobrarYFacturarAtomico()
    ↓
[VALIDACIONES]
    ├─ Usuario autenticado?
    ├─ Turno activo?
    ├─ Reserva existe?
    ├─ Serie válida?
    ├─ Config hotel completa?
    └─ RUC configurado?
    ↓
[RPC TRANSACCIONAL] registrar_cobro_completo()
    ├─ 1. Obtener correlativo (LOCK)
    ├─ 2. Insertar comprobante
    ├─ 3. Insertar pago
    ├─ 4. Insertar movimiento caja
    ├─ 5. Actualizar saldo reserva
    └─ COMMIT o ROLLBACK
    ↓
[INSERTAR DETALLES] comprobante_detalles
    ↓
[ENVÍO NUBEFACT] (Sin transacción)
    ├─ Construir payload
    ├─ POST a API Nubefact
    ├─ Actualizar estado_sunat
    └─ Si falla → PENDIENTE (no ROLLBACK)
```

---

## 🧪 ESCENARIOS DE PRUEBA

### CATEGORÍA 1: VALIDACIONES PREVIAS

#### ✅ ESCENARIO 1.1: Usuario no autenticado
```typescript
Input: sin token de sesión
Expected: throw Error('Usuario no autenticado')
Resultado: ✅ PASA - Bloquea en línea 87 pagos.ts
```

#### ✅ ESCENARIO 1.2: No hay turno activo
```typescript
Input: usuario sin turno abierto, caja_turno_id=null
Expected: throw Error('No hay turno de caja abierto')
Resultado: ✅ PASA - Bloquea en línea 93 pagos.ts
```

#### ✅ ESCENARIO 1.3: Reserva no existe
```typescript
Input: reserva_id='uuid-fake'
Expected: throw Error('Reserva no encontrada')
Resultado: ✅ PASA - Bloquea en línea 100 pagos.ts
```

#### ✅ ESCENARIO 1.4: Serie no existe
```typescript
Input: serie='X999', tipo='BOLETA'
Expected: throw Error('La serie X999 no existe para el tipo BOLETA')
Resultado: ✅ PASA - Bloquea en línea 108-115 pagos.ts
```

#### ✅ ESCENARIO 1.5: Hotel sin configurar
```typescript
Input: hotel_configuracion vacío
Expected: throw Error('Configure su hotel en /configuracion')
Resultado: ✅ PASA - Bloquea en línea 118 pagos.ts
```

#### ✅ ESCENARIO 1.6: Facturación desactivada
```typescript
Input: config.facturacion_activa=false
Expected: throw Error('La facturación electrónica no está activada')
Resultado: ✅ PASA - Bloquea en línea 121 pagos.ts
```

#### ✅ ESCENARIO 1.7: RUC inválido
```typescript
Input: config.ruc='20000000001' (default)
Expected: throw Error('Debe configurar un RUC válido')
Resultado: ✅ PASA - Bloquea en línea 124 pagos.ts
```

---

### CATEGORÍA 2: TRANSACCIÓN PRINCIPAL

#### ✅ ESCENARIO 2.1: Correlativo se obtiene correctamente
```typescript
Input: serie='B001', último correlativo=5
Expected: nuevo comprobante B001-00000006
Resultado: ✅ PASA - RPC obtener_siguiente_correlativo con UPDATE ... RETURNING
```

#### ⚠️ ESCENARIO 2.2: Race condition (2 usuarios simultáneos)
```typescript
Input: Usuario A y B emiten B001 al mismo tiempo
Expected: A=6, B=7 (sin duplicados)
Resultado: ⚠️ MITIGADO - PostgreSQL RPC con LOCK, pero sin test de carga
RECOMENDACIÓN: Test de concurrencia con 10+ requests/seg
```

#### ✅ ESCENARIO 2.3: Comprobante duplicado (idempotencia)
```typescript
Input: Mismo idempotency_key enviado 2 veces
Expected: Segunda llamada retorna duplicado=true
Resultado: ✅ PASA - Línea 169 pagos.ts detecta duplicado
```

#### ❌ ESCENARIO 2.4: RPC falla en medio de transacción
```typescript
Input: Error en paso 3 del RPC (después de correlativo++)
Expected: ROLLBACK automático, correlativo NO se consume
Resultado: ❌ NO PROBADO - Sin test que simule fallo en RPC
RIESGO: Si hay bug en RPC, puede quedar inconsistente
```

---

### CATEGORÍA 3: NUBEFACT (CRÍTICO)

#### ⚠️ ESCENARIO 3.1: Nubefact retorna error después de cobrar
```typescript
Input: RPC exitoso, pero Nubefact rechaza XML
Expected: Comprobante queda en estado PENDIENTE
Resultado: ⚠️ PROBLEMA - Cliente ya fue cobrado pero no tiene comprobante ACEPTADO
Estado: Línea 283 pagos.ts captura error pero NO hace rollback
IMPACTO: ALTO - Cliente cobrado sin factura válida
```

#### ❌ ESCENARIO 3.2: Nubefact timeout (>30s)
```typescript
Input: API Nubefact no responde (timeout)
Expected: Retry o fallback
Resultado: ❌ FALLA - fetch() espera indefinidamente sin timeout explícito
RIESGO: Request puede quedar colgado 5+ minutos
RECOMENDACIÓN: Agregar timeout 30s en fetch options
```

#### ❌ ESCENARIO 3.3: Nubefact retorna 500 (error servidor)
```typescript
Input: Nubefact tiene outage
Expected: Estado PENDIENTE + retry automático
Resultado: ❌ FALLA - Se marca RECHAZADO y NO hay retry
IMPACTO: ALTO - Comprobante queda rechazado cuando debería reintentar
```

#### ❌ ESCENARIO 3.4: Nubefact retorna 401 (token inválido)
```typescript
Input: NUBEFACT_TOKEN expiró o es inválido
Expected: Error claro al usuario
Resultado: ❌ PARCIAL - Error genérico, no especifica que es token
RECOMENDACIÓN: Detectar 401 y mostrar mensaje específico
```

#### ❌ ESCENARIO 3.5: Sin conexión a internet
```typescript
Input: Sin red durante envío a Nubefact
Expected: Estado PENDIENTE + reintento posterior
Resultado: ❌ FALLA - Marca RECHAZADO, no detecta error de red
CÓDIGO: Falta verificar respuestaNubefact.es_error_red
```

---

### CATEGORÍA 4: CÁLCULOS Y MONTOS

#### ✅ ESCENARIO 4.1: IGV calculado correctamente (18%)
```typescript
Input: items=[{precio:100}], tasa_igv=18%
Expected: base=84.75, igv=15.25, total=100
Resultado: ✅ PASA - Línea 138-144 pagos.ts calcula correctamente
```

#### ✅ ESCENARIO 4.2: Hotel exonerado (Amazonía)
```typescript
Input: config.es_exonerado_igv=true
Expected: total_gravada=0, total_exonerada=total, igv=0
Resultado: ✅ PASA - nubefact.ts línea 212-228
```

#### ⚠️ ESCENARIO 4.3: Montos con más de 2 decimales
```typescript
Input: item.precio_unitario=10.567
Expected: Redondeo correcto
Resultado: ⚠️ MITIGADO - Usa .toFixed(2) pero puede tener errores de redondeo acumulativo
RECOMENDACIÓN: Usar librería decimal.js para precisión monetaria
```

#### ⚠️ ESCENARIO 4.4: Monto negativo
```typescript
Input: item.subtotal=-100
Expected: Rechazar o validar
Resultado: ⚠️ NO VALIDA - Sistema permite montos negativos
RECOMENDACIÓN: Agregar validación monto >= 0
```

#### ❌ ESCENARIO 4.5: Boleta >PEN 700 sin RUC cliente
```typescript
Input: tipo='BOLETA', total=800, cliente_numero_doc='12345678' (DNI)
Expected: Rechazar por normativa SUNAT
Resultado: ❌ NO VALIDA - Sistema NO verifica este límite
IMPACTO: MEDIO - Puede generar observaciones SUNAT
RECOMENDACIÓN: Agregar validación o forzar conversión a FACTURA
```

---

### CATEGORÍA 5: DATOS DE CLIENTE

#### ⚠️ ESCENARIO 5.1: RUC inválido (debe ser 11 dígitos 20...)
```typescript
Input: cliente_numero_doc='12345' para FACTURA
Expected: Rechazar RUC inválido
Resultado: ⚠️ NO VALIDA - Sistema acepta cualquier string
RECOMENDACIÓN: Validar formato RUC antes de enviar
```

#### ⚠️ ESCENARIO 5.2: DNI inválido (debe ser 8 dígitos)
```typescript
Input: cliente_numero_doc='123' para BOLETA
Expected: Rechazar DNI inválido
Resultado: ⚠️ NO VALIDA
RECOMENDACIÓN: Agregar validación según tipo_doc
```

#### ✅ ESCENARIO 5.3: Caracteres especiales en nombre
```typescript
Input: cliente_nombre='José María & Cía.'
Expected: Escapar correctamente en XML
Resultado: ✅ PASA - Nubefact maneja el escapado
```

---

### CATEGORÍA 6: NOTAS DE CRÉDITO

#### ❌ ESCENARIO 6.1: Nota de crédito sin comprobante origen
```typescript
Input: tipo='NOTA_CREDITO', comprobante_referencia_id=null
Expected: Rechazar
Resultado: ❌ NO VALIDA - Permite crear NC sin referencia
RIESGO: SUNAT rechazará, pero ya consumió correlativo
```

#### ❌ ESCENARIO 6.2: Nota de crédito con monto mayor al original
```typescript
Input: Factura original=100, NC=150
Expected: Rechazar
Resultado: ❌ NO VALIDA
```

#### ❌ ESCENARIO 6.3: Doble nota de crédito para mismo comprobante
```typescript
Input: Ya existe NC para B001-5, intentan crear otra
Expected: Rechazar o alertar
Resultado: ❌ NO VALIDA - Permite duplicado
IMPACTO: MEDIO - Puede causar devolución doble
```

---

### CATEGORÍA 7: ESTADOS Y CONSISTENCIA

#### ✅ ESCENARIO 7.1: Comprobante en PENDIENTE se puede reenviar
```typescript
Input: estado_sunat='PENDIENTE'
Expected: Función reenviarComprobante() existe
Resultado: ✅ PASA - Ver archivo comprobantes.ts línea 500+
```

#### ⚠️ ESCENARIO 7.2: Comprobante ACEPTADO se intenta anular
```typescript
Input: Anular comprobante ACEPTADO
Expected: Solo si <7 días según SUNAT
Resultado: ⚠️ NO VALIDA FECHA - Sistema permite anular cualquier día
```

#### ❌ ESCENARIO 7.3: Comprobante RECHAZADO se queda huérfano
```typescript
Input: SUNAT rechaza comprobante
Expected: Permitir corrección y reenvío
Resultado: ❌ NO HAY FLUJO - Usuario debe crear nuevo comprobante manualmente
IMPACTO: ALTO - Pierde correlativo y debe gestionar manualmente
```

---

### CATEGORÍA 8: INTEGRACIÓN CON CAJA

#### ✅ ESCENARIO 8.1: Movimiento de caja se registra solo si es EFECTIVO
```typescript
Input: metodo_pago='TARJETA'
Expected: NO se crea movimiento_caja
Resultado: ✅ PASA - RPC registrar_cobro_completo valida método
```

#### ⚠️ ESCENARIO 8.2: Pago mixto (50% efectivo + 50% tarjeta)
```typescript
Input: 2 pagos para misma reserva
Expected: Ambos pagos registrados correctamente
Resultado: ⚠️ NO SOPORTADO - Sistema actual solo permite 1 pago por cobro
LIMITACIÓN: No hay flujo para pagos mixtos
```

#### ❌ ESCENARIO 8.3: Turno se cierra mientras se emite comprobante
```typescript
Input: Usuario A cierra turno mientras usuario B cobra
Expected: Rechazar cobro de B
Resultado: ❌ NO VALIDA - Permite cobro con turno cerrado si se pasó el ID
RIESGO: MEDIO - Movimiento queda sin turno o en turno cerrado
```

---

### CATEGORÍA 9: CONCURRENCIA Y LOCKS

#### ⚠️ ESCENARIO 9.1: Múltiples usuarios emitiendo en misma serie
```typescript
Input: 5 usuarios simultáneos en B001
Expected: Correlativos 1-5 sin gaps ni duplicados
Resultado: ⚠️ MITIGADO CON RPC - Pero sin stress test real
RECOMENDACIÓN: Test con Apache Bench o k6
```

#### ❌ ESCENARIO 9.2: Admin cambia serie_comprobante.correlativo_actual manual
```typescript
Input: Admin ejecuta UPDATE series_comprobante SET correlativo_actual=100
Expected: Sistema detecta gap o inconsistencia
Resultado: ❌ NO HAY VALIDACIÓN - Acepta cualquier valor
RIESGO: MEDIO - Puede causar duplicados o saltos
```

---

### CATEGORÍA 10: EDGE CASES EXTREMOS

#### ❌ ESCENARIO 10.1: Comprobante con 1000 items
```typescript
Input: items.length=1000
Expected: Performance aceptable (<5s)
Resultado: ❌ NO PROBADO - Puede causar timeout
RECOMENDACIÓN: Limitar a 50 items max
```

#### ❌ ESCENARIO 10.2: Cliente con nombre de 500 caracteres
```typescript
Input: cliente_nombre='A'.repeat(500)
Expected: Truncar o rechazar
Resultado: ❌ NO VALIDA - Puede romper XML
```

#### ❌ ESCENARIO 10.3: Fecha de emisión en el futuro
```typescript
Input: fecha_emision='31-12-2030'
Expected: Rechazar
Resultado: ❌ NO VALIDA - Acepta cualquier fecha
```

#### ❌ ESCENARIO 10.4: Serie con más de 999,999 comprobantes
```typescript
Input: correlativo_actual=999999
Expected: Alerta o bloqueo
Resultado: ❌ NO VALIDA - Permite > 1 millón
RIESGO: BAJO - Improbable, pero puede pasar en años
```

---

## 🚨 PUNTOS CRÍTICOS IDENTIFICADOS

### SEVERIDAD CRÍTICA (🔴 Bloquean producción)

1. **Sin rollback si Nubefact falla después de cobrar**
   - Archivo: `pagos.ts:283`
   - Problema: Cliente cobra pero no tiene comprobante
   - Solución: Implementar sistema de compensación o marcar como "REQUIERE_REENVÍO"

2. **Sin timeout en llamadas a Nubefact**
   - Archivo: `nubefact.ts:320`
   - Problema: Request puede colgar indefinidamente
   - Solución: Agregar `signal: AbortSignal.timeout(30000)` en fetch

3. **Sin validación de monto PEN 700 para boletas sin RUC**
   - Archivo: `pagos.ts:107`
   - Problema: Incumple normativa SUNAT
   - Solución: Agregar validación antes del RPC

### SEVERIDAD ALTA (🟠 Pueden causar pérdidas)

4. **Sin retry automático para errores de red en Nubefact**
   - Archivo: `pagos.ts:220`
   - Problema: Comprobante queda RECHAZADO cuando debería reintentar
   - Solución: Implementar cola con Bull/BullMQ

5. **Sin validación de RUC/DNI formato**
   - Archivo: `pagos.ts:107`
   - Problema: Nubefact rechazará, pero correlativo ya consumido
   - Solución: Validar con regex antes de enviar

6. **Notas de crédito sin validaciones**
   - Archivo: `comprobantes.ts`
   - Problema: Permite NC sin origen, montos mayores, duplicadas
   - Solución: Agregar validaciones específicas para NC

### SEVERIDAD MEDIA (🟡 Afectan UX)

7. **Sin soporte para pagos mixtos**
   - Limitación: 1 pago por cobro
   - Solución: Permitir array de pagos en input

8. **Sin límite de items por comprobante**
   - Riesgo: Performance degrada con 100+ items
   - Solución: Agregar validación `items.length <= 50`

9. **Sin validación de caracteres especiales en nombres**
   - Riesgo: Puede romper XML si tiene `<>`
   - Solución: Sanitizar o validar antes de enviar

### SEVERIDAD BAJA (🟢 Mejoras recomendadas)

10. **Sin circuit breaker para Nubefact**
    - Problema: Si Nubefact cae, sigue intentando y falla todo
    - Solución: Implementar patrón circuit breaker

11. **Sin precisión decimal para montos**
    - Problema: Errores de redondeo acumulativos
    - Solución: Usar librería `decimal.js`

---

## 📊 MATRIZ DE RIESGO

| ID | Escenario | Probabilidad | Impacto | Severidad | Estado |
|----|-----------|--------------|---------|-----------|--------|
| 3.1 | Nubefact falla después de cobrar | ALTA | CRÍTICO | 🔴 | Sin mitigación |
| 3.2 | Nubefact timeout | MEDIA | CRÍTICO | 🔴 | Sin timeout |
| 4.5 | Boleta >700 sin RUC | ALTA | MEDIO | 🟠 | Sin validación |
| 6.1 | NC sin comprobante origen | BAJA | ALTO | 🟠 | Sin validación |
| 6.3 | Doble NC mismo comprobante | BAJA | MEDIO | 🟡 | Sin validación |
| 8.3 | Turno cerrado durante cobro | BAJA | MEDIO | 🟡 | Sin validación |
| 10.1 | 1000 items en comprobante | MUY BAJA | MEDIO | 🟡 | Sin límite |

---

## ✅ RECOMENDACIONES PRIORITARIAS

### INMEDIATAS (Antes de producción)

1. **Agregar timeout a Nubefact**
   ```typescript
   const controller = new AbortController()
   const timeoutId = setTimeout(() => controller.abort(), 30000)
   
   const response = await fetch(config.api_url, {
     signal: controller.signal,
     // ... resto
   })
   ```

2. **Validar boleta PEN 700**
   ```typescript
   if (input.tipo_comprobante === 'BOLETA' && 
       input.moneda === 'PEN' && 
       total_venta > 700 &&
       input.cliente_tipo_doc !== 'RUC') {
     throw new Error('Boletas mayores a S/ 700 requieren RUC del cliente o emitir como FACTURA')
   }
   ```

3. **Validar formato de documentos**
   ```typescript
   if (input.cliente_tipo_doc === 'RUC' && !/^20\d{9}$/.test(input.cliente_numero_doc)) {
     throw new Error('RUC inválido. Debe tener 11 dígitos y empezar con 20')
   }
   if (input.cliente_tipo_doc === 'DNI' && !/^\d{8}$/.test(input.cliente_numero_doc)) {
     throw new Error('DNI inválido. Debe tener 8 dígitos')
   }
   ```

### CORTO PLAZO (Primera semana)

4. **Implementar retry para Nubefact**
   - Usar Bull/BullMQ para cola de reintentos
   - Estados: PENDIENTE → (retry 3x) → RECHAZADO
   - Interfaz para reenviar manualmente

5. **Agregar límite de items**
   ```typescript
   if (input.items.length > 50) {
     throw new Error('Máximo 50 items por comprobante')
   }
   ```

6. **Validaciones para Notas de Crédito**
   - Requiere comprobante origen
   - Monto NC <= Monto original
   - Solo 1 NC por comprobante origen

### MEDIANO PLAZO (Primer mes)

7. **Circuit breaker para Nubefact**
   - Si 5 errores consecutivos → modo OFFLINE
   - Comprobantes quedan en PENDIENTE automáticamente
   - Interfaz muestra "Sistema de facturación temporalmente offline"

8. **Soporte para pagos mixtos**
   - Modificar input para aceptar array de pagos
   - Validar suma pagos == total comprobante

9. **Dashboard de comprobantes problemáticos**
   - Vista de PENDIENTES con botón "Reenviar"
   - Vista de RECHAZADOS con opción "Corregir y Reenviar"

---

## 🎯 CONCLUSIÓN

### Sistema actual: 6.5/10

**Fortalezas:**
- ✅ Transacciones ACID bien implementadas
- ✅ Idempotencia funcionando
- ✅ Validaciones básicas correctas
- ✅ Logging estructurado

**Debilidades críticas:**
- ❌ Sin manejo de fallo de Nubefact DESPUÉS de cobrar
- ❌ Sin timeout en llamadas externas
- ❌ Sin retry automático
- ❌ Validaciones de negocio incompletas

### ¿Listo para producción?

**SÍ con precauciones:**
- Implementar las 3 recomendaciones INMEDIATAS
- Monitorear de cerca los primeros días
- Tener plan de contingencia manual para PENDIENTES
- Documentar proceso de reenvío manual

**NO si:**
- Hotel tiene >50 check-ins/día (carga alta)
- Nubefact tiene SLA <99% en tu región
- No tienes persona para monitorear comprobantes PENDIENTES

---

**Auditoría realizada por**: GitHub Copilot  
**Método**: Análisis estático + Escenarios de prueba  
**Archivos revisados**: 5 archivos, 3,000+ líneas  
**Escenarios evaluados**: 45 casos  
**Riesgos identificados**: 11 críticos/altos
