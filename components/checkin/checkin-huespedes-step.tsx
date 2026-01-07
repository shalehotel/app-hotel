'use client'

import { HuespedesForm } from '@/components/huespedes/huespedes-form'
import { registrarHuespedesEnReserva } from '@/lib/actions/huespedes'
import type { HuespedConRelacion } from '@/lib/actions/huespedes'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  reservaId: string
}

export function CheckinHuespedesStep({ reservaId }: Props) {
  const router = useRouter()

  const handleSubmit = async (huespedes: HuespedConRelacion[]) => {
    const result = await registrarHuespedesEnReserva(reservaId, huespedes)

    if (!result.success) {
      toast.error(result.error || 'Error al registrar huéspedes')
      throw new Error(result.error)
    }

    toast.success('Huéspedes registrados correctamente')
    
    // Continuar con el siguiente paso del check-in o redirigir
    router.push(`/reservas/${reservaId}/confirmar`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Datos de Huéspedes</h2>
        <p className="text-muted-foreground">
          Registra los datos del huésped titular y sus acompañantes
        </p>
      </div>

      <HuespedesForm onSubmit={handleSubmit} />
    </div>
  )
}
