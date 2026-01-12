import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getDetalleTurnoActivo } from '@/lib/actions/cajas'
import { DetalleTurnoActivoClient } from './detalle-turno-activo-client'

export const dynamic = 'force-dynamic'

export default async function GestionarCajaPage({
    params
}: {
    params: { id: string }
}) {
    const { id } = await Promise.resolve(params)

    try {
        const turno = await getDetalleTurnoActivo(id)

        if (!turno) {
            notFound()
        }

        return (
            <div className="p-6">
                <Suspense fallback={<div>Cargando detalle...</div>}>
                    <DetalleTurnoActivoClient turnoId={id} turnoInicial={turno} />
                </Suspense>
            </div>
        )
    } catch (error) {
        notFound()
    }
}
