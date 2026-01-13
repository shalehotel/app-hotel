# CHECKLIST DE VERIFICACIÓN POST-CORRECCIONES
## Sistema PMS Hotel - Validación de Cambios

**Fecha:** 2025-01-31  
**Objetivo:** Verificar que todas las correcciones funcionan correctamente

---

## ✅ PASO 1: APLICAR MIGRATION

### Comando:
```bash
npx supabase db push
```

### Verificar:
- [ ] Migration `20260201120000_add_cobrar_facturar_atomico.sql` aplicada
- [ ] Función `cobrar_y_facturar_atomico()` existe en la base de datos
- [ ] Sin errores de sintaxis SQL

### Query de verificación:
```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'cobrar_y_facturar_atomico';
```
Debe retornar 1 fila con 16 argumentos.

---

## ✅ PASO 2: CONFIGURACIÓN FISCAL

### Navegación:
1. Ir a `/configuracion`
2. Verificar sección "Configuración Fiscal"

### Pruebas:
- [ ] **Caso 1:** Intentar emitir factura SIN RUC configurado
  - **Resultado esperado:** ❌ "Configure RUC y razón social antes de emitir facturas"
  
- [ ] **Caso 2:** Configurar RUC y razón social
  - **Resultado esperado:** ✅ Se guarda correctamente

- [ ] **Caso 3:** Cambiar tasa de IGV de 18% a 16%
  - **Resultado esperado:** ✅ Se actualiza, nueva facturación usa 16%

- [ ] **Caso 4:** Activar "Exonerado de IGV"
  - **Resultado esperado:** ✅ Facturas siguientes tienen IGV = 0

### SQL de verificación:
```sql
SELECT ruc, razon_social, tasa_igv, es_exonerado_igv 
FROM hotel_configuracion 
LIMIT 1;
```

---

## ✅ PASO 3: VALIDACIÓN DE SERIES

### Navegación:
1. Ir a `/cajas`
2. Seleccionar sesión de caja abierta
3. Intentar generar comprobante

### Pruebas:
- [ ] **Caso 1:** Seleccionar serie que NO existe (eliminar desde DB)
  - **Resultado esperado:** ❌ "Serie no encontrada"

- [ ] **Caso 2:** Intentar usar serie de BOLETA para generar FACTURA
  - **Resultado esperado:** ❌ "La serie B001 no es válida para FACTURA"

- [ ] **Caso 3:** Usar serie correcta
  - **Resultado esperado:** ✅ Correlativo generado, comprobante creado

### SQL de verificación:
```sql
SELECT s.codigo_serie, s.tipo_comprobante, s.proximo_numero, c.numero_comprobante
FROM series s
LEFT JOIN comprobantes c ON c.serie_id = s.id
WHERE s.estado = true
ORDER BY c.created_at DESC
LIMIT 5;
```

---

## ✅ PASO 4: CÁLCULO MULTIMONEDA

### Escenarios de prueba:

#### Escenario A: Reserva en PEN, Pago en USD
- [ ] Crear reserva: Total = 1,000 PEN
- [ ] Registrar pago: 100 USD (TC = 3.80)
- [ ] **Resultado esperado:** Saldo pendiente = 1,000 - (100 * 3.80) = 620 PEN

#### Escenario B: Reserva en USD, Pago en PEN
- [ ] Crear reserva: Total = 500 USD
- [ ] Registrar pago: 380 PEN (TC = 3.80)
- [ ] **Resultado esperado:** Saldo pendiente = 500 - (380 / 3.80) = 400 USD

#### Escenario C: Pago mixto (misma moneda)
- [ ] Crear reserva: Total = 1,000 PEN
- [ ] Pago 1: 500 PEN
- [ ] Pago 2: 500 PEN
- [ ] **Resultado esperado:** Saldo pendiente = 0 PEN

