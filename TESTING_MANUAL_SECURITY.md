# 🧪 SCRIPT DE TESTING MANUAL - CORRECCIONES DE SEGURIDAD

## Objetivo
Validar que las 3 correcciones críticas funcionan correctamente antes de ir a producción.

---

## ✅ TEST 1: CIERRE CIEGO

### Objetivo
Verificar que el cajero NO ve el monto esperado antes de declarar su conteo.

### Pasos

1. **Abrir un turno de caja:**
   - Usuario: Recepcionista
   - Caja: Caja Principal
   - Monto apertura: S/ 100.00

2. **Realizar operaciones normales:**
   - Registrar 1 cobro en efectivo: S/ 50.00
   - Registrar 1 egreso manual: S/ 20.00
   - **Monto esperado real:** S/ 100 + S/ 50 - S/ 20 = **S/ 130.00**

3. **Intentar cerrar turno:**
   - Click en "Cerrar Turno"
   - ✅ **VALIDAR:** El diálogo NO muestra "Esperado: S/ 130.00"
   - ✅ **VALIDAR:** Solo muestra "Cuenta el dinero físico y declara el monto exacto"
   - ✅ **VALIDAR:** El campo de entrada está vacío

4. **Declarar monto diferente (simulando error humano):**
   - Declarar: S/ 125.00 (S/ 5 de menos)
   - Confirmar cierre

5. **Verificar resultado:**
   - ✅ **VALIDAR:** El toast NO muestra "Faltante: S/ 5.00"
   - ✅ **VALIDAR:** El toast dice "Revisa el historial para ver el resultado"
   - ✅ **VALIDAR:** El usuario NO sabe si hubo descuadre

6. **Revisar historial (como ADMIN):**
   - Ir a Cajas > Historial
   - Buscar el turno cerrado
   - ✅ **VALIDAR:** Ahora sí se muestra:
     - Esperado: S/ 130.00
     - Declarado: S/ 125.00
     - Diferencia: -S/ 5.00 (Faltante)

### Resultado Esperado
🟢 **PASS:** El cajero no tuvo visibilidad del monto esperado durante el cierre.

---

## ✅ TEST 2: BLOQUEO POST-CIERRE EN ANULACIONES

### Objetivo
Verificar que NO se pueden anular movimientos después de cerrar el turno.

### Pasos

1. **Abrir un turno de caja:**
   - Usuario: Recepcionista
   - Caja: Caja Principal
   - Monto apertura: S/ 100.00

2. **Registrar un egreso:**
   - Tipo: Egreso
   - Categoría: Compra de suministros
   - Monto: S/ 30.00
   - Motivo: "Compra de papel higiénico"
   - ✅ **ANOTAR:** ID del movimiento (revisar en consola o DB)

3. **Intentar anular el movimiento (turno ABIERTO):**
   - Click en el botón de anular del movimiento
   - Ingresar motivo: "Error en el registro"
   - ✅ **VALIDAR:** La anulación FUNCIONA correctamente
   - ✅ **VALIDAR:** El movimiento aparece tachado o marcado como "Anulado"

4. **Cerrar el turno:**
   - Declarar monto: S/ 100.00 (porque anulamos el egreso)
   - Confirmar cierre

5. **Intentar anular OTRO movimiento del turno cerrado:**
   - Desde el historial, intentar anular cualquier movimiento
   - ✅ **VALIDAR:** El sistema muestra error:
     ```
     ⛔ PROHIBIDO: No se pueden anular movimientos de un turno cerrado.
     Esto alteraría el arqueo final. Contacta al administrador.
     ```

6. **Verificar en base de datos (opcional - para devs):**
   ```sql
   SELECT id, tipo, monto, anulado, created_at
   FROM caja_movimientos
   WHERE caja_turno_id = '<turno_id>'
   ORDER BY created_at DESC;
   ```
   - ✅ **VALIDAR:** El movimiento anulado tiene `anulado = true`
   - ✅ **VALIDAR:** Los demás movimientos están intactos

### Resultado Esperado
🟢 **PASS:** Imposible modificar arqueo después del cierre.

---

## ✅ TEST 3: RACE CONDITIONS EN CIERRE CONCURRENTE

### Objetivo
Verificar el manejo correcto cuando dos usuarios intentan cerrar la misma caja simultáneamente.

### Pasos

1. **Setup inicial:**
   - Abrir 1 turno de caja
   - Usuario: Recepcionista A
   - Caja: Caja Principal

