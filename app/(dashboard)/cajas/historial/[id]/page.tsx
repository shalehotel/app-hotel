import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { DetalleTurnoClient } from './detalle-turno-client'
import { getDetalleTurnoCerrado } from '@/lib/actions/cajas'
import { createClient } from '@/lib/supabase/server'

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

  // Detectar rol ADMIN para mostrar panel de correcciones
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let esAdmin = false
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()
    esAdmin = usuario?.rol === 'ADMIN'
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
          <DetalleTurnoClient turnoId={id} turnoInicial={turno} esAdmin={esAdmin} />
        </Suspense>
      </div>
    </>
  )
}
