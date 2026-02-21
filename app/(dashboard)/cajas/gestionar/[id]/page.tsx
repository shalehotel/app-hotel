import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getDetalleTurnoActivo } from '@/lib/actions/cajas'
import { DetalleTurnoActivoClient } from './detalle-turno-activo-client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function GestionarCajaPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    try {
        const turno = await getDetalleTurnoActivo(id)

        if (!turno) {
            notFound()
        }

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
            <div className="p-6">
                <Suspense fallback={<div>Cargando detalle...</div>}>
                    <DetalleTurnoActivoClient turnoId={id} turnoInicial={turno} esAdmin={esAdmin} />
                </Suspense>
            </div>
        )
    } catch (error) {
        notFound()
    }
}
