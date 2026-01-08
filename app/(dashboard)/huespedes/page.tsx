import { Suspense } from 'react'
import { getDirectorioHuespedes, getEstadisticasDirectorio } from '@/lib/actions/huespedes'
import { DirectorioHuespedesClient } from './directorio-huespedes-client'
import { DashboardHeader } from '@/components/dashboard-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Users, Star, AlertCircle, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'Directorio de Huéspedes',
  description: 'Historial y gestión de clientes'
}

async function EstadisticasDirectorio() {
  const stats = await getEstadisticasDirectorio()

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Total Huéspedes</p>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_huespedes}</div>
        <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Clientes VIP</p>
          <Star className="h-4 w-4 text-yellow-500" />
        </div>
        <div className="text-2xl font-bold">{stats.clientes_vip}</div>
        <p className="text-xs text-muted-foreground">Marcados como frecuentes</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Con Alertas</p>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </div>
        <div className="text-2xl font-bold">{stats.con_alertas}</div>
        <p className="text-xs text-muted-foreground">Con notas internas</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Promedio Visitas</p>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold">{stats.promedio_visitas}</div>
        <p className="text-xs text-muted-foreground">Por huésped</p>
      </div>
    </div>
  )
}

export default async function DirectorioHuespedesPage() {
  const huespedes = await getDirectorioHuespedes()

  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Directorio de Huéspedes' }
        ]}
      />
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Directorio de Huéspedes</h2>
          <p className="text-sm text-muted-foreground">
            Historial completo de clientes y estadísticas
          </p>
        </div>

        <Suspense fallback={<SkeletonStats />}>
          <EstadisticasDirectorio />
        </Suspense>

        <DirectorioHuespedesClient huespedes={huespedes} />
      </div>
    </>
  )
}

function SkeletonStats() {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