### SQL de verificación:
```sql
SELECT 
  r.codigo_reserva,
  r.tarifa_total,
  r.moneda_pactada,
  p.monto,
  p.moneda_pago,
  p.tipo_cambio_pago,
  -- Cálculo manual del saldo
  CASE 
    WHEN r.moneda_pactada = 'PEN' AND p.moneda_pago = 'USD' 
      THEN r.tarifa_total - (p.monto * p.tipo_cambio_pago)
    WHEN r.moneda_pactada = 'USD' AND p.moneda_pago = 'PEN' 
      THEN r.tarifa_total - (p.monto / p.tipo_cambio_pago)
    ELSE r.tarifa_total - p.monto
  END as saldo_calculado
FROM reservas r
INNER JOIN pagos p ON p.reserva_id = r.id
WHERE r.moneda_pactada != p.moneda_pago
ORDER BY r.created_at DESC
LIMIT 3;
```

---

## ✅ PASO 5: ROLLBACK EN CHECKOUT

### Preparación:
1. Crear reserva de prueba en estado CHECKED_IN
2. Identificar `habitacion_id` de la reserva

### Prueba de rollback:
```sql
-- Simular error: renombrar tabla temporalmente
ALTER TABLE habitaciones RENAME TO habitaciones_backup;

-- Intentar checkout desde UI
-- Resultado esperado: ❌ Checkout FALLA con rollback

-- Verificar que la reserva sigue CHECKED_IN
SELECT estado, check_out_real, huesped_presente 
FROM reservas 
WHERE id = '<reserva-id>';
-- Debe mostrar: estado = 'CHECKED_IN', check_out_real = NULL

-- Restaurar tabla
ALTER TABLE habitaciones_backup RENAME TO habitaciones;
```

### Prueba exitosa:
- [ ] Checkout normal (sin simular error)
- [ ] **Resultado esperado:** 
  - ✅ Reserva → estado = 'CHECKED_OUT'
  - ✅ Habitación → estado_ocupacion = 'LIBRE', estado_limpieza = 'SUCIA'

---

## ✅ PASO 6: VALIDACIÓN DE TRANSICIONES

### Pruebas:

#### Test 1: Transición válida PENDIENTE → CONFIRMADA
```typescript
// Desde UI o consola
const resultado = await cancelarReserva('<reserva-pendiente-id>')
// Resultado esperado: ✅ Success
```

#### Test 2: Transición inválida CHECKED_OUT → PENDIENTE
```sql
-- Intentar desde SQL
UPDATE reservas 
SET estado = 'PENDIENTE' 
WHERE id = '<reserva-checked-out-id>';

-- Resultado esperado: ❌ Falla (trigger o lógica de negocio)
```

#### Test 3: Cancelar reserva CHECKED_IN
- [ ] Ir a reserva con estado CHECKED_IN
- [ ] Intentar cancelar
- [ ] **Resultado esperado:** ✅ Permitido (casos especiales)

#### Test 4: Cancelar reserva CHECKED_OUT
- [ ] Ir a reserva con estado CHECKED_OUT
- [ ] Intentar cancelar
- [ ] **Resultado esperado:** ❌ "Transición inválida: no se puede cambiar de CHECKED_OUT a CANCELADA"

### Tabla de transiciones esperadas:

| Desde | A | Permitido | Mensaje si falla |
|-------|---|-----------|-----------------|
| PENDIENTE | CONFIRMADA | ✅ Sí | - |
| PENDIENTE | CANCELADA | ✅ Sí | - |
| CONFIRMADA | CHECKED_IN | ✅ Sí | - |
| CHECKED_IN | CHECKED_OUT | ✅ Sí | - |
| CHECKED_OUT | CANCELADA | ❌ No | "Transición inválida..." |
| CANCELADA | CHECKED_IN | ❌ No | "Transición inválida..." |

---

## ✅ PASO 7: FUNCIÓN ATÓMICA

### Test desde UI:
1. Crear reserva con saldo pendiente
2. Ir a `/cajas` y registrar pago + factura
3. Verificar en consola del navegador:
   ```javascript
   // Debería usar: cobrarYFacturarAtomico()
   ```

