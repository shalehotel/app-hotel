type Habitacion = {
  estado_ocupacion: string
  estado_limpieza: string
  estado_servicio: string
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
      color: 'bg-[#374151]',
      textColor: 'text-white',
      badgeColor: 'bg-[#374151]',
      label: 'FUERA SERVICIO'
    }
  }

  if (habitacion.estado_servicio === 'MANTENIMIENTO') {
    return {
      color: 'bg-[#374151]',
      textColor: 'text-white',
      badgeColor: 'bg-[#374151]',
      label: 'MANTENIMIENTO'
    }
  }

  // 2. PRIORIDAD ALTA: Ocupación
  if (habitacion.estado_ocupacion === 'OCUPADA') {
    return {
      color: 'bg-[#f44250]',
      textColor: 'text-white',
      badgeColor: 'bg-[#f44250]',
      label: 'OCUPADA'
    }
  }

  // 3. PRIORIDAD MEDIA: Estado de Limpieza
  if (habitacion.estado_limpieza === 'SUCIA') {
    return {
      color: 'bg-[#fecc1b]',
      textColor: 'text-white',
      badgeColor: 'bg-[#fecc1b]',
      label: 'ESPERA LIMPIEZA'
    }
  }

  if (habitacion.estado_limpieza === 'EN_LIMPIEZA') {
    return {
      color: 'bg-[#2B7FFF]',
      textColor: 'text-white',
      badgeColor: 'bg-[#2B7FFF]',
      label: 'EN LIMPIEZA'
    }
  }

  // 4. ESTADO IDEAL: Lista para vender
  return {
    color: 'bg-[#6BD968]',
    textColor: 'text-white',
    badgeColor: 'bg-[#6BD968]',
    label: 'LISTA'
  }
}
