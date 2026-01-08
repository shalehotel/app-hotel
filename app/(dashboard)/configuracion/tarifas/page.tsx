import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { getTarifas } from '@/lib/actions/tarifas'
import { getTiposHabitacion, getCategoriasHabitacion } from '@/lib/actions/configuracion-habitaciones'
import { TarifasClientNew } from './tarifas-client-new'
import { Skeleton } from '@/components/ui/skeleton'

export default async function TarifasPage() {
  const [tarifas, tipos, categorias] = await Promise.all([
    getTarifas(),
    getTiposHabitacion(),
    getCategoriasHabitacion()
  ])

  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Tarifas' }
        ]} 
      />
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarifas y Precios</h1>
          <p className="text-muted-foreground">
            Define precios base y mínimos por tipo y categoría de habitación
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-[400px]" />}>
          <TarifasClientNew 
            tarifas={tarifas}
            tipos={tipos}
            categorias={categorias}
          />
        </Suspense>
      </div>
    </>
  )
}
