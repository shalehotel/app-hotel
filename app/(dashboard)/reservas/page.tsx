import { DashboardHeader } from '@/components/dashboard-header'
import { ReservasHistorialTable } from './reservas-historial-table'
import { getEstadisticasOcupaciones } from '@/lib/actions/ocupaciones'
import { CalendarDays, Wallet, UserCheck, AlertOctagon } from 'lucide-react'

export default async function ReservasPage() {
  const stats = await getEstadisticasOcupaciones()

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reservas' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground">
            Gestión financiera y operativa de reservas, check-ins y deudas pendientes.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Reservas Activas</p>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.total_reservas}</div>
            <p className="text-xs text-muted-foreground">
              Esperando llegada
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Huéspedes en Casa</p>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.total_checkins}</div>
            <p className="text-xs text-muted-foreground">
              Habitaciones ocupadas actualmente
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Reservas con Deuda</p>
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.total_con_deuda}</div>
            <p className="text-xs text-muted-foreground">
              Requieren cobro inmediato
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Monto por Cobrar</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">S/ {stats.monto_total_deuda.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Saldo pendiente total estimado
            </p>
          </div>
        </div>

        <div className="bg-background">
          <ReservasHistorialTable />
        </div>
      </div>
    </>
  )
}
