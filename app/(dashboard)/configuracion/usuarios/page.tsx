import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { UsuariosClient } from './usuarios-client'
import { getUsuarios, getUsuarioActual } from '@/lib/actions/usuarios' // Asegurar import correcto
import { Skeleton } from '@/components/ui/skeleton'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() { // Server Component raíz
  // Verificación rápida de sesión (auth cookie)
  const usuarioActual = await getUsuarioActual()

  if (!usuarioActual || usuarioActual.rol !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1 className="text-2xl font-bold text-red-600">Acceso Restringido</h1>
        <p className="text-muted-foreground">
          No tienes permisos para ver esta página.
        </p>
        <div className="text-sm bg-muted p-4 rounded-md font-mono">
          Rol actual: {usuarioActual?.rol || 'No detectado'} <br />
          ID: {usuarioActual?.id || 'No sesión'}
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Usuarios' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <UsuariosListWrapper />
        </Suspense>
      </div>
    </>
  )
}

// Componente async que hace el fetch pesado
async function UsuariosListWrapper() {
  const usuarios = await getUsuarios()
  return <UsuariosClient usuarios={usuarios} />
}
