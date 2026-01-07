import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { HistorialCierresClient } from './historial-cierres-client'

export default function HistorialCierresPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cajas' },
          { label: 'Historial de Cierres' }
        ]}
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Historial de Cierres de Turno</h1>
            <p className="text-muted-foreground">
              Consulta todos los cierres de caja y su estado de cuadre
            </p>
          </div>

          <Suspense fallback={<div>Cargando historial...</div>}>
            <HistorialCierresClient />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
