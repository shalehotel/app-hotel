'use client'

import { startOfDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { RoomContextMenu } from '../context-menu/room-context-menu'
import { getRoomVisualState } from '@/lib/utils/room-status'
import { Key, User, Sparkles, Users } from 'lucide-react'
import type { RackHabitacion, RackReserva } from '@/lib/actions/rack'

type Props = {
    habitacion: RackHabitacion
    reservas: RackReserva[]
    onReservationClick: (id: string) => void
    onNewReservation: (habitacion: RackHabitacion, fecha: Date) => void
    onUpdate: () => void
}

export function RoomCard({
    habitacion,
    reservas,
    onReservationClick,
    onNewReservation,
    onUpdate
}: Props) {
    const visualState = getRoomVisualState(habitacion)

    // Buscar reserva activa (CHECKED_IN) de hoy
    const today = startOfDay(new Date())
    const activeReservation = reservas.find(r => {
        if (r.estado !== 'CHECKED_IN') return false
        const start = startOfDay(new Date(r.fecha_entrada))
        const end = startOfDay(new Date(r.fecha_salida))
        return today >= start && today <= end
    })

    const handleClick = () => {
        if (activeReservation) {
            onReservationClick(activeReservation.id)
        } else {
            onNewReservation(habitacion, new Date())
        }
    }

    return (
        <RoomContextMenu
            habitacion={habitacion}
            reservaActiva={activeReservation ? { id: activeReservation.id, huesped_presente: activeReservation.huesped_presente } : null}
            onUpdate={onUpdate}
        >
            <div
                className="relative bg-card border rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow group h-full flex flex-col justify-between overflow-hidden"
                onClick={handleClick}
            >
                {/* Barra de estado lateral */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${habitacion.estado_servicio !== 'OPERATIVA' ? 'bg-[#374151]' :
                        habitacion.estado_ocupacion === 'OCUPADA' ? 'bg-[#f44250]' :
                            'bg-[#6BD968]'
                    }`} />

                <div className="flex items-start justify-between mb-2 pl-2">
                    <div>
                        <h3 className="font-bold text-xl leading-none group-hover:text-primary transition-colors">{habitacion.numero}</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 font-medium">{habitacion.tipos_habitacion.nombre}</p>
                    </div>

                    {/* Badges solo si está ocupada */}
                    {habitacion.estado_ocupacion === 'OCUPADA' ? (
                        <div className="flex flex-col items-end gap-1">
                            {/* Badge Huésped */}
                            <Badge
                                variant="outline"
                                className={`${activeReservation?.huesped_presente === false
                                    ? 'bg-[#f59e0b] text-white border-0'
                                    : 'bg-[#f44250] text-white border-0'
                                    } text-[10px] px-2 py-0.5 flex items-center gap-1 shadow-sm`}
                            >
                                {activeReservation?.huesped_presente === false ? (
                                    <><Key className="w-3 h-3" /> Fuera</>
                                ) : (
                                    <><User className="w-3 h-3" /> Dentro</>
                                )}
                            </Badge>

                            {/* Badge Limpieza */}
                            <Badge
                                variant="outline"
                                className={`${habitacion.estado_limpieza === 'SUCIA' ? 'bg-[#fecc1b] text-white border-0' :
                                        habitacion.estado_limpieza === 'EN_LIMPIEZA' ? 'bg-[#2B7FFF] text-white border-0' :
                                            'bg-[#2B7FFF] text-white border-0'
                                    } text-[10px] px-2 py-0.5 flex items-center gap-1 shadow-sm`}
                            >
                                <Sparkles className="w-3 h-3" />
                                {habitacion.estado_limpieza === 'SUCIA' ? 'Sucia' :
                                    habitacion.estado_limpieza === 'EN_LIMPIEZA' ? 'Limpiando' :
                                        'Limpia'}
                            </Badge>
                        </div>
                    ) : (
                        <Badge
                            variant="outline"
                            className={`${visualState.badgeColor} ${visualState.textColor} border-0 text-xs px-2 py-0.5 font-semibold shadow-sm`}
                        >
                            {visualState.label}
                        </Badge>
                    )}
                </div>

                <div className="text-xs space-y-2 pl-2 mt-2 text-muted-foreground">
                    <div className="flex justify-between items-center">
                        <span>Piso {habitacion.piso}</span>
                        <div className="flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded">
                            <Users className="w-3 h-3" />
                            {habitacion.tipos_habitacion.capacidad_personas || 2}
                        </div>
                    </div>

                    {activeReservation && (
                        <div className="pt-2 border-t flex items-center gap-2 text-foreground font-medium">
                            <User className="w-3 h-3 text-primary" />
                            <span className="truncate">
                                {activeReservation.huespedes
                                    ? `${activeReservation.huespedes.nombres} ${activeReservation.huespedes.apellidos}`
                                    : 'Huésped'
                                }
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </RoomContextMenu>
    )
}
