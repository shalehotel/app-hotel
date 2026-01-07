import { Suspense } from 'react'
import { OcupacionesTable } from './ocupaciones-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getEstadisticasOcupaciones } from '@/lib/actions/ocupaciones'
import { Hotel, DoorOpen, DoorClosed, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Ocupaciones Actuales | Hotel Management',
  description: 'Gestión de reservas y ocupaciones actuales'
}

async function EstadisticasOcupaciones() {
  const stats = await getEstadisticasOcupaciones()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reservas Pendientes</CardTitle>
          <Hotel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_reservas}</div>
          <p className="text-xs text-muted-foreground">
            Sin check-in
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-ins Activos</CardTitle>
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_checkins}</div>
          <p className="text-xs text-muted-foreground">
            Huéspedes en hotel
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
          <DoorClosed className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_checkouts}</div>
          <p className="text-xs text-muted-foreground">
            Salidas completadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendiente de Cobro</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            S/ {stats.monto_total_deuda.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.total_con_deuda} reservas con deuda
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EstadisticasSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[60px] mb-2" />
            <Skeleton className="h-3 w-[120px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function OcupacionesPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ocupaciones Actuales</h2>
          <p className="text-muted-foreground">
            Gestiona las reservas activas, check-ins, check-outs y pagos pendientes
          </p>
        </div>
      </div>

      <Suspense fallback={<EstadisticasSkeleton />}>
        <EstadisticasOcupaciones />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Ocupaciones</CardTitle>
          <CardDescription>
            Lista completa de reservas, check-ins y check-outs recientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <OcupacionesTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
