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
  Sparkles,
  Shield,
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
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
    roles: ['ADMIN'], // Solo ADMIN
  },
  {
    title: 'Rack',
    url: '/rack',
    icon: Bed,
    roles: ['ADMIN', 'RECEPCION'],
  },
  {
    title: 'Limpieza',
    url: '/limpieza',
    icon: Sparkles,
    roles: ['ADMIN', 'RECEPCION', 'HOUSEKEEPING'],
  },
  {
    title: 'Historial de Reservas',
    url: '/reservas',
    icon: Calendar,
    roles: ['ADMIN', 'RECEPCION'],
  },
  {
    title: 'Huéspedes',
    url: '/huespedes',
    icon: UserCircle,
    roles: ['ADMIN', 'RECEPCION'],
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
    roles: ['ADMIN', 'RECEPCION'],
  },
  {
    title: 'Gestión de Cajas',
    url: '/cajas',
    icon: Wallet,
    roles: ['ADMIN', 'RECEPCION'],
    items: [
      {
        title: 'Cajas y Turnos',
        url: '/cajas',
      },
      {
        title: 'Retiros Administrativos',
        url: '/cajas/retiros-administrativos',
        roles: ['ADMIN'], // Sub-item restringido
      },
    ],
  },
  {
    title: 'Configuración',
    url: '/configuracion',
    icon: Settings,
    roles: ['ADMIN'],
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
  {
    title: 'Auditoría',
    url: '/auditoria',
    icon: Shield,
    roles: ['ADMIN'],
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
    if (!user?.rol) return []

    return navItems
      .filter(item => {
        // Verificar si el rol del usuario está permitido para este item
        if (item.roles && !item.roles.includes(user.rol as any)) {
          return false
        }
        return true
      })
      .map(item => {
        // Si tiene subitems, filtrar también sus subitems
        if (item.items) {
          return {
            ...item,
            items: item.items.filter((subitem: any) => {
              // Si el subitem tiene roles definidos, verificar
              if (subitem.roles && !subitem.roles.includes(user.rol as any)) {
                return false
              }
              return true
            })
          }
        }
        return item
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
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
