import { Suspense } from 'react'
import { SeriesClient } from './series-client'
import { Skeleton } from '@/components/ui/skeleton'

export default function SeriesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Series de Comprobantes</h2>
          <p className="text-muted-foreground">
            Gestiona las series de numeración para Boletas, Facturas y otros comprobantes.
          </p>
        </div>
      </div>
      
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <SeriesClient />
      </Suspense>
    </div>
  )
}
