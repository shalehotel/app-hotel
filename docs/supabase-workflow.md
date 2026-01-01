# 🏆 Flujo de Trabajo Gold Standard - Supabase CLI + Docker

## ¿Por qué este flujo?

✅ Tu esquema de BD está versionado en Git (archivos SQL)  
✅ Desarrollo local sin conexión a internet  
✅ Migraciones automáticas y ordenadas  
✅ Tipos TypeScript generados automáticamente  
✅ CI/CD profesional  
✅ Base de datos reproducible en cualquier máquina  

## 📋 Pre-requisitos

1. **Docker Desktop** instalado y corriendo
2. **Supabase CLI** (ya inicializado en el proyecto)

## 🚀 Configuración Inicial (Una vez)

### 1. Autenticación con Supabase

```bash
npx supabase login
```

Esto abrirá tu navegador para autenticarte. Una vez hecho, obtendrás un access token.

### 2. Vincular con tu Proyecto Remoto

```bash
npx supabase link --project-ref thfurwbvjmtnleaqduzi
```

Cuando te pida la contraseña de la BD, es tu **database password** (la que configuraste al crear el proyecto).

Si no la recuerdas, puedes resetearla en: Supabase Dashboard → Settings → Database → Database Password

### 3. Iniciar Stack Local

```bash
npx supabase start
```

Esto descargará las imágenes de Docker y levantará:
- ✅ PostgreSQL
- ✅ PostgREST (API)
- ✅ GoTrue (Auth)
- ✅ Realtime
- ✅ Storage
- ✅ Inbucket (Email local)
- ✅ Studio (Dashboard)

**Primera vez:** Tardará 2-5 minutos descargando imágenes.  
**Siguientes veces:** 10-30 segundos.

### 4. Acceder al Dashboard Local

Una vez iniciado, verás:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323 ⭐ ← Abre esto
anon key: [tu-key-local]
service_role key: [tu-key-local]
```

Abre **http://localhost:54323** en tu navegador. Es tu Supabase Dashboard local.

## 🔄 Ciclo de Desarrollo Diario

### A. Realizar Cambios en la BD

Tienes 3 opciones:

#### Opción 1: Dashboard Local (Visual)
1. Abre http://localhost:54323
2. Ve a "Table Editor" o "SQL Editor"
3. Crea/modifica tablas, RLS, funciones, etc.

#### Opción 2: SQL Directo
```bash
npx supabase db execute "CREATE TABLE rooms (...);"
```

#### Opción 3: Archivo SQL
Crea un archivo temporal:
```bash
npx supabase db execute -f ./temp_migration.sql
```

### B. Capturar Cambios (CLAVE 🔑)

Cuando estés feliz con tus cambios locales:

```bash
npx supabase db diff -f nombre_descriptivo
```

Ejemplos:
```bash
npx supabase db diff -f crear_tabla_users
npx supabase db diff -f agregar_rls_a_bookings
npx supabase db diff -f crear_funcion_disponibilidad
```

**¿Qué hace esto?**
- Compara tu BD local con la última migración
- Genera un archivo SQL en `supabase/migrations/[timestamp]_nombre_descriptivo.sql`
- Este archivo contiene SOLO los cambios incrementales

**Resultado:** Ahora tienes un archivo que puedes:
- ✅ Ver en VS Code
- ✅ Revisar con tu equipo
- ✅ Commitear a Git
- ✅ Aplicar en producción de forma ordenada

### C. Generar Tipos TypeScript

```bash
npx supabase gen types typescript --local > types/database.types.ts
```

Esto actualiza los tipos para que tu frontend tenga autocompletado inmediato.

### D. Probar Localmente

```bash
npm run dev
```

Tu app ahora usa la BD local (Docker). Las credenciales locales son:

```env
# Para desarrollo local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[la-key-que-te-dio-supabase-start]
```

**Tip:** Puedes tener dos archivos:
- `.env.local` → Producción
- `.env.local.development` → Local

### E. Commitear a Git

```bash
git add supabase/migrations/
git add types/database.types.ts
git commit -m "feat: agregar tabla de reservaciones"
git push
```

## 🚢 Desplegar a Producción

### Opción 1: Manual

```bash
npx supabase db push
```

Esto aplica todas las migraciones pendientes a tu proyecto remoto.

### Opción 2: CI/CD (Recomendado)

Crea un GitHub Action en `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Supabase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Link Supabase Project
        run: npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Push migrations
        run: npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Configura los secrets en GitHub:
