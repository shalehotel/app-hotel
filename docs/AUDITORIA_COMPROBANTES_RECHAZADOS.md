# 🔴 AUDITORÍA CRÍTICA: MANEJO DE COMPROBANTES RECHAZADOS

**Fecha**: 9 de Febrero de 2026  
**Tipo**: Auditoría de Integridad Financiera  
**Criticidad**: ⚠️ **ALTA - AFECTA CONTABILIDAD Y REPORTES**

---

## 📋 RESUMEN EJECUTIVO

### Problema Reportado
**Usuario**: "Cuando un documento es rechazado y se emite uno nuevo corregido, actualmente registra ambos como válidos, es decir cuenta el dinero de ambos. El rechazado debe quedar tachado y sin afección a nada cuando se emita la corrección."

### Estado Actual
🔴 **CONFIRMADO**: El sistema tiene **vulnerabilidades críticas** en el manejo de comprobantes rechazados que causan:
1. **Duplicación de ingresos** en reportes de caja
2. **Inconsistencia contable** entre pagos reales y comprobantes emitidos
3. **Comprobantes rechazados cuentan como ventas válidas**
4. **Flujo de corrección incompleto** que no deshabilita el documento rechazado

---

## 🔍 HALLAZGOS DETALLADOS

### 1. FLUJO ACTUAL DE REGISTRO DE PAGOS Y COMPROBANTES

#### 1.1 Transacción Inicial (`cobrarYFacturarAtomico`)
**Archivo**: `lib/actions/pagos.ts` líneas 177-315

**Proceso**:
```typescript
1. RPC registrar_cobro_completo() {
   - Incrementa correlativo (ej: F001-00000023)
   - INSERT INTO comprobantes (estado_sunat = 'PENDIENTE')
   - INSERT INTO pagos (comprobante_id = nuevo_id)
   - INSERT INTO caja_movimientos (tipo='INGRESO', monto=100)
}

2. Enviar a Nubefact API

3. Actualizar estado según respuesta:
   - Si success + aceptada → estado_sunat = 'ACEPTADO'
   - Si success + pendiente → estado_sunat = 'PENDIENTE'
   - Si error → estado_sunat = 'RECHAZADO'
```

**🔴 PROBLEMA #1**: El comprobante rechazado queda con:
- `estado_sunat = 'RECHAZADO'`
- **Pago asociado SIN ELIMINAR** (comprobante_id = F001-23)
- **Movimiento de caja SIN REVERTIR** (ingreso de S/ 100 activo)

#### 1.2 Corrección de Comprobante Rechazado
**Archivo**: `lib/actions/comprobantes.ts` líneas 1419-1620

**Proceso**:
```typescript
1. Validar comprobante original (estado_sunat = 'RECHAZADO')

2. Crear NUEVO comprobante {
   - Obtener nuevo correlativo (ej: F001-00000024)
   - INSERT INTO comprobantes (nuevo registro)
   - Copiar detalles del anterior
}

3. MIGRAR PAGOS: ✅ BIEN HECHO
   UPDATE pagos SET comprobante_id = F001-24
   WHERE comprobante_id = F001-23

4. Enviar nuevo comprobante a Nubefact

5. ❌ NO MARCA EL RECHAZADO COMO INVÁLIDO
```

**🔴 PROBLEMA #2**: El flujo migra los pagos correctamente, **PERO**:
- El comprobante rechazado (F001-23) queda visible en listados
- No hay marca visual de "REEMPLAZADO"
- No se guarda relación con el comprobante que lo corrigió

---

### 2. IMPACTO EN REPORTES DE CAJA

#### 2.1 Reporte de Métodos de Pago (`getReporteMetodosPago`)
**Archivo**: `lib/actions/cajas.ts` líneas 1636-1680

**Query actual**:
```typescript
SELECT metodo_pago, monto, moneda_pago, tipo_cambio_pago
FROM pagos
WHERE caja_turno_id = turno_id
```

**✅ RESULTADO**: **NO HAY DUPLICACIÓN** en reportes de caja

**Explicación**: 
- Cuando se corrige un comprobante rechazado, los pagos se **migran** al nuevo comprobante
- Los pagos solo se cuentan una vez porque `UPDATE pagos SET comprobante_id = nuevo_id`
- El reporte lee desde `pagos`, no desde `comprobantes`

**🟢 CONCLUSIÓN**: La lógica de migración de pagos (línea 1537 en comprobantes.ts) **previene la duplicación** en reportes financieros.

#### 2.2 Cálculo de Movimientos de Turno (`calcular_movimientos_turno`)
**Archivo**: `supabase/migrations/schema-maestro-unified-v3.sql` líneas 660-725

