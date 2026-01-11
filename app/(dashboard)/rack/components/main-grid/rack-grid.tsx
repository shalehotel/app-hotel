'use client'

import { format, addDays, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { GridHeader } from './grid-header'
import { RoomRow } from './room-row'
import type { RackHabitacion, RackReserva } from '@/lib/actions/rack'

type Props = {
  habitaciones: RackHabitacion[]
  reservas: RackReserva[]
  startDate: Date
  endDate: Date
  onReservationClick: (id: string) => void
  onNewReservation: (habitacion: RackHabitacion, fecha: Date, fechaFinal?: Date) => void
  onUpdate: () => void
  clearSelection?: boolean
}

export function RackGrid({
  habitaciones,
  reservas,
  startDate,
  endDate,
  onReservationClick,
  onNewReservation,
  onUpdate,
  clearSelection
}: Props) {
  // Generar días desde startDate hasta endDate
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Filtrar reservas por habitación
  const getReservasForHabitacion = (habitacionId: string) => {
    return reservas.filter(r => r.habitacion_id === habitacionId)
  }

  return (
    <div className="relative h-full">
      {/* Grid Container */}
      <div className="overflow-auto h-full no-scrollbar">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `160px repeat(${days.length}, 80px)`,
            minWidth: 'max-content'
          }}
        >
          {/* Header Row */}
          <GridHeader days={days} />

          {/* Room Rows */}
          {habitaciones.map((habitacion) => (
            <RoomRow
              key={habitacion.id}
              habitacion={habitacion}
              days={days}
              reservas={getReservasForHabitacion(habitacion.id)}
              startDate={startDate}
              onReservationClick={onReservationClick}
              onNewReservation={onNewReservation}
              onUpdate={onUpdate}
              clearSelection={clearSelection}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
