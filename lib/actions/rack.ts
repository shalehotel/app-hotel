'use server'

import { createClient } from '@/lib/supabase/server'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { registrarHuespedesEnReserva, type HuespedConRelacion } from './huespedes'

// ========================================
// TYPES
// ========================================
export type RackHabitacion = {
  id: string
  numero: string
  piso: string
  tipo_id: string
  categoria_id: string
  estado_ocupacion: string
  estado_limpieza: string
  estado_servicio: string
  tipos_habitacion: {
    nombre: string
    capacidad_personas: number
  }
  categorias_habitacion: {
    nombre: string
  }
}

export type RackReserva = {
  id: string
  codigo_reserva: string
  habitacion_id: string
  fecha_entrada: string
  fecha_salida: string
  estado: string
  precio_pactado: number | null
  huespedes: {
    nombres: string
    apellidos: string
  } | null
  canales_venta: {
    nombre: string
  } | null
}

export type RackKPIs = {
  llegadas: number
  salidas: number
  sucias: number
  ocupadas: number
}

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
      reserva_huespedes!inner (
        huespedes (
          nombres,
          apellidos
        )
      ),
      canales_venta:canal_venta_id (
        nombre
      )
    `)
    .gte('fecha_salida', fechaInicio.toISOString())
    .lte('fecha_entrada', fechaFin.toISOString())
    .in('estado', ['RESERVADA', 'CHECKED_IN'])

  if (error) {
    console.error('Error fetching reservas:', error)
    throw new Error('Error al obtener reservas')
  }

  // Transformar para manejar relaciones
  const reservas = (data || []) as any[]
  return reservas.map(r => {
    // Extraer el huésped titular de la tabla de unión
    const reservaHuespedes = Array.isArray(r.reserva_huespedes) ? r.reserva_huespedes : [r.reserva_huespedes]
    const huesped = reservaHuespedes[0]?.huespedes || null
    
    return {
      ...r,
      huespedes: huesped,
      canales_venta: Array.isArray(r.canales_venta) ? r.canales_venta[0] : r.canales_venta,
      reserva_huespedes: undefined // Limpiar campo auxiliar
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
// BUSCAR HUÉSPED POR DOCUMENTO
// ========================================
export async function buscarHuespedPorDocumento(
  tipo: string,
  numero: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('huespedes')
    .select('*')
    .eq('tipo_documento', tipo)
    .eq('numero_documento', numero)
    .maybeSingle()

  if (error) {
    console.error('Error searching guest:', error)
    throw new Error('Error al buscar huésped')
  }

  return data
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
  pago?: {
    metodo_pago: string
    monto: number
    numero_operacion?: string
  } | null
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

  // Paso 3: Registrar pago si existe
  if (data.pago && data.pago.monto > 0) {
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert({
        reserva_id: reserva.id,
        monto: data.pago.monto,
        metodo_pago: data.pago.metodo_pago,
        numero_operacion: data.pago.numero_operacion,
        fecha_pago: new Date().toISOString()
      })

    if (pagoError) {
      console.error('Error creating payment:', pagoError)
      // No lanzar error, solo advertir
      console.warn('Reserva creada pero pago no registrado')
    }
  }

  // Paso 4: Actualizar estado de habitación si es check-in
  if (data.estado === 'CHECKED_IN') {
    await supabase
      .from('habitaciones')
      .update({ estado_ocupacion: 'OCUPADA' })
      .eq('id', data.habitacion_id)
  }

  return reserva
}

// ========================================
// OPERACIONES RÁPIDAS DESDE EL RACK
// ========================================

// Check-in rápido
export async function checkInRapido(reservaId: string) {
  const supabase = await createClient()

  // Actualizar reserva a CHECKED_IN
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .update({
      estado: 'CHECKED_IN',
      huesped_presente: true
    })
    .eq('id', reservaId)
    .select('habitacion_id')
    .single()

  if (reservaError) {
    console.error('Error updating reservation:', reservaError)
    throw new Error('Error al hacer check-in')
  }

  // Actualizar estado de habitación
  await supabase
    .from('habitaciones')
    .update({ estado_ocupacion: 'OCUPADA' })
    .eq('id', reserva.habitacion_id)

  return { success: true }
}

// Cancelar reserva
export async function cancelarReserva(reservaId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'CANCELADA' })
    .eq('id', reservaId)

  if (error) {
    console.error('Error canceling reservation:', error)
    throw new Error('Error al cancelar la reserva')
  }

  return { success: true }
}

// Marcar habitación como limpia
export async function marcarHabitacionLimpia(habitacionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('habitaciones')
    .update({ estado_limpieza: 'LIMPIA' })
    .eq('id', habitacionId)

  if (error) {
    console.error('Error updating room:', error)
    throw new Error('Error al actualizar estado de limpieza')
  }

  return { success: true }
}

// Obtener saldo pendiente de una reserva
export async function getSaldoPendiente(reservaId: string): Promise<number> {
  const supabase = await createClient()

  // Obtener precio pactado
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .select('precio_pactado')
    .eq('id', reservaId)
    .single()

  if (reservaError || !reserva?.precio_pactado) {
    return 0
  }

  // Obtener suma de pagos
  const { data: pagos, error: pagosError } = await supabase
    .from('pagos')
    .select('monto')
    .eq('reserva_id', reservaId)

  if (pagosError) {
    return reserva.precio_pactado
  }

  const totalPagado = pagos?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0
  return reserva.precio_pactado - totalPagado
}