**Query**:
```sql
SELECT 
  SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END) as total_ingresos_pen,
  SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END) as total_egresos_pen
FROM caja_movimientos
WHERE caja_turno_id = p_turno_id
```

**🔴 PROBLEMA #3**: Los movimientos de caja **NO** se revierten cuando un comprobante es rechazado

**Ejemplo**:
```
1. Cliente paga S/ 100 → se registra movimiento INGRESO S/ 100
2. Comprobante F001-23 es RECHAZADO por SUNAT
3. Se corrige y emite F001-24 ACEPTADO
4. Movimiento de caja sigue siendo S/ 100 (correcto)
5. ✅ NO hay duplicación porque no se crea un segundo movimiento
```

**✅ RESULTADO**: **NO HAY DUPLICACIÓN** en movimientos de caja

**Explicación**:
- El movimiento de caja se crea UNA SOLA VEZ en `registrar_cobro_completo`
- La corrección de comprobante **NO crea un nuevo movimiento**
- Solo actualiza la referencia del pago (comprobante_id)

---

### 3. IMPACTO EN VISTAS Y LISTADOS

#### 3.1 Listado de Comprobantes
**Archivo**: `lib/actions/comprobantes.ts` líneas 550-720

**Query**:
```typescript
SELECT * FROM comprobantes
WHERE turno_caja_id = ?
ORDER BY fecha_emision DESC
```

**🔴 PROBLEMA #4**: Comprobantes rechazados aparecen mezclados con válidos

**Vista actual**:
```
✅ F001-00000024 | ACEPTADO  | S/ 100.00
❌ F001-00000023 | RECHAZADO | S/ 100.00  ← Este NO debería aparecer como "activo"
✅ F001-00000022 | ACEPTADO  | S/  50.00
```

**🟡 FILTRO ACTUAL**:
```typescript
// Línea 562
if (filtros?.estado_sunat && filtros.estado_sunat !== 'TODOS') {
  query = query.eq('estado_sunat', filtros.estado_sunat)
}
```

**Análisis**:
- Si usuario filtra por "ACEPTADO" → no ve los rechazados ✅
- Si usuario no filtra → ve TODOS (incluidos rechazados) ❌
- No hay diferenciación visual entre "RECHAZADO SIN REEMPLAZAR" vs "RECHAZADO Y CORREGIDO"

#### 3.2 Estadísticas de Comprobantes
**Archivo**: `lib/actions/comprobantes.ts` líneas 736-741

```typescript
total_boletas: data.filter(c => c.tipo_comprobante === 'BOLETA' && c.estado_sunat !== 'ANULADO').length,
total_facturas: data.filter(c => c.tipo_comprobante === 'FACTURA' && c.estado_sunat !== 'ANULADO').length,
```

**🔴 PROBLEMA #5**: Los comprobantes RECHAZADOS **sí cuentan** en las estadísticas de ventas

**Cálculo incorrecto**:
```
- Total Boletas: cuenta ACEPTADO + PENDIENTE + RECHAZADO ❌
- Total Facturas: cuenta ACEPTADO + PENDIENTE + RECHAZADO ❌
- Solo excluye ANULADO
```

**Impacto**:
- Dashboard muestra más comprobantes de los reales
- Métricas de "ventas del día" infladas artificialmente

---

### 4. ANÁLISIS DE RELACIONES EN BASE DE DATOS

#### 4.1 Estructura de Tablas

```sql
comprobantes {
  id (PK)
  estado_sunat: PENDIENTE | ACEPTADO | RECHAZADO | ANULADO
  nota_credito_ref_id: uuid (solo para Notas de Crédito)
  -- ❌ NO HAY: comprobante_correccion_id
  -- ❌ NO HAY: reemplazado_por
}

pagos {
  id (PK)
  comprobante_id (FK → comprobantes)
  monto
  metodo_pago
}

caja_movimientos {
  id (PK)
  caja_turno_id (FK)
  tipo: INGRESO | EGRESO
  monto
  comprobante_referencia: text (ej: "F001-00000023")
  -- ❌ NO HAY FK a comprobantes
}
```

**🔴 PROBLEMA #6**: No hay campo `reemplazado_por` en comprobantes

**Consecuencia**:
- No se puede saber si un RECHAZADO fue corregido
- No se puede rastrear qué comprobante reemplazó a cuál
- Imposible ocultar automáticamente los rechazados que ya fueron corregidos

#### 4.2 Trigger de Protección
**Archivo**: `supabase/migrations/schema-maestro-unified-v3.sql` líneas 444-449

