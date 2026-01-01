# Next.js + Supabase + shadcn/ui

Proyecto moderno con Next.js 15, Supabase, shadcn/ui y Lucide React.

## 🚀 Stack Tecnológico

- **Next.js 15** - Framework de React con App Router y React Compiler
- **TypeScript** - Tipado estático
- **Supabase** - Backend as a Service (autenticación, base de datos, storage)
- **shadcn/ui** - Componentes UI accesibles y personalizables
- **Tailwind CSS v4** - Framework de CSS utility-first
- **Lucide React** - Iconos modernos
- **ESLint** - Linting de código

## 📦 Instalación

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-proyecto-supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu-clave-publishable
```

Para obtener estas credenciales:
1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Dirígete a Settings > API
3. Copia la URL del proyecto y la clave publishable (publishable default key)

## 🏃‍♂️ Desarrollo

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🏗️ Estructura del Proyecto

```
app-hotel/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes React
│   └── ui/                # Componentes de shadcn/ui
├── hooks/                 # Custom React Hooks
│   ├── use-user.ts       # Hook de autenticación
│   └── use-supabase-query.ts # Hook para queries
├── lib/                   # Utilidades y configuraciones
│   ├── supabase/         # Configuración de Supabase
│   └── utils.ts          # Funciones utilitarias
├── types/                # Definiciones de tipos TypeScript
│   └── database.types.ts # Tipos de la base de datos
├── docs/                 # Documentación
└── middleware.ts         # Middleware de Next.js para Supabase
```

## 📚 Componentes Instalados

El proyecto incluye componentes base de shadcn/ui:

- Button
- Card
- Input
- Label

Para agregar más componentes:

```bash
npx shadcn@latest add [component-name]
```

## 🔧 Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Ejecutar build de producción
npm run lint         # ESLint
npm run lint:fix     # Arreglar problemas de ESLint
npm run type-check   # Verificar tipos TypeScript
```

## 📖 Documentación Adicional

- Revisa `docs/development-guide.md` para guía completa de desarrollo
- Snippets de código disponibles en `.vscode/snippets.code-snippets`

## 🔗 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 Licencia

MIT
