import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ========================================
// FECHA PERÚ - Zona horaria correcta para SUNAT
// Vercel corre en UTC, pero SUNAT requiere fecha de Perú (UTC-5)
// ========================================

/**
 * Retorna la fecha actual en zona horaria de Perú (America/Lima)
 * formateada como DD-MM-YYYY (formato requerido por NubeFact/SUNAT)
 */
export function getFechaEmisionPeru(): string {
  const now = new Date()
  // Formatear con zona horaria de Perú
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(now)
  
  const day = parts.find(p => p.type === 'day')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const year = parts.find(p => p.type === 'year')!.value
  
  return `${day}-${month}-${year}` // DD-MM-YYYY
}

/**
 * Retorna un Date object ajustado a la zona horaria de Perú
 * Para uso en campos timestamptz de la BD
 */
export function getFechaHoraPeru(): Date {
  const now = new Date()
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' })
  return new Date(peruString)
}

// ========================================
// HELPERS CÁLCULO RESERVAS (Pure Functions)
// ========================================

export function calcularTotalReserva(reserva: {
  precio_pactado: number
  fecha_entrada: string | Date
  fecha_salida: string | Date
}): number {
  const entrada = new Date(reserva.fecha_entrada)
  const salida = new Date(reserva.fecha_salida)
  const diffTime = Math.abs(salida.getTime() - entrada.getTime())
  // Mínimo 1 noche
  const noches = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  return reserva.precio_pactado * noches
}

export function calcularNoches(fecha_entrada: string | Date, fecha_salida: string | Date): number {
  const entrada = new Date(fecha_entrada)
  const salida = new Date(fecha_salida)
  const diffTime = Math.abs(salida.getTime() - entrada.getTime())
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
}
