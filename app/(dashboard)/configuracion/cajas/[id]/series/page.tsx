import { Suspense } from 'react'
import { SeriesClient } from './series-client'
import { Skeleton } from '@/components/ui/skeleton'
import { getCajaById } from '@/lib/actions/cajas'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SeriesPage({ params }: Props) {
  const { id } = await params
  const result = await getCajaById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const caja = result.data

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/configuracion/cajas">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Series de Comprobantes</h2>
          <p className="text-muted-foreground">Caja: {caja.nombre}</p>
        </div>
      </div>
      
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <SeriesClient cajaId={id} cajaNombre={caja.nombre} />
      </Suspense>
    </div>
  )
}