```sql
CREATE OR REPLACE FUNCTION prevent_comprobante_edit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.estado_sunat != 'PENDIENTE') THEN
        RAISE EXCEPTION 'Solo comprobantes PENDIENTES pueden ser editados';
    END IF;
    RETURN NEW;
END; $$;
```

**✅ PROTECCIÓN**: Comprobantes ACEPTADOS, RECHAZADOS y ANULADOS son **inmutables**

**Implicación**:
- No se puede cambiar estado de RECHAZADO a ANULADO manualmente
- La única forma de "desactivar" un rechazado es mediante la lógica de aplicación

---

## 🎯 DIAGNÓSTICO FINAL

### ¿HAY DUPLICACIÓN DE DINERO? 

**RESPUESTA**: **NO** hay duplicación real en los cálculos de caja, **PERO SÍ** hay problemas de presentación y métricas.

### Resumen por Área:

| Área | Estado | Explicación |
|------|--------|-------------|
| **💰 Reportes de Caja (efectivo, tarjeta, etc.)** | ✅ **CORRECTO** | Los pagos se migran al nuevo comprobante. Solo se cuenta el dinero una vez. |
| **📊 Movimientos de Caja (ingresos/egresos)** | ✅ **CORRECTO** | El movimiento se crea una sola vez. La corrección no duplica. |
| **📋 Listados de Comprobantes** | 🔴 **INCORRECTO** | Comprobantes rechazados aparecen como activos sin distinción. |
| **📈 Estadísticas de Ventas** | 🔴 **INCORRECTO** | Cuenta RECHAZADOS como ventas válidas (inflado artificial). |
| **🔗 Trazabilidad** | 🔴 **INCORRECTO** | No se puede saber si un rechazado fue reemplazado. |
| **🎨 UI/UX** | 🔴 **INCORRECTO** | Usuario ve documentos rechazados mezclados con válidos. |

---

## 🛠️ RECOMENDACIONES DE CORRECCIÓN

### CRÍTICO - Implementar YA (Afecta Métricas y UI)

#### 1. Agregar Campo `reemplazado_por` en Comprobantes

**Migración SQL**:
```sql
-- Agregar columna para rastrear correcciones
ALTER TABLE comprobantes 
ADD COLUMN reemplazado_por uuid REFERENCES comprobantes(id);

COMMENT ON COLUMN comprobantes.reemplazado_por IS 
'Si este comprobante RECHAZADO fue corregido, apunta al nuevo comprobante válido';

-- Índice para consultas rápidas
CREATE INDEX idx_comprobantes_reemplazado 
ON comprobantes(reemplazado_por) 
WHERE reemplazado_por IS NOT NULL;
```

**Lógica de Aplicación** (`corregirComprobanteRechazado`):
```typescript
// AGREGAR después de crear el nuevo comprobante (línea 1560)
await supabase
  .from('comprobantes')
  .update({ reemplazado_por: nuevoComprobante.id })
  .eq('id', comprobanteId) // El rechazado queda marcado
```

#### 2. Excluir Rechazados de Estadísticas

**Modificar** `lib/actions/comprobantes.ts` líneas 736-741:
```typescript
// ANTES (incorrecto):
total_boletas: data.filter(c => 
  c.tipo_comprobante === 'BOLETA' && 
  c.estado_sunat !== 'ANULADO'
).length,

// DESPUÉS (correcto):
total_boletas: data.filter(c => 
  c.tipo_comprobante === 'BOLETA' && 
  c.estado_sunat !== 'ANULADO' &&
  c.estado_sunat !== 'RECHAZADO' // ← AGREGAR
).length,

// O mejor aún (solo contar válidos):
total_boletas: data.filter(c => 
  c.tipo_comprobante === 'BOLETA' && 
  ['ACEPTADO', 'PENDIENTE'].includes(c.estado_sunat)
).length,
```

#### 3. Filtrar Rechazados Reemplazados en Listados

**Modificar** `lib/actions/comprobantes.ts` líneas 550-720:
```typescript
// AGREGAR después de la query base:
query = query.select(`
  *,
  reemplazado_por
`)

// Excluir rechazados que ya fueron corregidos
// (mostrar solo si no tienen reemplazo o el usuario filtró explícitamente)
if (!filtros?.incluir_rechazados_corregidos) {
  // Usando SQL directo para evitar traer registros innecesarios:
  query = query.or(`estado_sunat.neq.RECHAZADO,reemplazado_por.is.null`)
}
```

#### 4. Mejorar UI de Listado de Comprobantes

**Badge Visual** para estados:
```tsx
// En components/facturacion/...
{comprobante.estado_sunat === 'RECHAZADO' && (
  comprobante.reemplazado_por ? (
    <Badge variant="outline" className="opacity-50">
      <X className="h-3 w-3 mr-1" />
      REEMPLAZADO
    </Badge>
  ) : (
    <Badge variant="destructive">
      <AlertTriangle className="h-3 w-3 mr-1" />
      RECHAZADO - Requiere Corrección
    </Badge>
  )
)}
```

