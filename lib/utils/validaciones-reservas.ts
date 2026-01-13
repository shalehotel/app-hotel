/**
 * Utilidades de validación para reservas
 * Este archivo NO tiene 'use server' porque contiene funciones síncronas
 * que pueden ser usadas tanto en cliente como en servidor
 */

type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELADA' | 'NO_SHOW'

/**
 * Valida si una transición de estado es permitida.
 * Evita transiciones ilógicas que generan inconsistencias.
 */
export function esTransicionValida(estadoActual: string, nuevoEstado: string): { valida: boolean; mensaje?: string } {
  const transicionesPermitidas: Record<string, string[]> = {
    'PENDIENTE': ['CONFIRMADA', 'CANCELADA', 'NO_SHOW'],
    'CONFIRMADA': ['CHECKED_IN', 'CANCELADA', 'NO_SHOW', 'PENDIENTE'], // Permitir revertir a pendiente
    'CHECKED_IN': ['CHECKED_OUT', 'CANCELADA', 'CONFIRMADA'], // Permitir rollback a CONFIRMADA
    'CHECKED_OUT': ['CHECKED_IN'], // Permitir rollback solo para casos críticos
    'CANCELADA': [], // Estado terminal, no permite cambios
    'NO_SHOW': [] // Estado terminal, no permite cambios
  }

  const estadosPermitidos = transicionesPermitidas[estadoActual] || []
  
  if (!estadosPermitidos.includes(nuevoEstado)) {
    return {
      valida: false,
      mensaje: `Transición inválida: no se puede cambiar de ${estadoActual} a ${nuevoEstado}`
    }
  }

  return { valida: true }
}
