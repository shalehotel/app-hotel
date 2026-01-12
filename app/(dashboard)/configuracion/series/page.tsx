import { Suspense } from 'react'
import { SeriesClient } from './series-client'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardHeader } from '@/components/dashboard-header'

export default function SeriesPage() {
  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Series' }
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Series de Comprobantes</h2>
          <p className="text-muted-foreground">
            Gestiona las series de numeración para Boletas, Facturas y otros comprobantes.
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <SeriesClient />
        </Suspense>
      </div>
    </>
  )
}
