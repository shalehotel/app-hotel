import { Suspense } from 'react'
import { FacturacionClient } from './facturacion-client'
import { DashboardHeader } from '@/components/dashboard-header'
import { Skeleton } from '@/components/ui/skeleton'
import { getEstadisticasFacturacion } from '@/lib/actions/comprobantes'
import { FileText, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'

export const metadata = {
  title: 'Historial de Ventas | Facturación',
  description: 'Registro completo de transacciones comerciales'
}

async function EstadisticasFacturacion() {
  const stats = await getEstadisticasFacturacion()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Boletas Emitidas</p>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_boletas}</div>
        <p className="text-xs text-muted-foreground">Comprobantes tipo boleta</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Facturas Emitidas</p>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{stats.total_facturas}</div>
        <p className="text-xs text-muted-foreground">Comprobantes tipo factura</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Pendientes SUNAT</p>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
          {stats.total_pendientes}
        </div>
        <p className="text-xs text-muted-foreground">Por enviar o confirmar</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Total Vendido</p>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-500">
          S/ {stats.monto_total.toFixed(2)}
        </div>
        <p className="text-xs text-muted-foreground">Comprobantes no anulados</p>
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

export default function FacturacionPage() {
  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Historial de Ventas' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Historial de Ventas</h2>
            <p className="text-sm text-muted-foreground">
              Registro completo de transacciones comerciales
            </p>
          </div>
        </div>

        <Suspense fallback={<EstadisticasSkeleton />}>
          <EstadisticasFacturacion />
        </Suspense>

        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <FacturacionClient />
          </Suspense>
        </div>
      </div>
    </>
  )
}
