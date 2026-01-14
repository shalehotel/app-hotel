# 📦 Módulo de Cajas - Gestión Efectivo vs Digital

## 🎯 **Filosofía del Sistema**

### **Principio Fundamental: Efectivo vs Digital**

| Tipo de Pago | ¿Se Cuadra al Cerrar? | ¿Cómo se Audita? |
|--------------|----------------------|------------------|
| **EFECTIVO** | ✅ SÍ - Se cuenta físicamente | Conteo manual de billetes/monedas |
| **TARJETA** | ❌ NO - Se registra solamente | Vouchers POS + Estado de cuenta bancario |
| **TRANSFERENCIA** | ❌ NO - Se registra solamente | Extracto bancario |
| **YAPE/PLIN** | ❌ NO - Se registra solamente | Historial de la app |

**Razón:** Solo el efectivo está físicamente en la caja y puede tener faltantes/sobrantes por error humano o robo.

---

## 🔄 **Flujo Operativo**

### **1. Apertura de Turno**

```
Cajero: "Declaro que hay S/ 200.00 en efectivo en la caja"
Sistema: Registra monto_apertura_efectivo = 200.00
Estado: ABIERTA
```

### **2. Durante el Turno**

**Cada pago se registra con su método:**

```sql
-- Pago en efectivo
INSERT INTO pagos (metodo_pago, monto) VALUES ('EFECTIVO', 50.00);

-- Pago con tarjeta  
INSERT INTO pagos (metodo_pago, monto) VALUES ('TARJETA', 100.00);

-- Pago con Yape
INSERT INTO pagos (metodo_pago, monto) VALUES ('YAPE', 75.00);
```

**Sistema acumula en tiempo real:**
- `total_efectivo` += 50.00
- `total_tarjeta` += 100.00
- `total_yape` += 75.00

### **3. Cierre de Turno**

**PASO 1: Sistema calcula teórico**
```
monto_cierre_teorico_efectivo = 
  monto_apertura_efectivo (200) +
  total_efectivo (500) -
  total_egresos (50)
  = S/ 650.00
```

**PASO 2: Cajero cuenta físicamente**
```
Cajero: "Conté y tengo S/ 645.00 en billetes"
Sistema: monto_cierre_real_efectivo = 645.00
```

**PASO 3: Sistema calcula descuadre**
```
descuadre_efectivo = 
  monto_cierre_real_efectivo (645) -
  monto_cierre_teorico_efectivo (650)
  = -S/ 5.00 (faltante)
```

**PASO 4: Validación**
```
Si |descuadre| < S/ 10.00:
  ✅ Permite cierre automático
  
Si |descuadre| ≥ S/ 10.00:
  ⚠️ Requiere autorización de supervisor
```

---

## 📊 **Estructura de Base de Datos**

### **Tabla `caja_turnos` (Actualizada)**

```sql
-- EFECTIVO (lo único que se cuadra)
monto_apertura_efectivo        -- S/ 200.00
total_efectivo                 -- S/ 500.00 cobrado en efectivo
monto_cierre_teorico_efectivo  -- S/ 650.00 (lo que debería haber)
monto_cierre_real_efectivo     -- S/ 645.00 (lo que realmente hay)
descuadre_efectivo             -- -S/ 5.00 (faltante)

-- DIGITALES (solo registro, NO se cuentan)
total_tarjeta                  -- S/ 300.00 (verificar con vouchers)
total_transferencia            -- S/ 0.00
total_yape                     -- S/ 150.00 (verificar con capturas)
total_digital                  -- S/ 450.00 (suma de todos)

-- TOTALES
total_vendido                  -- S/ 950.00 (efectivo + digital)

-- METADATA
requiere_autorizacion          -- true/false
autorizado_por                 -- uuid del supervisor
observaciones_cierre           -- "Faltante por cambio incorrecto"
```

---

## 🔍 **Auditoría y Conciliación**

### **Diaria (Efectivo)**
```
✅ Cuadre de caja al cerrar turno
✅ Descuadres < S/ 10.00 = Normal
⚠️ Descuadres ≥ S/ 10.00 = Alerta
```

### **Semanal (Digitales)**

**Tarjetas:**
```sql
SELECT SUM(total_tarjeta) FROM caja_turnos 
WHERE fecha_cierre BETWEEN '2026-01-06' AND '2026-01-12';
```
→ Comparar con estado de cuenta del POS

**Transferencias:**
→ Comparar con extracto bancario

**Yape/Plin:**
→ Comparar con historial de la app

---

## ⚠️ **Prevención de Fraude**

### **Fraudes Comunes con EFECTIVO**

| Tipo | Cómo Ocurre | Mitigación |
|------|-------------|------------|
| **Robo directo** | Cajero saca billetes | Cuadre diario obligatorio |
| **Venta no registrada** | No emite comprobante, se queda con el dinero | Auditoría de correlativo de comprobantes |
| **Cambio incorrecto** | Da cambio de más intencionalmente | Cámaras en caja + límite de descuadre |

### **Fraudes Comunes con DIGITALES**

| Tipo | Cómo Ocurre | Mitigación |
|------|-------------|------------|
| **Registrar método incorrecto** | Cliente paga con tarjeta, registra "efectivo" | Auditar que existan vouchers para pagos con tarjeta |
| **Reembolso falso** | Crear reembolso y enviarlo a cuenta propia | Requiere autorización + trazabilidad |
| **Cancelar después de cobrar** | Anula comprobante pero ya recibió el pago | Anulaciones requieren motivo + autorización |

