'use server'

import { createClient } from '@/lib/supabase/server'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { registrarHuespedesEnReserva, type HuespedConRelacion } from './huespedes'
import type { RackHabitacion, RackReserva, RackKPIs } from '@/types/rack'

// ========================================
// OBTENER HABITACIONES PARA EL RACK
// ========================================
export async function getRackHabitaciones() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('habitaciones')
    .select(`
      id,
      numero,
      piso,
      tipo_id,
      categoria_id,
      estado_ocupacion,
      estado_limpieza,
      estado_servicio,
      tipos_habitacion!inner (
        nombre,
        capacidad_personas
      ),
      categorias_habitacion!inner (
        nombre
      )
    `)
    .order('numero', { ascending: true })

  if (error) {
    console.error('Error fetching habitaciones:', error)
    throw new Error('Error al obtener habitaciones')
  }

  // Transformar para manejar relaciones
  const habitaciones = (data || []) as any[]
  return habitaciones.map(h => ({
    ...h,
    tipos_habitacion: Array.isArray(h.tipos_habitacion) ? h.tipos_habitacion[0] : h.tipos_habitacion,
    categorias_habitacion: Array.isArray(h.categorias_habitacion) ? h.categorias_habitacion[0] : h.categorias_habitacion
  })) as RackHabitacion[]
}

// ========================================
// OBTENER RESERVAS PARA EL RACK
// ========================================
export async function getRackReservas(fechaInicio: Date, fechaFin: Date) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reservas')
    .select(`
      id,
      codigo_reserva,
      habitacion_id,
      fecha_entrada,
      fecha_salida,
      estado,
      precio_pactado,
      huesped_presente,
      reserva_huespedes!inner (
        huespedes (
          nombres,
          apellidos
        )
      ),
      canales_venta:canal_venta_id (
        nombre
      ),
      pagos (
        monto
      )
    `)
    .gte('fecha_salida', fechaInicio.toISOString())
    .lte('fecha_entrada', fechaFin.toISOString())
    .in('estado', ['RESERVADA', 'CHECKED_IN'])

  if (error) {
    console.error('Error fetching reservas:', error)
    throw new Error('Error al obtener reservas')
  }

  // Transformar para manejar relaciones y calcular saldo
  const reservas = (data || []) as any[]
  return reservas.map(r => {
    // Extraer el huésped titular
    const reservaHuespedes = Array.isArray(r.reserva_huespedes) ? r.reserva_huespedes : [r.reserva_huespedes]
    const huesped = reservaHuespedes[0]?.huespedes || null
    
    // Calcular Saldo
    const totalPagado = r.pagos?.reduce((sum: number, p: any) => sum + (p.monto || 0), 0) || 0
    const saldo = (r.precio_pactado || 0) - totalPagado
    
    return {
      ...r,
      huespedes: huesped,
      canales_venta: Array.isArray(r.canales_venta) ? r.canales_venta[0] : r.canales_venta,
      reserva_huespedes: undefined,
      pagos: undefined, 
      saldo_pendiente: saldo > 0.1 ? saldo : 0 
    }
  }) as RackReserva[]
}

// ========================================
// OBTENER KPIs DEL DÍA
// ========================================
export async function getRackKPIs() {
  const supabase = await createClient()
  const hoy = new Date()
  const inicioHoy = startOfDay(hoy).toISOString()
  const finHoy = endOfDay(hoy).toISOString()

  // Llegadas del día
  const { count: llegadas } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .gte('fecha_entrada', inicioHoy)
    .lte('fecha_entrada', finHoy)
    .eq('estado', 'RESERVADA')

  // Salidas del día
  const { count: salidas } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .gte('fecha_salida', inicioHoy)
    .lte('fecha_salida', finHoy)
    .eq('estado', 'CHECKED_IN')

  // Habitaciones sucias
  const { count: sucias } = await supabase
    .from('habitaciones')
    .select('id', { count: 'exact', head: true })
    .eq('estado_limpieza', 'SUCIA')

  // Habitaciones ocupadas
  const { count: ocupadas } = await supabase
    .from('habitaciones')
    .select('id', { count: 'exact', head: true })
    .eq('estado_ocupacion', 'OCUPADA')

  return {
    llegadas: llegadas || 0,
    salidas: salidas || 0,
    sucias: sucias || 0,
    ocupadas: ocupadas || 0
  } as RackKPIs
}

