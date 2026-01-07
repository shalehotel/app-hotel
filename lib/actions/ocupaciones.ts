'use server'

import { createClient } from '@/lib/supabase/server'

// ========================================
// TYPES
// ========================================
export type OcupacionReserva = {
  id: string
  codigo_reserva: string
  estado: 'RESERVADA' | 'CHECKED_IN' | 'CHECKED_OUT'
  fecha_entrada: string
  fecha_salida: string
  check_in_real: string | null
  check_out_real: string | null
  precio_pactado: number
  huesped_presente: boolean
  
  // Habitación
  habitacion_numero: string
  habitacion_piso: string
  tipo_habitacion: string
  
  // Huésped titular
  titular_nombre: string
  titular_tipo_doc: string
  titular_numero_doc: string
  titular_correo: string | null
  titular_telefono: string | null
  
  // Financiero
  total_estimado: number
  total_pagado: number
  saldo_pendiente: number
  total_noches: number
  
  // Metadata
  created_at: string
  updated_at: string
}

export type FiltroOcupaciones = {
  estado?: 'RESERVADA' | 'CHECKED_IN' | 'CHECKED_OUT' | 'TODAS'
  solo_con_deuda?: boolean
  habitacion?: string
  huesped?: string
}

// ========================================
// OBTENER OCUPACIONES ACTUALES
// ========================================
export async function getOcupacionesActuales(filtros?: FiltroOcupaciones) {
  const supabase = await createClient()

  let query = supabase
    .from('vw_reservas_con_deuda')
    .select('*')

  // Aplicar filtros
  if (filtros?.estado && filtros.estado !== 'TODAS') {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros?.solo_con_deuda) {
    query = query.gt('saldo_pendiente', 0)
  }

  if (filtros?.habitacion) {
    query = query.ilike('habitacion_numero', `%${filtros.habitacion}%`)
  }

  if (filtros?.huesped) {
    query = query.ilike('titular_nombre', `%${filtros.huesped}%`)
  }

  // Ordenar por estado: primero deudores, luego check-in, luego reservas
  query = query.order('saldo_pendiente', { ascending: false })
  query = query.order('fecha_entrada', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener ocupaciones:', error)
    throw new Error('Error al cargar ocupaciones')
  }

  return data as OcupacionReserva[]
}

// ========================================
// OBTENER ESTADÍSTICAS DE OCUPACIONES
// ========================================
export async function getEstadisticasOcupaciones() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_reservas_con_deuda')
    .select('estado, saldo_pendiente')

  if (error) {
    console.error('Error al obtener estadísticas:', error)
    return {
      total_reservas: 0,
      total_checkins: 0,
      total_checkouts: 0,
      total_con_deuda: 0,
      monto_total_deuda: 0
    }
  }

  const stats = {
    total_reservas: data.filter(r => r.estado === 'RESERVADA').length,
    total_checkins: data.filter(r => r.estado === 'CHECKED_IN').length,
    total_checkouts: data.filter(r => r.estado === 'CHECKED_OUT').length,
    total_con_deuda: data.filter(r => r.saldo_pendiente > 0).length,
    monto_total_deuda: data.reduce((sum, r) => sum + (r.saldo_pendiente || 0), 0)
  }

  return stats
}

// ========================================
// OBTENER DETALLE DE UNA RESERVA
// ========================================
export async function getDetalleReserva(reserva_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_reservas_con_deuda')
    .select('*')
    .eq('id', reserva_id)
    .single()

  if (error) {
    console.error('Error al obtener detalle:', error)
    throw new Error('Error al cargar detalle de reserva')
  }

  return data as OcupacionReserva
}

// ========================================
// OBTENER HUÉSPEDES DE UNA RESERVA
// ========================================
export async function getHuespedesDeReserva(reserva_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reserva_huespedes')
    .select(`
      es_titular,
      huespedes (
        id,
        nombres,
        apellidos,
        tipo_documento,
        numero_documento,
        nacionalidad,
        correo,
        telefono
      )
    `)
    .eq('reserva_id', reserva_id)
    .order('es_titular', { ascending: false })

  if (error) {
    console.error('Error al obtener huéspedes:', error)
    return []
  }

  return data
}

// ========================================
// OBTENER PAGOS DE UNA RESERVA
// ========================================
export async function getPagosDeReserva(reserva_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pagos')
    .select(`
      id,
      monto,
      metodo_pago,
      referencia_pago,
      nota,
      fecha_pago,
      comprobante_id,
      comprobantes (
        numero_completo:serie || '-' || numero,
        tipo_comprobante
      )
    `)
    .eq('reserva_id', reserva_id)
    .order('fecha_pago', { ascending: false })

  if (error) {
    console.error('Error al obtener pagos:', error)
    return []
  }

  return data
}
