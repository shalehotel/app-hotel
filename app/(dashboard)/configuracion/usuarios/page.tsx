import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { UsuariosClient } from './usuarios-client'
import { getUsuarios } from '@/lib/actions/usuarios'
import { Skeleton } from '@/components/ui/skeleton'
import { redirect } from 'next/navigation'
import { getUsuarioActual } from '@/lib/actions/usuarios'

export default async function UsuariosPage() {
  // Verificar que sea admin
  const usuarioActual = await getUsuarioActual()
  
  if (!usuarioActual || usuarioActual.rol !== 'ADMIN') {
    redirect('/')
  }

  const usuarios = await getUsuarios()

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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-[600px]" />}>
          <UsuariosClient usuarios={usuarios} />
        </Suspense>
      </div>
    </>
  )
}
