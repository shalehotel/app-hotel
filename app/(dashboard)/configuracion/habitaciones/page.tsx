import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HabitacionesTab } from './habitaciones-tab'
import { TiposTab } from './tipos-tab'
import { CategoriasTab } from './categorias-tab'
import { 
  getHabitaciones, 
  getTiposHabitacion, 
  getCategoriasHabitacion 
} from '@/lib/actions/configuracion-habitaciones'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ConfiguracionHabitacionesPage() {
  const [habitaciones, tipos, categorias] = await Promise.all([
    getHabitaciones(),
    getTiposHabitacion(),
    getCategoriasHabitacion()
  ])

  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Habitaciones' }
        ]} 
      />
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Habitaciones</h1>
          <p className="text-muted-foreground">
            Gestiona habitaciones, tipos y categorías del hotel
          </p>
        </div>

        <Tabs defaultValue="habitaciones" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="habitaciones">Habitaciones</TabsTrigger>
            <TabsTrigger value="tipos">Tipos</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="habitaciones" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px]" />}>
              <HabitacionesTab 
                habitaciones={habitaciones} 
                tipos={tipos}
                categorias={categorias}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="tipos" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px]" />}>
              <TiposTab tipos={tipos} />
            </Suspense>
          </TabsContent>

          <TabsContent value="categorias" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px]" />}>
              <CategoriasTab categorias={categorias} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
