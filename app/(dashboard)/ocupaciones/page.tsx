import { Suspense } from 'react'
import { OcupacionesTable } from './ocupaciones-table'
import { DashboardHeader } from '@/components/dashboard-header'
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
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Reservas Pendientes</p>
          <Hotel className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_reservas}</div>
        <p className="text-xs text-muted-foreground">Sin check-in</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Check-ins Activos</p>
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_checkins}</div>
        <p className="text-xs text-muted-foreground">Huéspedes en hotel</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Check-outs</p>
          <DoorClosed className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_checkouts}</div>
        <p className="text-xs text-muted-foreground">Salidas completadas</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Pendiente de Cobro</p>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="text-2xl font-bold text-destructive">
          S/ {stats.monto_total_deuda.toFixed(2)}
        </div>
        <p className="text-xs text-muted-foreground">
          {stats.total_con_deuda} reservas con deuda
        </p>
      </div>
    </div>
  )
}

function EstadisticasSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-[100px] mb-2" />
          <Skeleton className="h-8 w-[60px] mb-2" />
          <Skeleton className="h-3 w-[120px]" />
        </div>
      ))}
    </div>
  )
}

export default function OcupacionesPage() {
  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ocupaciones Actuales' }
        ]}
      />
      
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Ocupaciones Actuales</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las reservas activas, check-ins, check-outs y pagos pendientes
          </p>
        </div>

        <Suspense fallback={<EstadisticasSkeleton />}>
          <EstadisticasOcupaciones />
        </Suspense>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todas las Ocupaciones</h3>
            <p className="text-sm text-muted-foreground">
              Lista completa de reservas, check-ins y check-outs recientes
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <OcupacionesTable />
          </Suspense>
        </div>
      </div>
    </>
  )
}
