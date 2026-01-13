'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { calcularTotalReserva } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

// ========================================
// TYPES
// ========================================
export type Pago = {
  id: string
  reserva_id: string
  caja_turno_id: string
  comprobante_id: string | null
  metodo_pago: string
  moneda_pago: 'PEN' | 'USD'
  monto: number
  tipo_cambio_pago: number
  referencia_pago: string | null
  nota: string | null
  fecha_pago: string
}

export type CobrarYFacturarInput = {
  reserva_id: string
  caja_turno_id?: string // Opcional, si no se envía se busca el activo

  // Datos del Pago
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN'
  monto: number
  moneda: 'PEN' | 'USD'
  tipo_cambio?: number // 1.000 por defecto si es PEN
  referencia_pago?: string
  nota?: string

  // Datos de Facturación
  tipo_comprobante: 'BOLETA' | 'FACTURA'
  serie: string
  cliente_tipo_doc: string // DNI, RUC, etc
  cliente_numero_doc: string
  cliente_nombre: string
  cliente_direccion?: string

  // Detalle del servicio (Items)
  items: Array<{
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    codigo_afectacion_igv?: string
  }>
}

// ========================================
// OBTENER TURNO ACTIVO
// ========================================
async function getTurnoActivo(usuario_id: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('caja_turnos')
    .select('id')
    .eq('usuario_id', usuario_id)
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .single()
  return data?.id || null
}

// ========================================
// FUNCIÓN PRINCIPAL: COBRAR Y FACTURAR
// ========================================
export async function cobrarYFacturar(input: CobrarYFacturarInput) {
  const supabase = await createClient()

  try {
    // 1. Validar Usuario y Turno
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    let cajaTurnoId = input.caja_turno_id
    if (!cajaTurnoId) {
      const turnoActivo = await getTurnoActivo(user.id)
      if (!turnoActivo) throw new Error('No hay turno de caja abierto. Debes abrir caja para cobrar.')
      cajaTurnoId = turnoActivo
    }

    // 2. Validar Reserva
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('id, codigo_reserva')
      .eq('id', input.reserva_id)
      .single()

    if (reservaError || !reserva) throw new Error('Reserva no encontrada')

    // 3. Validar que la serie existe y es del tipo correcto
    const { data: serieValida, error: serieError } = await supabase
      .from('series_comprobante')
      .select('id, tipo_comprobante')
      .eq('serie', input.serie)
      .single()

    if (serieError || !serieValida) {
      throw new Error(`La serie ${input.serie} no existe. Configure las series en Configuración > Cajas`)
    }

    if (serieValida.tipo_comprobante !== input.tipo_comprobante) {
      throw new Error(
        `La serie ${input.serie} es de tipo ${serieValida.tipo_comprobante}, no se puede usar para ${input.tipo_comprobante}`
      )
    }

    // 4. Obtener Correlativo (Atómico)
    const { data: correlativo, error: corrError } = await supabase
      .rpc('obtener_siguiente_correlativo', { p_serie: input.serie })

    if (corrError || !correlativo) throw new Error('Error al generar número de comprobante')

    // 5. Calcular Totales Fiscales
    // Obtener configuración dinámica del hotel
    const config = await getHotelConfig()
    const TASA_IGV = (config.tasa_igv || 18.00) / 100
    const ES_EXONERADO = config.es_exonerado_igv

    let op_gravadas = 0
    let op_exoneradas = 0
    let monto_igv = 0
    let total_venta = 0

    for (const item of input.items) {
      total_venta += item.subtotal

      // Si el hotel es exonerado, forzamos código 20
      const codigoAfectacion = ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')

      if (codigoAfectacion === '10') {
        // Operación Gravada
        const base = item.subtotal / (1 + TASA_IGV)
        op_gravadas += base
        monto_igv += (item.subtotal - base)
      } else {
        // Operación Exonerada (20) o Inafecta (30)
        op_exoneradas += item.subtotal
      }
    }

    // 6. INSERTAR COMPROBANTE (Snapshot)
    const { data: comprobante, error: compError } = await supabase
      .from('comprobantes')
      .insert({
        turno_caja_id: cajaTurnoId,
        reserva_id: input.reserva_id,
        tipo_comprobante: input.tipo_comprobante,
        serie: input.serie,
        numero: correlativo,

        // Snapshot Cliente
        receptor_tipo_doc: input.cliente_tipo_doc,
        receptor_nro_doc: input.cliente_numero_doc,
        receptor_razon_social: input.cliente_nombre,
        receptor_direccion: input.cliente_direccion || null,

        // Snapshot Montos
        moneda: input.moneda,
        tipo_cambio: input.tipo_cambio || 1.0,
        op_gravadas,
        op_exoneradas,
        op_inafectas: 0,
        monto_igv,
        monto_icbper: 0,
        total_venta,

        estado_sunat: 'PENDIENTE',
        fecha_emision: new Date().toISOString()
      })
      .select()
      .single()

    if (compError) throw new Error(`Error creando comprobante: ${compError.message}`)

    // 7. INSERTAR DETALLES
    const detallesToInsert = input.items.map(item => ({
      comprobante_id: comprobante.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      codigo_afectacion_igv: ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')
    }))

    const { error: detError } = await supabase
      .from('comprobante_detalles')
      .insert(detallesToInsert)

    if (detError) {
      // Rollback manual (eliminamos comprobante huerfano)
      await supabase.from('comprobantes').delete().eq('id', comprobante.id)
      throw new Error('Error guardando detalles del comprobante')
    }

    // 8. INSERTAR PAGO (Vinculado)
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert({
        reserva_id: input.reserva_id,
        caja_turno_id: cajaTurnoId,
        comprobante_id: comprobante.id, // ¡Vinculación clave!
        metodo_pago: input.metodo_pago,
        moneda_pago: input.moneda,
        monto: input.monto,
        tipo_cambio_pago: input.tipo_cambio || 1.0,
        referencia_pago: input.referencia_pago,
        nota: input.nota,
        fecha_pago: new Date().toISOString()
      })

    if (pagoError) {
      // Rollback crítico (ya se emitió comprobante pero falló pago)
      logger.error('CRITICAL: Comprobante emitido sin pago', {
        action: 'cobrarYFacturar',
        reservaId: input.reserva_id,
        comprobanteId: comprobante.id,
        originalError: getErrorMessage(pagoError),
      })
      throw new Error('Error registrando el pago. Contacte a soporte.')
    }

    // 9. INSERTAR MOVIMIENTO DE CAJA (CRÍTICO PARA ARQUEO)
    // Sin esto, el dinero no "aparece" en la caja
    const { error: movError } = await supabase
      .from('caja_movimientos')
      .insert({
        caja_turno_id: cajaTurnoId,
        usuario_id: user.id,
        tipo: 'INGRESO',
        categoria: 'OTRO', // Usamos OTRO o podríamos definir COBRO_SERVICIO
        moneda: input.moneda,
        monto: input.monto,
        motivo: `Cobro Reserva ${reserva.codigo_reserva} - ${input.metodo_pago}`,
        comprobante_referencia: `${comprobante.serie}-${comprobante.numero}`
      })

    if (movError) {
      logger.error('CRITICAL: Pago registrado pero NO impactó caja', {
        action: 'cobrarYFacturar',
        reservaId: input.reserva_id,
        cajaTurnoId: cajaTurnoId,
        originalError: getErrorMessage(movError),
      })
      throw new Error(`Error crítico: El pago se registró pero NO se pudo guardar en caja. Detalle: ${movError.message}`)
    }

    revalidatePath('/rack')
    revalidatePath('/reservas')
    revalidatePath('/ocupaciones')
    revalidatePath(`/reservas/${input.reserva_id}`)

    return { success: true, comprobante, message: 'Cobro registrado y comprobante emitido' }

  } catch (error: unknown) {
    logger.error('Error en cobrarYFacturar', {
      action: 'cobrarYFacturar',
      reservaId: input.reserva_id,
      originalError: getErrorMessage(error),
    })
    return {
      success: false,
      error: getErrorMessage(error) || 'Error desconocido al procesar el cobro'
    }
  }
}