### Test desde SQL:
```sql
-- Preparación: obtener IDs necesarios
SELECT id FROM series WHERE tipo_comprobante = 'BOLETA' AND estado = true LIMIT 1;
SELECT id FROM reservas WHERE estado = 'CHECKED_IN' LIMIT 1;
SELECT id FROM sesiones_caja WHERE estado = true LIMIT 1;
SELECT id FROM usuarios LIMIT 1;

-- Ejecutar función
SELECT cobrar_y_facturar_atomico(
  'BOLETA'::VARCHAR,               -- tipo_comprobante
  '<serie-id>'::UUID,              -- serie_id
  '<reserva-id>'::UUID,            -- reserva_id
  100.00,                          -- base_imponible
  118.00,                          -- total
  'PEN'::VARCHAR(3),               -- moneda
  1.0000,                          -- tipo_cambio_factura
  NOW(),                           -- fecha_emision
  118.00,                          -- monto_pago
  'PEN'::VARCHAR(3),               -- moneda_pago
  1.0000,                          -- tipo_cambio_pago
  'EFECTIVO'::VARCHAR,             -- metodo_pago
  NULL,                            -- referencia_pago
  '<sesion-id>'::UUID,             -- sesion_caja_id
  '<usuario-id>'::UUID,            -- usuario_id
  'Pago de reserva TEST'           -- descripcion
);
```

### Verificación post-ejecución:
```sql
-- Verificar comprobante creado
SELECT * FROM comprobantes WHERE reserva_id = '<reserva-id>' ORDER BY created_at DESC LIMIT 1;

-- Verificar pago registrado
SELECT * FROM pagos WHERE reserva_id = '<reserva-id>' ORDER BY created_at DESC LIMIT 1;

-- Verificar movimiento de caja
SELECT * FROM movimientos_caja WHERE comprobante_id = '<comprobante-id>';
```

### Test de rollback:
```sql
-- Forzar error: intentar con serie inexistente
SELECT cobrar_y_facturar_atomico(
  'BOLETA'::VARCHAR,
  '00000000-0000-0000-0000-000000000000'::UUID, -- Serie inválida
  '<reserva-id>'::UUID,
  -- ... resto de parámetros
);

-- Resultado esperado: ❌ Error "Serie no encontrada o inválida"

-- Verificar que NO se creó nada:
SELECT COUNT(*) FROM comprobantes WHERE reserva_id = '<reserva-id>'; -- Debe ser 0
SELECT COUNT(*) FROM pagos WHERE reserva_id = '<reserva-id>'; -- Debe ser 0
```

---

## ✅ PASO 8: REVISIÓN DE LOGS

### Verificar que se registran eventos críticos:
```bash
# Buscar en terminal del servidor Next.js
# Patrones a buscar:

[INFO] Transacción atómica completada exitosamente
[ERROR] Error en transacción atómica cobrar_y_facturar
[ERROR] Error al actualizar habitación, haciendo rollback
[WARN] Transición inválida: no se puede cambiar de...
```

### Archivos de log (si están habilitados):
- `logs/app.log`
- `logs/errors.log`

---

## 📊 RESUMEN DE VALIDACIÓN

| Test | Estado | Notas |
|------|--------|-------|
| Migration aplicada | ⬜ | |
| IGV dinámico | ⬜ | Probar 16%, 18%, exonerado |
| Validación fiscal | ⬜ | Bloquear factura sin RUC |
| Validación series | ⬜ | Serie inexistente o tipo incorrecto |
| Multimoneda PEN→USD | ⬜ | |
| Multimoneda USD→PEN | ⬜ | |
| Rollback checkout | ⬜ | Simular error de habitación |
| Transiciones válidas | ⬜ | Probar 3 casos |
| Transiciones inválidas | ⬜ | Bloquear CHECKED_OUT→PENDIENTE |
| Función atómica exitosa | ⬜ | |
| Función atómica rollback | ⬜ | Forzar error |
| Logs registrados | ⬜ | |

---

## 🚨 ISSUES CONOCIDOS

Si encuentras algún problema durante la verificación, documéntalo aquí:

1. **Issue:** 
   - **Descripción:** 
   - **Pasos para reproducir:** 
   - **Solución propuesta:** 

---

## 📞 CONTACTO

Para dudas o soporte sobre estas correcciones:
- Revisar: [RESUMEN_CORRECCIONES_IMPLEMENTADAS.md](RESUMEN_CORRECCIONES_IMPLEMENTADAS.md)
- Auditoría original: [AUDITORIA_COMPLETA_SISTEMA_PMS.md](AUDITORIA_COMPLETA_SISTEMA_PMS.md)

---

**Última actualización:** 2025-01-31