// ========================================
// OBTENER CHECK-INS Y CHECK-OUTS DEL DÍA
// ========================================
export async function getTareasDelDia() {
  const supabase = await createClient()
  const hoy = new Date()
  const inicioHoy = startOfDay(hoy).toISOString()
  const finHoy = endOfDay(hoy).toISOString()

  // Check-ins pendientes
  const { data: checkins } = await supabase
    .from('reservas')
    .select(`
      id,
      codigo_reserva,
      habitacion_id,
      fecha_entrada,
      reserva_huespedes!inner (
        huespedes (nombres, apellidos)
      ),
      habitaciones (numero)
    `)
    .gte('fecha_entrada', inicioHoy)
    .lte('fecha_entrada', finHoy)
    .eq('estado', 'RESERVADA')
    .order('fecha_entrada', { ascending: true })

  // Check-outs pendientes
  const { data: checkouts } = await supabase
    .from('reservas')
    .select(`
      id,
      codigo_reserva,
      habitacion_id,
      fecha_salida,
      reserva_huespedes!inner (
        huespedes (nombres, apellidos)
      ),
      habitaciones (numero)
    `)
    .gte('fecha_salida', inicioHoy)
    .lte('fecha_salida', finHoy)
    .eq('estado', 'CHECKED_IN')
    .order('fecha_salida', { ascending: true })

  // Transformar datos para formato plano
  const checkinsList = (checkins || []).map((c: any) => ({
    ...c,
    huespedes: c.reserva_huespedes?.[0]?.huespedes || null,
    reserva_huespedes: undefined
  }))

  const checkoutsList = (checkouts || []).map((c: any) => ({
    ...c,
    huespedes: c.reserva_huespedes?.[0]?.huespedes || null,
    reserva_huespedes: undefined
  }))

  return {
    checkins: checkinsList,
    checkouts: checkoutsList
  }
}

// ========================================
// CREAR RESERVA DESDE EL RACK (completa)
// ========================================
export async function crearReservaDesdeRack(data: {
  habitacion_id: string
  huespedes: HuespedConRelacion[]
  fecha_entrada: Date
  fecha_salida: Date
  precio_pactado: number
  estado: 'RESERVADA' | 'CHECKED_IN'
  pago?: any // Ignorado intencionalmente
}) {
  const supabase = await createClient()

  // Validar que exista al menos un huésped titular
  const titular = data.huespedes.find(h => h.es_titular)
  if (!titular) {
    throw new Error('Debe existir un huésped titular')
  }

  // Paso 1: Crear la reserva
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .insert({
      habitacion_id: data.habitacion_id,
      fecha_entrada: data.fecha_entrada.toISOString(),
      fecha_salida: data.fecha_salida.toISOString(),
      precio_pactado: data.precio_pactado,
      estado: data.estado,
      huesped_presente: data.estado === 'CHECKED_IN'
    })
    .select('id, codigo_reserva')
    .single()

  if (reservaError) {
    console.error('Error creating reservation:', reservaError)
    throw new Error('Error al crear la reserva')
  }

  // Paso 2: Registrar todos los huéspedes (titular + acompañantes)
  await registrarHuespedesEnReserva(reserva.id, data.huespedes)

  // NOTA: El registro de pagos se ha movido al flujo de facturación (cobrarYFacturar).
  // Ya no se registran pagos directos al crear la reserva para garantizar integridad fiscal.

  // Paso 4: Actualizar estado de habitación si es check-in
  if (data.estado === 'CHECKED_IN') {
    await supabase
      .from('habitaciones')
      .update({ estado_ocupacion: 'OCUPADA' })
      .eq('id', data.habitacion_id)
  }

  return { data: reserva }
}

// ========================================
// OPERACIONES RÁPIDAS
// ========================================

export async function marcarHabitacionLimpia(habitacionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('habitaciones')
    .update({ estado_limpieza: 'LIMPIA' })
    .eq('id', habitacionId)

  if (error) throw new Error('Error al actualizar limpieza')
  return { success: true }
}

export async function cambiarEstadoHabitacion(habitacionId: string, nuevoEstado: string, nota?: string) {
  const supabase = await createClient()
  const updates: any = { estado_servicio: nuevoEstado }
  
  if (nuevoEstado === 'MANTENIMIENTO' || nuevoEstado === 'FUERA_SERVICIO') {
    updates.estado_limpieza = 'SUCIA'
    updates.estado_ocupacion = 'LIBRE'
  }

  const { error } = await supabase.from('habitaciones').update(updates).eq('id', habitacionId)
  if (error) throw new Error('Error al actualizar estado')
  return { success: true }
}