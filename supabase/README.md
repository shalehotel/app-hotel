# ⚡ Quick Start - Supabase Local Development

## 📍 Estás aquí

✅ Supabase CLI inicializado  
✅ Estructura de carpetas creada  
⏳ Pendiente: Autenticación y primera migración  

## 🚀 Próximos Pasos

### 1. Configurar Supabase CLI

**Método Recomendado: Access Token**

1. Obtén tu token en: https://app.supabase.com/account/tokens
2. Click "Generate new token" → Copia el token
3. Agrégalo a tu `.env.local`:
```env
SUPABASE_ACCESS_TOKEN=tu-token-aqui
```

O en PowerShell (temporal):
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu-token-aqui"
```

**📖 Guía completa:** `docs/supabase-auth-token.md`

### 2. Vincular Proyecto

Una vez autenticado:

```bash
npx supabase link --project-ref thfurwbvjmtnleaqduzi
```

Te pedirá tu **Database Password**. Si no la recuerdas:
1. Ve a https://app.supabase.com
2. Settings → Database  
3. Reset Database Password

### 3. Iniciar Stack Local (¡Esto es lo importante!)

```bash
npx supabase start
```

**Primera vez:** Descargará imágenes Docker (2-5 min)  
**Siguientes veces:** Solo 10-30 segundos

Esto levanta:
- 🐘 PostgreSQL local
- 🔐 Auth local
- 📡 API local
- 🎨 **Dashboard local en http://localhost:54323**

### 4. Abrir Dashboard Local

```bash
# Después del comando anterior, verás:
Studio URL: http://127.0.0.1:54323

# Abre eso en tu navegador 🚀
```

Es como el Dashboard de Supabase web, pero 100% local.

### 5. Crear tu Primera Tabla

En el Dashboard local:
1. Ve a "Table Editor"
2. Crea tu primera tabla (ej: `users`, `rooms`, etc.)
3. Activa RLS si quieres

### 6. Capturar Cambios (CLAVE 🔑)

```bash
npx supabase db diff -f initial_schema
```

Esto genera:
```
supabase/migrations/20240101_initial_schema.sql
```

**¡Este archivo es tu esquema versionado!** 🎉

### 7. Generar Tipos TypeScript

```bash
npx supabase gen types typescript --local > types/database.types.ts
```

Ahora tu app tiene autocompletado de la BD.

### 8. Commitear a Git

```bash
git add supabase/migrations/ types/
git commit -m "feat: schema inicial"
```

## 🎯 Comandos Diarios

```bash
# Iniciar BD local
npx supabase start

# Ver Dashboard
open http://localhost:54323

# Después de cambios, capturar
npx supabase db diff -f nombre_cambio

# Generar tipos
npx supabase gen types typescript --local > types/database.types.ts

# Desplegar a producción
npx supabase db push

# Detener Docker
npx supabase stop
```

## 📖 Guía Completa

Lee `docs/supabase-workflow.md` para el flujo completo profesional.

## 🆘 Problemas Comunes

### "Docker no está corriendo"
Abre Docker Desktop primero.

### "Puerto ocupado"
Otro servicio usa el puerto. Edita `supabase/config.toml`.

### "No tengo Docker"
Descarga Docker Desktop: https://www.docker.com/products/docker-desktop

---

## ✨ Ventajas vs Consola Web

| Consola Web | CLI Local |
|-------------|-----------|
| Esquema oculto | **Archivos SQL visibles** |
| Sin versionado | **Todo en Git** |
| Necesitas internet | **Offline** |
| Riesgo en producción | **Pruebas locales seguras** |
| Sin tipos | **Tipos autogenerados** |

**¡Empecemos! 🚀**
