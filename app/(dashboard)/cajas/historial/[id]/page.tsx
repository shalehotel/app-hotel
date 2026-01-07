import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { DetalleTurnoClient } from './detalle-turno-client'
import { getDetalleTurno } from '@/lib/actions/turnos'

export default async function DetalleTurnoPage({
  params
}: {
  params: { id: string }
}) {
  const { id } = await Promise.resolve(params)
  const result = await getDetalleTurno(id)

  if (!result.success) {
    notFound()
  }

  const turno = result.data

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cajas' },
          { label: 'Historial', href: '/cajas/historial' },
          { label: `Turno ${turno.caja.nombre}` }
        ]}
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <Suspense fallback={<div>Cargando detalle...</div>}>
          <DetalleTurnoClient turnoId={id} turnoInicial={turno} />
        </Suspense>
      </div>
    </div>
  )
}
