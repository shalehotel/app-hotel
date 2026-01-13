'use client'

import * as React from 'react'
import {
  Hotel,
  LayoutDashboard,
  Bed,
  Calendar,
  Users,
  Receipt,
  Settings,
  ChevronRight,
  LogOut,
  Wallet,
  History,
  UserCircle,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { logout } from '@/lib/actions/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTurnoContext } from '@/components/providers/turno-provider'
import { WidgetTurnoSidebar } from '@/components/cajas/widget-turno-sidebar'

// Datos de navegación
const navItems = [
  {
    title: 'Inicio',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Rack',
    url: '/rack',
    icon: Bed,
  },

  {
    title: 'Historial de Reservas',
    url: '/reservas',
    icon: Calendar,
  },
  {
    title: 'Huéspedes',
    url: '/huespedes',
    icon: UserCircle,
    items: [
      {
        title: 'Directorio',
        url: '/huespedes',
      },
      {
        title: 'Libro de Registro',
        url: '/huespedes/registro-legal',
      },
    ],
  },
  {
    title: 'Facturación',
    url: '/facturacion',
    icon: Receipt,
  },
  {
    title: 'Gestión de Cajas',
    url: '/cajas',
    icon: Wallet,
  },
  {
    title: 'Configuración',
    url: '/configuracion',
    icon: Settings,
    items: [
      {
        title: 'General',
        url: '/configuracion',
      },
      {
        title: 'Habitaciones',
        url: '/configuracion/habitaciones',
      },
      {
        title: 'Usuarios',
        url: '/configuracion/usuarios',
      },
      {
        title: 'Tarifas',
        url: '/configuracion/tarifas',
      },
      {
        title: 'Cajas',
        url: '/configuracion/cajas',
      },
      {
        title: 'Series',
        url: '/configuracion/series',
      },
    ],
  },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    nombres: string
    apellidos?: string | null
    rol?: 'ADMIN' | 'RECEPCION' | 'HOUSEKEEPING'
  }
}) {
  const pathname = usePathname()
  const { loading, hasActiveTurno, turno, refetchTurno } = useTurnoContext()

  // Filtrar items según rol
  const filteredNavItems = React.useMemo(() => {
    // Si es ADMIN, mostrar todo
    if (user?.rol === 'ADMIN') {
      return navItems
    }

    // Si NO es admin, filtrar items sensibles (Configuración)
    return navItems.filter(item => {
      // Ocultar completamente el grupo Configuración
      if (item.title === 'Configuración') return false

      // Aquí se podrían agregar más reglas (ej: ocultar Gestión de Cajas para Housekeeping)

      return true
    })
  }, [user?.rol])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Hotel className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hotel App</span>
                  <span className="truncate text-xs">Sistema de gestión</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems} />

        {/* Widget de Turno Activo */}
        {!loading && hasActiveTurno && turno && (
          <div className="mt-auto pt-4">
            <WidgetTurnoSidebar turno={turno} onTurnoCerrado={refetchTurno} />
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
