import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Skeleton } from '@/components/ui/skeleton'
import { TurnosAdminClient } from './turnos-admin-client'

export default function TurnosAdminPage() {
  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Turnos Admin' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administración de Turnos</h1>
          <p className="text-muted-foreground">
            Gestiona y cierra turnos huérfanos o problemáticos (Solo ADMIN)
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-[400px]" />}>
          <TurnosAdminClient />
        </Suspense>
      </div>
    </>
  )
}
