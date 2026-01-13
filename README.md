# Sistema PMS Hotel - Next.js + Supabase

Sistema de gestión hotelera (PMS) moderno con Next.js 15, Supabase, shadcn/ui y arquitectura empresarial robusta.

## 🏆 Estado del Proyecto

✅ **ARQUITECTURA AUDITADA Y CORREGIDA** (Enero 2025)

Todos los issues críticos e importantes identificados en auditoría han sido corregidos:
- ✅ IGV dinámico desde configuración
- ✅ Validación fiscal antes de facturar
- ✅ Validación de series y correlativos
- ✅ Cálculo multimoneda bidireccional (PEN ↔ USD)
- ✅ Rollback automático en checkout
- ✅ Validación de transiciones de estado
- ✅ Función PostgreSQL atómica para facturación

Ver detalles en [RESUMEN_CORRECCIONES_IMPLEMENTADAS.md](RESUMEN_CORRECCIONES_IMPLEMENTADAS.md)

## 🚀 Stack Tecnológico

- **Next.js 15** - Framework de React con App Router y Server Actions
- **TypeScript 5.7** - Tipado estático estricto
- **Supabase** - Backend PostgreSQL con SSR y autenticación
- **shadcn/ui** - Componentes UI accesibles y personalizables
- **Tailwind CSS v4** - Framework de CSS utility-first
- **Lucide React** - Iconos modernos
- **Zod** - Validación de schemas
- **ESLint** - Linting de código

## 📚 Documentación Técnica

### Auditoría y Correcciones
- [AUDITORIA_COMPLETA_SISTEMA_PMS.md](AUDITORIA_COMPLETA_SISTEMA_PMS.md) - Auditoría arquitectónica completa
- [RESUMEN_CORRECCIONES_IMPLEMENTADAS.md](RESUMEN_CORRECCIONES_IMPLEMENTADAS.md) - Correcciones aplicadas

### Módulos
- [docs/modulo-cajas.md](docs/modulo-cajas.md) - Sistema de cajas y turnos
- [docs/modulo-facturacion.md](docs/modulo-facturacion.md) - Facturación SUNAT
- [docs/modulo-checkin.md](docs/modulo-checkin.md) - Check-in y huéspedes
- [docs/modulo-habitaciones.md](docs/modulo-habitaciones.md) - Gestión de habitaciones

## 📦 Instalación

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` basándote en el template:

```bash
cp .env.example .env.local
```

Configura las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-proyecto-supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu-clave-publishable

# NubeFact (Facturación Electrónica)
NUBEFACT_TOKEN=tu-token-nubefact
NUBEFACT_RUC=20123456789
NUBEFACT_MODE=demo  # "demo" o "production"
```

**Obtener credenciales:**

**Supabase:**
1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Dirígete a Settings > API
3. Copia la URL del proyecto y la clave publishable

**NubeFact:**
1. Crea cuenta en [NubeFact](https://nubefact.com)
2. Ve a Configuración → API
3. Copia tu token de API
4. Usa modo "demo" para pruebas, "production" para facturación real

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
