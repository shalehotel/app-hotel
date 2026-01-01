# 🔐 Configurar Supabase CLI - Método Access Token

## ❌ Problema: Login interactivo falla

El comando `npx supabase login` puede fallar en algunos sistemas. 

## ✅ Solución: Usar Access Token (Método Recomendado)

### Paso 1: Obtener tu Access Token

1. Ve a: https://app.supabase.com/account/tokens
2. Click en "Generate new token"
3. Nombre: `Local Development` (o el que prefieras)
4. Click "Generate token"
5. **COPIA el token inmediatamente** (solo se muestra una vez)

### Paso 2: Configurar el Token

Tienes 2 opciones:

#### Opción A: Variable de entorno (Temporal - Por sesión)

En PowerShell:
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu-token-aqui"
```

En CMD:
```cmd
set SUPABASE_ACCESS_TOKEN=tu-token-aqui
```

#### Opción B: Archivo .env (Recomendado - Permanente)

Agrega a tu `.env.local`:
```env
SUPABASE_ACCESS_TOKEN=tu-token-aqui
```

**IMPORTANTE:** Asegúrate de que `.env.local` esté en `.gitignore` ✅

### Paso 3: Verificar que funciona

```bash
npx supabase projects list
```

Deberías ver tu proyecto `thfurwbvjmtnleaqduzi` en la lista.

### Paso 4: Vincular tu proyecto

```bash
npx supabase link --project-ref thfurwbvjmtnleaqduzi
```

Te pedirá tu **Database Password**. Si no la recuerdas:
1. https://app.supabase.com/project/thfurwbvjmtnleaqduzi/settings/database
2. Scroll hasta "Database Password"
3. Click "Reset Database Password"
4. Copia la nueva contraseña

### Paso 5: Iniciar Stack Local

```bash
npm run supabase:start
```

## 🎯 Comandos Completos

```bash
# 1. Obtén tu token en: https://app.supabase.com/account/tokens

# 2. Configúralo (PowerShell)
$env:SUPABASE_ACCESS_TOKEN="sbp_tu_token_aqui"

# 3. Verifica
npx supabase projects list

# 4. Vincula proyecto
npx supabase link --project-ref thfurwbvjmtnleaqduzi
# Cuando pida password, usa tu database password

# 5. ¡Inicia!
npm run supabase:start

# 6. Abre Dashboard
# http://localhost:54323
```

## 🔒 Seguridad

- ✅ El access token es personal, no lo compartas
- ✅ Guárdalo en `.env.local` (que está en `.gitignore`)
- ✅ Nunca lo commiteees a Git
- ✅ Puedes revocar tokens viejos en: https://app.supabase.com/account/tokens

## 🆘 Troubleshooting

### "Database password incorrect"
Resetea tu password en:
https://app.supabase.com/project/thfurwbvjmtnleaqduzi/settings/database

### "Project not found"
Verifica que el project-ref sea correcto:
```
thfurwbvjmtnleaqduzi
```

### "Docker not running"
Inicia Docker Desktop primero.

---

## 📝 Resumen Visual

```
┌─────────────────────────────────────┐
│ 1. Get token from Supabase web      │
│    app.supabase.com/account/tokens  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Add to .env.local                │
│    SUPABASE_ACCESS_TOKEN=...        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Link project                     │
│    npx supabase link --project-ref  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Start Docker                     │
│    npm run supabase:start           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Open Dashboard                   │
│    http://localhost:54323           │
└─────────────────────────────────────┘
```

Este método es **más estable** que el login interactivo. 🚀