2. **Simular cierre concurrente:**
   
   **Opción A - Con 2 navegadores:**
   - Abrir 2 ventanas de Chrome (modo incógnito + normal)
   - Login como el mismo usuario en ambas
   - En ventana 1: Click en "Cerrar Turno" → NO confirmar aún
   - En ventana 2: Click en "Cerrar Turno" → NO confirmar aún
   - Declarar S/ 100 en ambas
   - En ventana 1: Click en "Confirmar Cierre" (primero)
   - **ESPERAR 2 segundos**
   - En ventana 2: Click en "Confirmar Cierre" (segundo)

   **Opción B - Directo en DB (para devs):**
   ```sql
   -- En una pestaña de SQL:
   BEGIN;
   SELECT * FROM caja_turnos WHERE id = '<turno_id>' FOR UPDATE;
   -- NO hacer COMMIT aún

   -- Intentar cerrar desde el frontend
   -- Luego hacer COMMIT en SQL
   ```

3. **Validar comportamiento:**
   - ✅ **Ventana 1:** Cierre exitoso con toast: "✅ Turno cerrado correctamente"
   - ✅ **Ventana 2:** Error claro: "⚠️ Este turno ya fue cerrado por otro usuario. Actualiza la página."
   - ✅ **VALIDAR:** El error NO es genérico tipo "Database error" o "Unknown error"

4. **Verificar en base de datos:**
   ```sql
   SELECT 
     id, 
     estado, 
     fecha_cierre, 
     monto_cierre_real_efectivo
   FROM caja_turnos
   WHERE id = '<turno_id>';
   ```
   - ✅ **VALIDAR:** Solo hay 1 registro de cierre
   - ✅ **VALIDAR:** `estado = 'CERRADA'`
   - ✅ **VALIDAR:** Solo el monto del usuario que cerró primero está guardado

### Resultado Esperado
🟢 **PASS:** Race condition manejada correctamente con mensaje claro.

---

## 🎯 TEST 4: UNIMONEDA (Bonus)

### Objetivo
Verificar que el sistema ya no maneja USD innecesariamente.

### Pasos

1. **Revisar diálogo de cierre:**
   - Abrir turno → Intentar cerrar
   - ✅ **VALIDAR:** NO hay campo para "Dólares" (USD)
   - ✅ **VALIDAR:** Solo hay calculadora de billetes para SOLES

2. **Revisar código (para devs):**
   ```bash
   # Buscar referencias a USD innecesarias
   grep -r "DENOMINACIONES_USD" components/cajas/
   # Debe retornar: 0 resultados

   grep -r "monto_declarado_usd" components/cajas/cerrar-caja-dialog.tsx
   # Debe retornar: 1 resultado (línea 86 con valor fijo: 0)
   ```

3. **Verificar backend:**
   - ✅ **VALIDAR:** `cerrarCajaAtomico()` pasa `monto_declarado_usd: 0`
   - ✅ **VALIDAR:** `forzarCierreCaja()` pasa `monto_cierre_real_usd: 0`

### Resultado Esperado
🟢 **PASS:** Sistema simplificado a unimoneda.

---

## 📊 RESUMEN DE TESTING

| Test | Estado | Tiempo Est. | Prioridad |
|------|--------|-------------|-----------|
| Test 1: Cierre Ciego | ⏳ Pendiente | 5 min | 🔴 Crítico |
| Test 2: Bloqueo Post-Cierre | ⏳ Pendiente | 7 min | 🔴 Crítico |
| Test 3: Race Conditions | ⏳ Pendiente | 10 min | 🟡 Alto |
| Test 4: Unimoneda | ⏳ Pendiente | 3 min | 🟢 Medio |

**Total Estimado:** ~25 minutos

---

## ✅ CRITERIOS DE APROBACIÓN

Para considerar el sistema **Production-Ready**, TODOS los tests deben pasar:

- [ ] Test 1: Cierre ciego funcional (cajero no ve monto esperado)
- [ ] Test 2: Anulación post-cierre bloqueada
- [ ] Test 3: Race condition con mensaje claro
- [ ] Test 4: USD eliminado del flujo

**Si algún test falla:** Reportar inmediatamente al equipo de desarrollo con:
- Nombre del test fallido
- Screenshot del error
- Pasos exactos para reproducir

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DEL TESTING

1. ✅ Todos los tests pasaron → **Deploy a Producción**
2. ❌ Algún test falló → **Rollback y debug**
3. 📝 Documentar resultados en ticket de QA
4. 📢 Capacitar al equipo sobre nuevos flujos

---

**¡Éxito en el testing!** 🧪✅
