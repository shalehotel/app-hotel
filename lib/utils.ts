import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
