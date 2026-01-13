# GUÍA DE INTEGRACIÓN NUBEFACT
## Sistema PMS Hotel

**Fecha:** 2026-01-12  
**Estado:** ✅ Listo para implementar

---

## 📋 PASOS DE IMPLEMENTACIÓN

### **1. Configurar Variables de Entorno** (5 minutos)

```bash
# Copiar template
cp .env.example .env.local

# Editar .env.local y agregar:
NUBEFACT_TOKEN=tu-token-de-nubefact-aqui
NUBEFACT_RUC=20123456789
NUBEFACT_MODE=demo  # Cambiar a "production" en producción
```

**Obtener token:**
1. Ir a https://nubefact.com/
2. Crear cuenta o iniciar sesión
3. Ir a Configuración → API
4. Copiar el token de API

---

### **2. Aplicar Migration** (2 minutos)

```bash
npx supabase db push
```

Esto agrega:
- ✅ Campos `unidad_medida` y `codigo_producto` en `comprobante_detalles`
- ✅ Renombra `proveedor_sunat_config` → `proveedor_metadata`
- ✅ Constraints de validación (RUC, ubigeo, IGV)
- ✅ Índices para performance

---

### **3. Configurar Hotel** (2 minutos)

1. Ir a `/configuracion`
2. Editar configuración general
3. Ingresar:
   - ✅ RUC real (11 dígitos)
   - ✅ Razón social
   - ✅ Dirección fiscal
   - ✅ Ubigeo (opcional, 6 dígitos)
   - ✅ Tasa IGV (18.00)
4. Activar "Facturación Electrónica"

---

### **4. Probar con NubeFact Demo** (10 minutos)

#### Test 1: Emitir Boleta
```typescript
// En consola del navegador o desde código:
1. Ir a una reserva con saldo pendiente
2. Clic en "Registrar Pago"
3. Seleccionar "BOLETA"
4. Ingresar DNI y nombre
5. Completar el pago

// Verificar:
- Estado pasa de PENDIENTE → ACEPTADO
- hash_cpe tiene valor
- xml_url apunta a NubeFact
```

#### Test 2: Consultar en NubeFact
```bash
1. Ir a https://demo.nubefact.com/
2. Login con tu cuenta demo
3. Ir a "Comprobantes"
4. Buscar el comprobante emitido
5. Verificar que aparece
```

---

### **5. Pasar a Producción** (5 minutos)

```bash
# .env.local (PRODUCCIÓN)
NUBEFACT_TOKEN=tu-token-produccion-aqui
NUBEFACT_MODE=production  # ← IMPORTANTE
```

**ANTES de pasar a producción:**
- ✅ Probar al menos 10 comprobantes en demo
- ✅ Verificar que todos son aceptados
- ✅ Configurar RUC y razón social reales
- ✅ Tener cuenta NubeFact de pago activa

---

## 🔍 VERIFICACIONES

### **Checklist Pre-Producción:**

#### Configuración:
- [ ] Variable `NUBEFACT_TOKEN` configurada
- [ ] Variable `NUBEFACT_MODE` en "production"
- [ ] RUC real del hotel configurado
- [ ] Razón social correcta
- [ ] Series de boletas y facturas creadas

#### Testing:
- [ ] Emitir 5 boletas en demo
- [ ] Emitir 2 facturas en demo
- [ ] Verificar PDFs se descargan
- [ ] Verificar estados en NubeFact
- [ ] Probar con cliente RUC (factura)
- [ ] Probar con cliente DNI (boleta)

#### Base de Datos:
- [ ] Migration aplicada correctamente
- [ ] Campos `unidad_medida` y `codigo_producto` existen
- [ ] Constraints de validación funcionan
- [ ] Índices creados

---

## 🚨 ERRORES COMUNES

### **Error: "Token de NubeFact no configurado"**

**Causa:** Variable `NUBEFACT_TOKEN` no está en `.env.local`

**Solución:**
```bash
# Verificar que existe
cat .env.local | grep NUBEFACT_TOKEN

# Si no existe, agregar:
echo "NUBEFACT_TOKEN=tu-token-aqui" >> .env.local

# Reiniciar servidor
npm run dev
```

---

### **Error: "RUC no configurado"**

**Causa:** RUC en configuración es el valor por defecto (20000000001)

**Solución:**
1. Ir a `/configuracion`
2. Editar configuración
3. Cambiar RUC por el real
4. Guardar

---

### **Error: "Serie no autorizada"**

**Causa:** Serie en base de datos no coincide con serie en NubeFact

**Solución:**
1. Ir a NubeFact → Series
2. Ver las series autorizadas (ej: B001, F001)
3. Ir a `/configuracion/series` en tu sistema
4. Asegurarte que coinciden

---

### **Error: "Comprobante queda en PENDIENTE"**

**Causa:** Error de conexión o validación con NubeFact

**Solución:**
1. Ver logs en terminal del servidor
2. Buscar línea: `[ERROR] Error al enviar a NubeFact`
3. Leer el mensaje de error
4. Corregir según el error (RUC, serie, montos, etc.)
5. Reenviar el comprobante

---

## 📊 MONITOREO

### **Dashboard de Estado:**

Ver comprobantes pendientes:
```sql
SELECT 
  tipo_comprobante,
  serie,
  numero,
  estado_sunat,
  fecha_emision
FROM comprobantes
WHERE estado_sunat = 'PENDIENTE'
ORDER BY fecha_emision DESC;
```

### **Logs a Revisar:**

```bash
# Buscar en terminal:
grep "NubeFact" logs.txt

# Buscar errores:
grep "ERROR.*NubeFact" logs.txt

# Buscar éxitos:
grep "Comprobante aceptado por SUNAT" logs.txt
```

---

## 🎯 PRÓXIMOS PASOS (Opcional)

### **Mejoras Futuras:**

1. **Reintentos Automáticos**
   - Job que reenvíe comprobantes PENDIENTES cada 5 minutos
   - Hasta 3 reintentos, luego marcar como ERROR

2. **Notas de Crédito Completas**
   - Implementar generación de NC con referencia a comprobante original
   - Enviar a NubeFact con `tipo_nota_credito`

3. **Reportes Fiscales**
   - Libro de Ventas (exportar a Excel)
   - Reporte PLE 14.1
   - Dashboard de comprobantes por mes

4. **Notificaciones**
   - Email al cliente con PDF del comprobante
   - Alerta si comprobante es rechazado
   - Reporte diario de facturación

---

## 📞 SOPORTE

### **Recursos:**

- **Documentación NubeFact:** https://nubefact.com/api
- **Soporte NubeFact:** soporte@nubefact.com
- **Demo NubeFact:** https://demo.nubefact.com/

### **Logs del Sistema:**

Los logs se guardan automáticamente con:
- Nivel INFO: Operaciones exitosas
- Nivel WARN: Advertencias (comprobante rechazado)
- Nivel ERROR: Errores críticos (no se pudo conectar)

---

**¡Listo!** Con esto tu sistema está 100% funcional para facturación electrónica con NubeFact.