- `SUPABASE_PROJECT_ID`: thfurwbvjmtnleaqduzi
- `SUPABASE_ACCESS_TOKEN`: Tu access token (obtén uno en Supabase → Settings → Access Tokens)

## 🛠️ Comandos Útiles

### Ver estado de migraciones
```bash
npx supabase db status
```

### Resetear BD local (¡destruye datos!)
```bash
npx supabase db reset
```

### Detener Docker
```bash
npx supabase stop
```

### Ver logs
```bash
npx supabase logs
```

### Ver credenciales locales
```bash
npx supabase status
```

### Hacer seed de datos
Crea `supabase/seed.sql` y ejecuta:
```bash
npx supabase db reset # Aplica seed automáticamente
```

### Hacer backup de producción
```bash
npx supabase db dump -f backup.sql
```

### Restaurar backup a local
```bash
npx supabase db reset
cat backup.sql | npx supabase db execute
```

## 📁 Estructura del Proyecto

```
app-hotel/
├── supabase/
│   ├── config.toml              # Configuración del proyecto
│   ├── migrations/              # 🔑 TUS MIGRACIONES (Git)
│   │   ├── 20240101120000_initial_schema.sql
│   │   ├── 20240102150000_add_rooms.sql
│   │   └── 20240103180000_add_rls.sql
│   ├── seed.sql                 # Datos de prueba
│   └── functions/               # Edge Functions
├── types/
│   └── database.types.ts        # 🔑 TIPOS GENERADOS (Git)
└── .env.local                   # Credenciales (NO Git)
```

## 🎯 Flujo Completo - Ejemplo Real

```bash
# 1. Iniciar Docker local
npx supabase start

# 2. Abrir Dashboard
# http://localhost:54323

# 3. Crear tabla "rooms" en el Dashboard o SQL Editor

# 4. Capturar cambios
npx supabase db diff -f crear_tabla_rooms

# 5. Ver el archivo generado
cat supabase/migrations/*_crear_tabla_rooms.sql

# 6. Generar tipos
npx supabase gen types typescript --local > types/database.types.ts

# 7. Commitear
git add supabase/migrations/ types/
git commit -m "feat: tabla rooms con RLS"

# 8. Desplegar
git push # El CI/CD lo hace automático
# O manual: npx supabase db push
```

## 🔒 Seguridad

- ✅ `.env.local` está en `.gitignore`
- ✅ Las migraciones no contienen secrets
- ✅ La BD local está aislada en Docker
- ✅ Los access tokens van en GitHub Secrets

## 🐛 Troubleshooting

### Docker no inicia
```bash
# Ver si Docker está corriendo
docker ps

# Reiniciar Supabase
npx supabase stop
npx supabase start
```

### Puerto ocupado
Edita `supabase/config.toml` y cambia los puertos.

### Migraciones fuera de sync
```bash
npx supabase db remote commit
```

Esto crea una migración a partir del estado remoto.

## 📚 Recursos

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Managing Environments](https://supabase.com/docs/guides/cli/managing-environments)

---

## ✨ Ventajas de Este Flujo

| Antes | Después |
|-------|---------|
| Esquema oculto en consola web | **Visible en archivos SQL** |
| Cambios no versionados | **Todo en Git** |
| Conflictos en equipo | **Migraciones ordenadas** |
| Tipos desactualizados | **Autogenerados** |
| Deploy manual arriesgado | **CI/CD automático** |
| Necesitas internet siempre | **Desarrollo offline** |

Este es el estándar de la industria. 🚀
