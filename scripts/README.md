# 📖 Scripts de Supabase - Guía de Uso

## 🎯 Tu flujo de trabajo (Dashboard Web)

**NO usas Supabase CLI**, ejecutas SQL directamente en el Dashboard Web de Supabase.

---

## 🚀 Primer Setup (BD limpia)

### Paso 1: Limpiar base de datos
```sql
-- Ejecutar en SQL Editor de Supabase Dashboard
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Paso 2: Ejecutar schema completo
1. Abre el archivo: [`EJECUTAR_EN_DASHBOARD.sql`](EJECUTAR_EN_DASHBOARD.sql)
2. Copia TODO el contenido
3. Pega en SQL Editor del Dashboard de Supabase
4. Click en **RUN**
5. Verás mensaje: ✅ SCHEMA COMPLETO CREADO CORRECTAMENTE

**Listo.** Ya tienes:
- 17 tablas
- 8 ENUMs
- 5 funciones
- 1 vista
- 6 triggers
- Permisos configurados
- RLS deshabilitado (para sistema interno)
- Usuario admin insertado

---

## 🔧 Otros Scripts Disponibles

### `clean-database.sql` 
**Cuándo usar:** Cuando quieras resetear TODO y empezar de cero.
```sql
-- ⚠️ CUIDADO: Borra TODO
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### ~~`fix-reserva-huespedes-permissions.sql`~~ (OBSOLETO)
**No usar:** Ya está incluido en `EJECUTAR_EN_DASHBOARD.sql`

### ~~`setup-permissions.sql`~~ (OBSOLETO)
**No usar:** Ya está incluido en `EJECUTAR_EN_DASHBOARD.sql`

---

## 📁 Archivos de Migración (Histórico)

Los archivos en `supabase/migrations/` son **solo para referencia**:
- `20260101022650_initial_schema.sql` → Schema original
- `20260104000001_fix_usuarios_rls.sql` → Marcador histórico (vacío)
- `20260104000002_fix_all_permissions.sql` → Marcador histórico (vacío)
- `20260106000000_add_movimientos_and_multimoneda.sql` → Marcador histórico (vacío)

**NO los ejecutes manualmente.** Todo está consolidado en `EJECUTAR_EN_DASHBOARD.sql`.

---

## ✅ Cómo verificar que todo funciona

Ejecuta esto en SQL Editor:

```sql
-- Ver todas las tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Ver estado de RLS (debe estar OFF en todas)
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar permisos de authenticated
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated' 
  AND table_schema = 'public' 
ORDER BY table_name;

-- Ver tu usuario admin
SELECT * FROM public.usuarios;
```

Deberías ver:
- ✅ 17 tablas en `public`
- ✅ RLS = `FALSE` en todas las tablas
- ✅ authenticated tiene privilegios en todas las tablas
- ✅ Tu usuario admin existe

---

## 🚨 Errores Comunes

### "permission denied for schema public"
**Solución:**
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
```

### "function uuid_generate_v4() does not exist"
**Solución:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### "new row violates row-level security"
**Solución:** Verificar que RLS está deshabilitado:
```sql
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

---

## 💡 Diferencia clave: CLI vs Dashboard

### ❌ NO haces esto (Supabase CLI):
```bash
npx supabase db push
npx supabase migration new mi_cambio
```

### ✅ TÚ haces esto (Dashboard Web):
1. Abres Supabase Dashboard
2. Vas a SQL Editor
3. Copias/pegas SQL de `EJECUTAR_EN_DASHBOARD.sql`
4. Click RUN

---

## 📝 Cuándo actualizar el schema

Si necesitas agregar columnas, tablas, o cambios:

1. **Modifica** `EJECUTAR_EN_DASHBOARD.sql`
2. **Ejecuta** la parte nueva en SQL Editor
3. **NO ejecutes todo de nuevo** (perderías datos)

Ejemplo - Agregar columna:
```sql
-- Solo ejecutar esto, no todo el archivo
ALTER TABLE public.habitaciones ADD COLUMN amenidades jsonb DEFAULT '[]'::jsonb;
```

---

## 🎯 Resumen Ejecutivo

| Archivo | Uso | Estado |
|---------|-----|--------|
| `EJECUTAR_EN_DASHBOARD.sql` | ✅ Usar siempre para setup inicial | ACTIVO |
| `clean-database.sql` | ⚠️ Solo para resetear TODO | ACTIVO |
| `fix-*.sql` | ❌ No usar | OBSOLETO |
| `setup-permissions.sql` | ❌ No usar | OBSOLETO |
| `supabase/migrations/*` | 📚 Solo referencia | HISTÓRICO |

---

**Última actualización:** 2025-01-06  
**Mantenido por:** GitHub Copilot