---

## 🛠️ **Funciones PostgreSQL**

### **`calcular_totales_turno(turno_id)`**
Calcula totales desglosados por método de pago

```sql
SELECT * FROM calcular_totales_turno('uuid-del-turno');

-- Retorna:
total_efectivo          S/ 500.00
total_tarjeta          S/ 300.00
total_transferencia    S/ 0.00
total_yape             S/ 150.00
total_egresos          S/ 50.00
monto_cierre_teorico   S/ 650.00
```

### **`validar_cierre_caja(turno_id, monto_real)`**
Valida si el cierre es correcto y si requiere autorización

```sql
SELECT * FROM validar_cierre_caja('uuid-del-turno', 645.00);

-- Retorna:
puede_cerrar           true
descuadre             -5.00
requiere_autorizacion false
mensaje               "Faltante de S/ 5.00 (dentro del margen)"
```

---

## 📱 **Interfaz de Usuario (A Implementar)**

### **Widget: Caja Activa**
Muestra en tiempo real:
- ✅ Efectivo teórico actual
- ✅ Total vendido (efectivo + digital)
- ✅ Desglose por método de pago
- ✅ Duración del turno

### **Modal: Cerrar Caja**

**PASO 1:** Cuenta el efectivo
```
┌─────────────────────────────┐
│ Cerrar Turno                │
├─────────────────────────────┤
│ Efectivo teórico: S/ 650.00 │
│                             │
│ ¿Cuánto efectivo contaste?  │
│ [    S/ 645.00    ]         │
│                             │
│ Descuadre: -S/ 5.00         │
│ ✅ Dentro del margen        │
│                             │
│ [Cerrar Turno]              │
└─────────────────────────────┘
```

**PASO 2:** Si descuadre > S/ 10.00
```
┌─────────────────────────────┐
│ ⚠️ Requiere Autorización    │
├─────────────────────────────┤
│ Descuadre: -S/ 15.00        │
│                             │
│ Observaciones:              │
│ [___________________]       │
│                             │
│ Solicitar autorización a:   │
│ [Supervisor ▼]              │
│                             │
│ [Solicitar Autorización]    │
└─────────────────────────────┘
```

---

## 📈 **Reportes**

### **Reporte de Turno**
```
TURNO #001 - Juan Pérez
Apertura: 12/01/2026 08:00
Cierre: 12/01/2026 16:00

EFECTIVO (SE CUADRA)
  Apertura:     S/  200.00
  Cobrado:      S/  500.00
  Egresos:      S/   50.00
  Teórico:      S/  650.00
  Real:         S/  645.00
  Descuadre:    S/   -5.00  ⚠️

DIGITALES (SOLO REGISTRO)
  Tarjeta:      S/  300.00
  Yape:         S/  150.00
  Transf:       S/    0.00
  
TOTAL VENDIDO:  S/  950.00
```

### **Reporte de Conciliación Bancaria**
```
SEMANA 06-12 ENE 2026

TARJETAS
  Sistema:     S/ 2,100.00
  Banco:       S/ 2,100.00
  ✅ Coincide

TRANSFERENCIAS  
  Sistema:     S/   800.00
  Banco:       S/   800.00
  ✅ Coincide

YAPE/PLIN
  Sistema:     S/ 1,200.00
  App:         S/ 1,200.00
  ✅ Coincide
```

---

## ✅ **Checklist de Implementación**

- [x] Crear migración de base de datos
- [x] Funciones PostgreSQL para cálculos
- [x] Vista `vw_resumen_turnos`
- [ ] Actualizar UI de apertura de caja
- [ ] Actualizar UI de cierre de caja  
- [ ] Modal de autorización para descuadres
- [ ] Reporte de turno con desglose
- [ ] Reporte de conciliación bancaria
- [ ] Tests de funciones PostgreSQL

---

## 🎓 **Capacitación del Personal**

### **Para Cajeros:**
1. Al abrir: Contar y declarar efectivo inicial
2. Durante: Registrar TODOS los pagos con método correcto
3. Al cerrar: Contar solo efectivo, sistema calcula el resto
4. Si descuadre > S/ 10: Anotar observaciones y pedir autorización

### **Para Supervisores:**
1. Revisar descuadres diarios
2. Autorizar cierres con descuadre > S/ 10
3. Conciliar digitales semanalmente
4. Investigar descuadres recurrentes

### **Para Administración:**
1. Auditar correlativo de comprobantes vs pagos
2. Conciliar extractos bancarios
3. Revisar descuadres acumulados por cajero
4. Implementar cámaras en zona de caja

---

## 📂 **Archivos Relacionados**

- **Migración:** `supabase/migrations/20260112200000_ajustar_gestion_caja.sql`
- **Actions:** `lib/actions/cajas.ts` (a actualizar)
- **Componentes:** `components/cajas/` (a actualizar)
- **Documentación anterior:** `docs/modulo-cajas.md`

---

## 📞 **Soporte**

**¿Dudas sobre descuadres?**
→ Ver sección "Prevención de Fraude"

**¿Cómo conciliar pagos digitales?**
→ Ver sección "Auditoría y Conciliación"

**¿Necesitas más detalle técnico?**
→ Ver migración `20260112200000_ajustar_gestion_caja.sql`