// ========================================
// HELPERS (Lectura)
// ========================================

export async function getSaldoPendiente(reserva_id: string): Promise<number> {
  const supabase = await createClient()

  // 1. Obtener precio pactado y FECHAS
  const { data: reserva } = await supabase
    .from('reservas')
    .select('precio_pactado, moneda_pactada, fecha_entrada, fecha_salida')
    .eq('id', reserva_id)
    .single()

  if (!reserva?.precio_pactado) return 0

  // 1.5 Calcular total real por estadía
  const totalEstadia = calcularTotalReserva(reserva as any)

  // 2. Obtener pagos
  const { data: pagos } = await supabase
    .from('pagos')
    .select('monto, moneda_pago, tipo_cambio_pago')
    .eq('reserva_id', reserva_id)

  // 3. Normalizar TODOS los pagos a la moneda de la reserva
  const totalPagado = pagos?.reduce((sum, p) => {
    let montoEnMonedaReserva = p.monto

    // Solo convertir si las monedas son diferentes
    if (reserva.moneda_pactada !== p.moneda_pago) {
      if (reserva.moneda_pactada === 'PEN' && p.moneda_pago === 'USD') {
        // Reserva en PEN, pago en USD → multiplicar por tipo de cambio
        montoEnMonedaReserva = p.monto * p.tipo_cambio_pago
      } else if (reserva.moneda_pactada === 'USD' && p.moneda_pago === 'PEN') {
        // Reserva en USD, pago en PEN → dividir por tipo de cambio
        montoEnMonedaReserva = p.monto / p.tipo_cambio_pago
      }
    }

    return sum + montoEnMonedaReserva
  }, 0) || 0

  return Math.max(0, totalEstadia - totalPagado)
}

export async function getPagosByReserva(reserva_id: string): Promise<Pago[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pagos')
    .select('*, comprobantes(serie, numero, tipo_comprobante)')
    .eq('reserva_id', reserva_id)
    .order('fecha_pago', { ascending: false })
  return data || []
}
