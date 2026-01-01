# Guía de Desarrollo

## 🚀 Flujo de Trabajo

### Configuración Inicial

1. **Instalar dependencias** (ya hecho):
```bash
npm install
```

2. **Configurar variables de entorno**:
Crea `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu-clave-publishable
```

3. **Iniciar desarrollo**:
```bash
npm run dev
```

## 📁 Estructura

### App Router (`app/`)
- `layout.tsx` - Layout principal
- `page.tsx` - Páginas de tu aplicación

### Componentes (`components/`)
- `ui/` - Componentes de shadcn/ui

### Hooks Personalizados (`hooks/`)
- `use-user.ts` - Autenticación de usuario
- `use-supabase-query.ts` - Queries con realtime

### Supabase (`lib/supabase/`)
- `client.ts` - Para Client Components
- `server.ts` - Para Server Components  
- `middleware.ts` - Para middleware de Next.js

## 🔧 Uso de Supabase

### En Server Components:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('tabla').select('*')
  // ...
}
```

### En Client Components:
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function Component() {
  const supabase = createClient()
  // ...
}
```

### Usando Hooks:
```typescript
'use client'

import { useUser } from '@/hooks/use-user'
import { useSupabaseQuery } from '@/hooks/use-supabase-query'

export default function Component() {
  const { user, loading } = useUser()
  
  const { data, loading, error } = useSupabaseQuery({
    table: 'tu_tabla',
    select: '*',
    realtime: true,
  })
  // ...
}
```

## 🎨 shadcn/ui

### Agregar componentes:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add table
```

### Uso:
```typescript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

<Button>Click me</Button>
```

## 📝 Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build
npm run lint         # Linting
npm run type-check   # Verificar tipos
```

## 📚 Snippets

VS Code snippets disponibles en `.vscode/snippets.code-snippets`

Usa prefijos como:
- `npage` - Nueva página
- `nclient` - Client component
- `nserver` - Server component
- `sbquery` - Supabase query
- `useuser` - Hook de usuario

## 🔗 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
