import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { DetalleTurnoClient } from './detalle-turno-client'
import { getDetalleTurnoCerrado } from '@/lib/actions/cajas'

export default async function DetalleTurnoPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let turno
  try {
    turno = await getDetalleTurnoCerrado(id)
  } catch (error) {
    notFound()
  }

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Cajas' },
          { label: 'Historial', href: '/cajas/historial' },
          { label: `Turno ${turno.turno.caja_nombre}` }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Suspense fallback={<div>Cargando detalle...</div>}>
          <DetalleTurnoClient turnoId={id} turnoInicial={turno} />
        </Suspense>
      </div>
    </>
  )
}
