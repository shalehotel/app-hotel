import { DashboardHeader } from '@/components/dashboard-header'
import { ReservasHistorialTable } from './reservas-historial-table'
import { getEstadisticasOcupaciones } from '@/lib/actions/ocupaciones'
import { CalendarDays, TrendingUp, History, FileBarChart } from 'lucide-react'

export default async function ReservasPage() {
  const stats = await getEstadisticasOcupaciones()

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Historial de Reservas' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Reservas</h1>
          <p className="text-muted-foreground">
            Registro histórico completo de reservas, análisis de ocupación y reportes financieros.
          </p>
        </div>

        {/* KPIs orientados a reportes y análisis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Reservas</p>
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.total_reservas + stats.total_checkins}</div>
            <p className="text-xs text-muted-foreground">
              Todas las reservas del sistema
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Reservas Futuras</p>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.total_reservas}</div>
            <p className="text-xs text-muted-foreground">
              Pendientes de llegada
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Ocupadas Actualmente</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{stats.total_checkins}</div>
            <p className="text-xs text-muted-foreground">
              Check-in realizado
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Cuentas por Cobrar</p>
              <FileBarChart className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">S/ {stats.monto_total_deuda.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Saldo pendiente ({stats.total_con_deuda} reservas)
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
