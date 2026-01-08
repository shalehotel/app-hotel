import { type Database } from '@/types/database.types'

type Habitacion = {
  estado_ocupacion: Database['public']['Enums']['estado_ocupacion_enum']
  estado_limpieza: Database['public']['Enums']['estado_limpieza_enum']
  estado_servicio: Database['public']['Enums']['estado_servicio_enum']
  // Permitir otros campos
  [key: string]: any
}

export type RoomVisualState = {
  color: string
  label: string
  textColor: string
  badgeColor: string
}

/**
 * Determina el estado visual prioritario de una habitación
 * Jerarquía de decisión:
 * 1. MANTENIMIENTO / FUERA DE SERVICIO (Bloqueante total)
 * 2. OCUPADA (Tiene huésped)
 * 3. SUCIA / LIMPIEZA (Operativo)
 * 4. DISPONIBLE (Lista para venta)
 */
export function getRoomVisualState(habitacion: Habitacion): RoomVisualState {
  // 1. PRIORIDAD CRÍTICA: Estado de Servicio
  if (habitacion.estado_servicio === 'FUERA_SERVICIO') {
    return {
      color: 'bg-zinc-900', // Negro/Gris muy oscuro
      textColor: 'text-zinc-50',
      badgeColor: 'bg-zinc-800',
      label: 'FUERA DE SERVICIO'
    }
  }

  if (habitacion.estado_servicio === 'MANTENIMIENTO') {
    return {
      color: 'bg-amber-900', // Marrón/Naranja oscuro
      textColor: 'text-amber-50',
      badgeColor: 'bg-amber-800',
      label: 'MANTENIMIENTO'
    }
  }

  // 2. PRIORIDAD ALTA: Ocupación
  if (habitacion.estado_ocupacion === 'OCUPADA') {
    // Aquí podríamos refinar si tuviéramos huesped_presente
    // Pero la base es ROJO
    return {
      color: 'bg-red-500',
      textColor: 'text-white',
      badgeColor: 'bg-red-700',
      label: 'OCUPADA'
    }
  }

  // 3. PRIORIDAD MEDIA: Estado de Limpieza (Solo relevante si no está ocupada ni en mantenimiento)
  if (habitacion.estado_limpieza === 'SUCIA') {
    return {
      color: 'bg-amber-400', // Amarillo
      textColor: 'text-amber-950',
      badgeColor: 'bg-amber-500',
      label: 'SUCIA'
    }
  }

  if (habitacion.estado_limpieza === 'EN_LIMPIEZA') {
    return {
      color: 'bg-blue-400', // Azul claro
      textColor: 'text-blue-950',
      badgeColor: 'bg-blue-500',
      label: 'LIMPIANDO'
    }
  }

  // 4. ESTADO IDEAL: Disponible
  return {
    color: 'bg-emerald-500', // Verde
    textColor: 'text-white',
    badgeColor: 'bg-emerald-700',
    label: 'DISPONIBLE'
  }
}