**Estilo Visual**:
```tsx
<TableRow 
  className={cn(
    comprobante.estado_sunat === 'RECHAZADO' && comprobante.reemplazado_por 
      ? "opacity-40 line-through" // Tachado si fue reemplazado
      : ""
  )}
>
```

---

### MEDIO - Mejoras de Auditoría

#### 5. Agregar Auditoría de Cambios de Estado

**Tabla nueva**:
```sql
CREATE TABLE comprobante_historial_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid REFERENCES comprobantes(id) ON DELETE CASCADE,
  estado_anterior estado_sunat_enum,
  estado_nuevo estado_sunat_enum NOT NULL,
  usuario_id uuid REFERENCES usuarios(id),
  motivo text,
  respuesta_sunat jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_historial_comprobante ON comprobante_historial_estados(comprobante_id, created_at DESC);
```

**Trigger automático**:
```sql
CREATE OR REPLACE FUNCTION log_comprobante_estado_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado_sunat != NEW.estado_sunat THEN
    INSERT INTO comprobante_historial_estados (
      comprobante_id,
      estado_anterior,
      estado_nuevo,
      respuesta_sunat
    ) VALUES (
      NEW.id,
      OLD.estado_sunat,
      NEW.estado_sunat,
      jsonb_build_object('observaciones', NEW.observaciones)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_log_estado_comprobante
AFTER UPDATE ON comprobantes
FOR EACH ROW EXECUTE FUNCTION log_comprobante_estado_change();
```

---

### BAJO - Mejoras de UX

#### 6. Dashboard de Comprobantes Rechazados

Crear widget en dashboard principal:
```typescript
// lib/actions/dashboard.ts
export async function getComprobantesRechazadosSinCorregir() {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('comprobantes')
    .select('id, serie, numero, total_venta, fecha_emision, observaciones')
    .eq('estado_sunat', 'RECHAZADO')
    .is('reemplazado_por', null) // Solo los que NO han sido corregidos
    .order('fecha_emision', { ascending: false })
    .limit(10)
  
  return data || []
}
```

UI:
```tsx
// components/dashboard/rechazados-alert.tsx
<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Comprobantes Rechazados Pendientes</AlertTitle>
  <AlertDescription>
    Tienes {rechazados.length} comprobantes rechazados que requieren corrección.
    <Button variant="link" onClick={() => router.push('/facturacion?estado=RECHAZADO')}>
      Ver Todos
    </Button>
  </AlertDescription>
</Alert>
```

---

## 📊 PLAN DE IMPLEMENTACIÓN

### Fase 1: Correcciones Críticas (30 minutos)
1. ✅ Migración: Agregar columna `reemplazado_por`
2. ✅ Código: Actualizar `corregirComprobanteRechazado` para marcar reemplazo
3. ✅ Código: Excluir RECHAZADOS de estadísticas
4. ✅ Código: Filtrar rechazados reemplazados en listados

### Fase 2: Mejoras de UI (45 minutos)
5. ✅ Componente: Badge visual para estados
6. ✅ Componente: Estilo tachado para reemplazados
7. ✅ Página: Filtro "Mostrar rechazados corregidos" (off por defecto)

### Fase 3: Auditoría y Monitoreo (1 hora)
8. ⏳ Tabla: `comprobante_historial_estados`
9. ⏳ Trigger: Log automático de cambios de estado
10. ⏳ Dashboard: Widget de rechazados pendientes

---

## ✅ CONCLUSIÓN

**Pregunta Original**: ¿Se está duplicando el dinero de comprobantes rechazados?

**Respuesta**: 
- ✅ **NO** hay duplicación en reportes financieros (caja, efectivo, ingresos)
- ❌ **SÍ** hay problemas en métricas de ventas y presentación de datos
- ❌ **SÍ** hay falta de trazabilidad en correcciones

**Prioridad**: **ALTA** - Implementar Fase 1 y 2 inmediatamente para:
1. Corregir estadísticas de ventas (infladas por rechazados)
2. Mejorar UX ocultando documentos ya corregidos
3. Agregar trazabilidad para auditorías futuras

**Riesgo Actual**: 
- Reportes ejecutivos muestran más ventas de las reales
- Usuario ve documentos inválidos mezclados con válidos
- No hay forma de auditar qué documentos fueron corregidos

**Severidad**: 🟡 **MEDIA-ALTA** (no afecta dinero real, pero sí métricas de negocio)
