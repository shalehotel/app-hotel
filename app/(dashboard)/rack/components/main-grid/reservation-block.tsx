'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { ReservationContextMenu } from '../context-menu/reservation-context-menu'
import type { RackReserva } from '@/lib/actions/rack'

type Props = {
  reserva: RackReserva
  nights: number
  onClick: (id: string) => void
  onUpdate: () => void
}

export function ReservationBlock({ reserva, nights, onClick, onUpdate }: Props) {
  // Colores según estado
  const getStatusColor = (estado: string) => {
    if (estado === 'CHECKED_IN') return 'bg-green-500 border-green-600 hover:bg-green-600'
    if (estado === 'RESERVADA') return 'bg-blue-500 border-blue-600 hover:bg-blue-600'
    if (estado === 'CHECKOUT') return 'bg-gray-500 border-gray-600 hover:bg-gray-600'
    return 'bg-gray-500 border-gray-600 hover:bg-gray-600'
  }

  const huesped = reserva.huespedes 
    ? `${reserva.huespedes.nombres} ${reserva.huespedes.apellidos}` 
    : 'Sin huésped'

  // Calcular noches
  const totalNoches = differenceInDays(
    new Date(reserva.fecha_salida),
    new Date(reserva.fecha_entrada)
  )

  // Construir tooltip con información relevante
  const tooltipContent = `${huesped} | ${totalNoches} noche${totalNoches !== 1 ? 's' : ''} | ${reserva.precio_pactado ? `S/ ${reserva.precio_pactado.toFixed(2)}` : 'Sin precio'}`

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <ReservationContextMenu reserva={reserva} onUpdate={onUpdate}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'absolute inset-1 rounded border-2 cursor-pointer transition-colors z-10',
                'flex flex-col justify-center px-2 py-1 text-white shadow-sm',
                getStatusColor(reserva.estado)
              )}
              style={{
                width: `calc(${nights * 80}px - 8px)` // 80px por celda menos margins
              }}
              onClick={(e) => {
                e.stopPropagation()
                onClick(reserva.id)
              }}
              onContextMenu={(e) => {
                e.stopPropagation()
              }}
            >
              <div className="font-semibold text-xs truncate">
                {reserva.codigo_reserva}
              </div>
              <div className="text-xs truncate opacity-90">
                {huesped}
              </div>
              {reserva.precio_pactado && (
                <div className="text-xs font-medium">
                  S/ {reserva.precio_pactado.toFixed(2)}
                </div>
              )}
            </div>
          </TooltipTrigger>
        </ReservationContextMenu>
        <TooltipContent side="top" className="bg-gray-900 text-white">
          <p className="text-sm">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
