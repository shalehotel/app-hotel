# 📋 ESTRUCTURA DE MIGRACIONES - UNIFICADA Y CONSOLIDADA

## ✅ Estado Actual: SINCRONIZADO

Todas las migraciones están aplicadas tanto en **local** como en **remoto**.

---

## 📂 Archivos de Migración

### 1️⃣ **`20260101022650_initial_schema.sql`** ⭐ **ARCHIVO PRINCIPAL**
**Tamaño:** ~600 líneas  
**Estado:** Completo y consolidado  
**Contiene TODO el esquema del sistema:**

- ✅ MÓDULO 1: Extensiones (uuid-ossp)
- ✅ MÓDULO 2: ENUMs (roles, estados, tipos)
- ✅ MÓDULO 3: Usuarios y seguridad
- ✅ MÓDULO 4: Infraestructura financiera
  - Configuración del hotel
  - **Cajas** con estado
  - **Series de comprobantes** con función atómica `obtener_siguiente_correlativo()`
  - **Turnos de caja MULTIMONEDA** (PEN/USD)
  - **Movimientos de caja** (ingresos/egresos) ✨ NUEVO
- ✅ MÓDULO 5: Catálogos (tipos, categorías, canales, tarifas)
- ✅ MÓDULO 6: Habitaciones (3 estados)
- ✅ MÓDULO 7: Huéspedes
- ✅ MÓDULO 8: Reservas (operación central)
- ✅ MÓDULO 9: Facturación y pagos
- ✅ MÓDULO 10: Triggers (updated_at automático)
- ✅ MÓDULO 11: Seguridad RLS
  - Habilitado en: reservas, comprobantes, pagos, habitaciones, caja_movimientos
  - Políticas específicas para movimientos de caja
- ✅ MÓDULO 12: Permisos y Grants ✨ NUEVO
  - GRANT SELECT, INSERT, UPDATE, DELETE en todas las tablas
  - GRANT EXECUTE en todas las funciones
  - DISABLE RLS en tablas operacionales internas
  - ENABLE RLS solo donde es necesario

---

### 2️⃣ **`20260104000001_fix_usuarios_rls.sql`** 📝 Marcador
**Estado:** Aplicado en remoto, consolidado en schema inicial  
**Contenido actual:** Comentario de referencia (sin SQL activo)  
**Propósito:** Mantener historial sincronizado

### 3️⃣ **`20260104000002_fix_all_permissions.sql`** 📝 Marcador
**Estado:** Aplicado en remoto, consolidado en schema inicial  
**Contenido actual:** Comentario de referencia (sin SQL activo)  
**Propósito:** Mantener historial sincronizado

### 4️⃣ **`20260106000000_add_movimientos_and_multimoneda.sql`** 📝 Marcador
**Estado:** Aplicado en remoto, consolidado en schema inicial  
**Contenido actual:** Comentario de referencia (sin SQL activo)  
**Propósito:** Mantener historial sincronizado

---

## 🎯 Resultado Final

### ✅ **Ventajas de la Consolidación:**

1. **Un solo archivo maestro** - Fácil de entender y mantener
2. **No hay duplicación** - Cada tabla/función definida UNA vez
3. **Sincronización perfecta** - Local = Remoto
4. **Histórico preservado** - Los 4 archivos existen para tracking
5. **Esquema completo** - Todo en un solo lugar

### 📊 **Estado de la Base de Datos:**

```
✅ 31 tablas creadas
✅ 7 ENUMs definidos
✅ 5 funciones SQL
✅ 1 vista (vw_habitaciones_disponibles)
✅ 6 triggers
✅ Políticas RLS configuradas
✅ Permisos GRANT asignados
✅ Índices optimizados
```

---

## 🚀 Próximos Pasos

### Para desarrollos futuros:
Crear **nuevas migraciones** con timestamps posteriores:
```bash
# Ejemplo:
supabase migration new nombre_descriptivo
```

### Para replicar en otra BD:
Solo necesitas aplicar **`20260101022650_initial_schema.sql`** y luego los 3 marcadores vacíos.

---

## ⚠️ IMPORTANTE

**NO modifiques** `20260101022650_initial_schema.sql` directamente.  
Si necesitas cambios, crea una **nueva migración** con `supabase migration new`.

Los archivos 2, 3 y 4 son **marcadores históricos** - no los elimines.
