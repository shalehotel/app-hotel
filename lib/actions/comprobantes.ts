'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { enviarComprobanteNubefact } from '@/lib/services/nubefact'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

// ========================================
// TYPES
// ========================================
export type Comprobante = {
  id: string
  serie_id: string
  tipo_comprobante: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_INTERNO'
  serie_numero: string
  correlativo: number
  numero_completo: string

  // Cliente
  cliente_tipo_doc: string
  cliente_numero_doc: string
  cliente_nombre: string
  cliente_direccion: string | null

  // Montos
  subtotal: number
  igv: number
  total: number
  moneda: 'PEN' | 'USD'

  // SUNAT
  estado_sunat: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ANULADO'
  hash_cpe: string | null
  xml_firmado: string | null
  pdf_url: string | null

  // Auditoría
  fecha_emision: string
  usuario_emisor_id: string
  reserva_id: string | null
}

export type EmitirComprobanteInput = {
  reserva_id: string
  tipo_comprobante: 'BOLETA' | 'FACTURA'
  serie: string  // Serie como texto, ej: 'B001', 'F001'

  // Datos del cliente
  cliente_tipo_doc: 'DNI' | 'RUC' | 'PASAPORTE' | 'CE'
  cliente_numero_doc: string
  cliente_nombre: string
  cliente_direccion?: string

  // Items del comprobante
  items: ComprobanteItem[]

  // Observaciones
  observaciones?: string
}

export type ComprobanteItem = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  codigo_afectacion_igv?: string // '10' = Gravado, '20' = Exonerado
}

// ========================================
// OBTENER SIGUIENTE CORRELATIVO (ATÓMICO)
// ========================================
async function obtenerSiguienteCorrelativo(serie: string): Promise<{
  correlativo: number
  numero_completo: string
}> {
  const supabase = await createClient()

  // Llamar a la función de Postgres que incrementa atómicamente
  const { data: correlativo, error } = await supabase
    .rpc('obtener_siguiente_correlativo', {
      p_serie: serie
    })

  if (error) {
    console.error('Error al obtener correlativo:', error)
    throw new Error('Error al generar número de comprobante')
  }

  if (!correlativo) {
    throw new Error('No se pudo obtener correlativo')
  }

  const numero_completo = `${serie}-${correlativo.toString().padStart(8, '0')}`

  return {
    correlativo: correlativo,
    numero_completo
  }
}

// ========================================
// EMITIR COMPROBANTE
// ========================================
export async function emitirComprobante(input: EmitirComprobanteInput) {
  const supabase = await createClient()

  // 1. Obtener turno de caja activo
  const { data: turnoActivo, error: turnoError } = await supabase
    .from('caja_turnos')
    .select('id')
    .eq('estado', 'ABIERTA')
    .single()

  if (turnoError || !turnoActivo) {
    throw new Error('No hay un turno de caja activo')
  }

  // 2. Validar que la reserva existe
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .select('id, precio_pactado')
    .eq('id', input.reserva_id)
    .single()

  if (reservaError || !reserva) {
    throw new Error('Reserva no encontrada')
  }

  // 3. Validar items
  if (!input.items || input.items.length === 0) {
    throw new Error('Debe agregar al menos un item al comprobante')
  }

  // 4. Obtener configuración fiscal
  const config = await getHotelConfig()
  
  // Validar configuración fiscal completa
  if (!config.ruc || config.ruc === '20000000001') {
    throw new Error('Debe configurar el RUC de su empresa en Configuración antes de emitir comprobantes')
  }
  
  // Validar formato de RUC (11 dígitos, comienza con 10, 15, 17 o 20)
  const rucPattern = /^(10|15|17|20)[0-9]{9}$/
  if (!rucPattern.test(config.ruc)) {
    throw new Error(
      'El RUC configurado no tiene formato válido. ' +
      'Debe tener 11 dígitos e iniciar con 10, 15, 17 o 20'
    )
  }
  
  if (!config.razon_social || config.razon_social === 'MI HOTEL S.A.C.') {
    throw new Error('Debe configurar la razón social de su empresa en Configuración')
  }
  
  if (!config.direccion_fiscal) {
    throw new Error('Debe configurar la dirección fiscal en Configuración')
  }
  
  // Validar documento del cliente según tipo de comprobante
  if (input.tipo_comprobante === 'FACTURA') {
    if (input.cliente_tipo_doc !== 'RUC') {
      throw new Error('Las facturas requieren que el cliente tenga RUC')
    }
    if (input.cliente_numero_doc.length !== 11) {
      throw new Error('El RUC del cliente debe tener 11 dígitos')
    }
  } else if (input.tipo_comprobante === 'BOLETA') {
    if (input.cliente_tipo_doc === 'DNI' && input.cliente_numero_doc.length !== 8) {
      throw new Error('El DNI debe tener 8 dígitos')
    }
  }
  
  // Calcular totales según configuración
  const TASA_IGV = config.es_exonerado_igv ? 0 : (config.tasa_igv || 18.00) / 100
  
  // 5. Calcular montos fiscales
  let op_gravadas = 0
  let op_exoneradas = 0
  let monto_igv = 0
  
  for (const item of input.items) {
    const codigoAfectacion = config.es_exonerado_igv ? '20' : (item.codigo_afectacion_igv || '10')
    
    if (codigoAfectacion === '10') {
      // Gravado: el subtotal incluye IGV, hay que desglosa
      const base = item.subtotal / (1 + TASA_IGV)
      op_gravadas += base
      monto_igv += (item.subtotal - base)
    } else {
      // Exonerado o Inafecto
      op_exoneradas += item.subtotal
    }
  }
  
  const total_venta = op_gravadas + monto_igv + op_exoneradas

  // 6. Obtener siguiente correlativo (atómico)
  const { correlativo, numero_completo } = await obtenerSiguienteCorrelativo(input.serie)

  // 7. Crear comprobante con totales calculados
  const { data: comprobante, error: comprobanteError } = await supabase
    .from('comprobantes')
    .insert({
      turno_caja_id: turnoActivo.id,
      reserva_id: input.reserva_id,
      tipo_comprobante: input.tipo_comprobante,
      serie: input.serie,
      numero: correlativo,

      receptor_tipo_doc: input.cliente_tipo_doc,
      receptor_nro_doc: input.cliente_numero_doc,
      receptor_razon_social: input.cliente_nombre,
      receptor_direccion: input.cliente_direccion,

      moneda: 'PEN',
      tipo_cambio: 1.000,
      op_gravadas: op_gravadas,
      op_exoneradas: op_exoneradas,
      op_inafectas: 0.00,
      monto_igv: monto_igv,
      monto_icbper: 0.00,
      total_venta: total_venta,

      estado_sunat: 'PENDIENTE',
      fecha_emision: new Date().toISOString(),
    })
    .select()
    .single()

  if (comprobanteError) {
    console.error('Error al crear comprobante:', comprobanteError)
    throw new Error('Error al emitir el comprobante')
  }

  // 8. Crear items del comprobante
  const itemsToInsert = input.items.map(item => ({
    comprobante_id: comprobante.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
    codigo_afectacion_igv: config.es_exonerado_igv ? '20' : (item.codigo_afectacion_igv || '10')
  }))

  const { error: itemsError } = await supabase
    .from('comprobante_detalles')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('Error al crear items:', itemsError)
    // Intentar eliminar el comprobante creado
    await supabase.from('comprobantes').delete().eq('id', comprobante.id)
    throw new Error('Error al registrar items del comprobante')
  }

  // 9. Enviar a NubeFact (si está configurado)
  try {
    const respuesta = await enviarComprobanteNubefact({
      tipo_comprobante: input.tipo_comprobante,
      serie: input.serie,
      numero: correlativo,
      
      cliente_tipo_documento: input.cliente_tipo_doc,
      cliente_numero_documento: input.cliente_numero_doc,
      cliente_denominacion: input.cliente_nombre,
      cliente_direccion: input.cliente_direccion,
      
      fecha_emision: new Date().toISOString().split('T')[0],
      moneda: 'PEN',
      tipo_cambio: 1.000,
      porcentaje_igv: config.tasa_igv,
      total_gravada: op_gravadas,
      total_exonerada: op_exoneradas,
      total_igv: monto_igv,
      total: total_venta,
      
      items: input.items.map(item => ({
        unidad_de_medida: 'NIU',
        codigo: 'HOSP-001',
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        valor_unitario: item.precio_unitario,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        tipo_de_igv: config.es_exonerado_igv ? 2 : 1
      }))
    })
    
    if (respuesta.success && respuesta.aceptada_por_sunat) {
      // Actualizar con respuesta de NubeFact
      await supabase
        .from('comprobantes')
        .update({
          estado_sunat: 'ACEPTADO',
          hash_cpe: respuesta.hash,
          xml_url: respuesta.enlace,
          cdr_url: respuesta.enlace_del_cdr,
          external_id: respuesta.enlace_pdf
        })
        .eq('id', comprobante.id)
      
      logger.info('Comprobante aceptado por SUNAT', {
        comprobante_id: comprobante.id,
        hash: respuesta.hash
      })
    } else {
      // Marcar como rechazado si SUNAT lo rechazó
      await supabase
        .from('comprobantes')
        .update({
          estado_sunat: 'RECHAZADO',
          observaciones: respuesta.errors || respuesta.mensaje
        })
        .eq('id', comprobante.id)
      
      logger.warn('Comprobante rechazado por SUNAT', {
        comprobante_id: comprobante.id,
        error: respuesta.errors
      })
    }
  } catch (error) {
    // Si falla el envío a NubeFact, el comprobante queda PENDIENTE
    logger.error('Error al enviar a NubeFact', {
      comprobante_id: comprobante.id,
      error: getErrorMessage(error)
    })
    // No lanzar error, el comprobante se puede reenviar después
  }

  revalidatePath('/comprobantes')
  revalidatePath('/rack')

  return comprobante
}

// ========================================
// OBTENER HISTORIAL COMPLETO DE COMPROBANTES
// ========================================
export async function getHistorialComprobantes(filtros?: {
  tipo_comprobante?: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'TODAS'
  estado_sunat?: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ANULADO' | 'TODOS'
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('vw_historial_comprobantes')
    .select(`
      *,
      reserva_id,
      codigo_reserva
    `)

  // Aplicar filtros
  if (filtros?.tipo_comprobante && filtros.tipo_comprobante !== 'TODAS') {
    query = query.eq('tipo_comprobante', filtros.tipo_comprobante)
  }

  if (filtros?.estado_sunat && filtros.estado_sunat !== 'TODOS') {
    query = query.eq('estado_sunat', filtros.estado_sunat)
  }

  if (filtros?.fecha_desde) {
    query = query.gte('fecha_emision', filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_emision', filtros.fecha_hasta)
  }

  if (filtros?.busqueda) {
    query = query.or(`cliente_nombre.ilike.%${filtros.busqueda}%,numero_completo.ilike.%${filtros.busqueda}%,cliente_doc.ilike.%${filtros.busqueda}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener historial:', error)
    throw new Error('Error al cargar historial de comprobantes')
  }

  // Concatenar serie y numero para crear numero_completo
  const comprobantesConNumeroCompleto = (data || []).map((c: any) => ({
    ...c,
    numero_completo: `${c.serie}-${String(c.numero).padStart(8, '0')}`
  }))

  return comprobantesConNumeroCompleto
}

// ========================================
// OBTENER DETALLE COMPLETO DE UN COMPROBANTE
// ========================================
export async function getDetalleComprobante(comprobante_id: string) {
  const supabase = await createClient()

  // 1. Obtener datos del comprobante
  const { data: comprobante, error: comprobanteError } = await supabase
    .from('comprobantes')
    .select(`
      *,
      reservas (
        codigo_reserva,
        habitaciones (
          numero,
          piso
        )
      )
    `)
    .eq('id', comprobante_id)
    .single()

  if (comprobanteError || !comprobante) {
    throw new Error('Comprobante no encontrado')
  }

  // 2. Obtener items/detalles
  const { data: detalles, error: detallesError } = await supabase
    .from('comprobante_detalles')
    .select('*')
    .eq('comprobante_id', comprobante_id)
    .order('id', { ascending: true })

  if (detallesError) {
    console.error('Error al obtener detalles:', detallesError)
    throw new Error('Error al cargar detalles del comprobante')
  }

  return {
    comprobante,
    detalles: detalles || []
  }
}

// ========================================
// OBTENER ESTADÍSTICAS DE FACTURACIÓN
// ========================================
export async function getEstadisticasFacturacion(fecha_desde?: string, fecha_hasta?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('vw_historial_comprobantes')
    .select('tipo_comprobante, total_venta, estado_sunat')

  if (fecha_desde) {
    query = query.gte('fecha_emision', fecha_desde)
  }

  if (fecha_hasta) {
    query = query.lte('fecha_emision', fecha_hasta)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error al obtener estadísticas:', error)
    return {
      total_boletas: 0,
      total_facturas: 0,
      total_anuladas: 0,
      total_pendientes: 0,
      monto_total: 0
    }
  }

  const stats = {
    total_boletas: data.filter(c => c.tipo_comprobante === 'BOLETA' && c.estado_sunat !== 'ANULADO').length,
    total_facturas: data.filter(c => c.tipo_comprobante === 'FACTURA' && c.estado_sunat !== 'ANULADO').length,
    total_anuladas: data.filter(c => c.estado_sunat === 'ANULADO').length,
    total_pendientes: data.filter(c => c.estado_sunat === 'PENDIENTE').length,
    monto_total: data
      .filter(c => c.estado_sunat !== 'ANULADO')
      .reduce((sum, c) => sum + (c.total_venta || 0), 0)
  }

  return stats
}

// ========================================
// OBTENER COMPROBANTES DE UNA RESERVA
// ========================================
export async function getComprobantesByReserva(reserva_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comprobantes')
    .select(`
      *,
      series_comprobante (
        serie,
        tipo_comprobante
      ),
      comprobante_detalles (
        descripcion,
        cantidad,
        precio_unitario,
        subtotal
      )
    `)
    .eq('reserva_id', reserva_id)
    .order('fecha_emision', { ascending: false })

  if (error) {
    console.error('Error al obtener comprobantes:', error)
    throw new Error('Error al obtener comprobantes')
  }

  return data || []
}

// ========================================
// OBTENER SERIES DISPONIBLES PARA EMITIR
// ========================================
export async function getSeriesDisponibles(tipo_comprobante: 'BOLETA' | 'FACTURA') {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('series_comprobante')
    .select(`
      id,
      serie,
      tipo_comprobante,
      correlativo_actual,
      cajas (
        nombre,
        estado
      )
    `)
    .eq('tipo_comprobante', tipo_comprobante)
    .eq('cajas.estado', true)
    .order('serie', { ascending: true })

  if (error) {
    console.error('Error al obtener series:', error)
    throw new Error('Error al obtener series disponibles')
  }

  return data || []
}

// ========================================
// ANULAR COMPROBANTE (NOTA DE CRÉDITO)
// ========================================
export async function anularComprobante(comprobante_id: string, motivo: string) {
  const supabase = await createClient()

  // 1. Obtener comprobante original
  const { data: comprobante, error: comprobanteError } = await supabase
    .from('comprobantes')
    .select('*')
    .eq('id', comprobante_id)
    .single()

  if (comprobanteError || !comprobante) {
    throw new Error('Comprobante no encontrado')
  }

  if (comprobante.estado_sunat === 'ANULADO') {
    throw new Error('El comprobante ya está anulado')
  }

  // 2. Marcar como anulado
  const { error: updateError } = await supabase
    .from('comprobantes')
    .update({
      estado_sunat: 'ANULADO',
      observaciones: `${comprobante.observaciones || ''}\nANULADO: ${motivo}`
    })
    .eq('id', comprobante_id)

  if (updateError) {
    console.error('Error al anular comprobante:', updateError)
    throw new Error('Error al anular el comprobante')
  }

  // 3. TODO: Generar Nota de Crédito electrónica vía NubeFact
  // - Crear nuevo comprobante tipo NOTA_CREDITO
  // - Referenciar al comprobante original
  // - Enviar a NubeFact con tipo_nota_credito='01'

  revalidatePath('/comprobantes')

  return { success: true, message: 'Comprobante anulado correctamente' }
}

// ========================================
// OBTENER COMPROBANTES PENDIENTES DE ENVÍO A SUNAT
// ========================================
export async function getComprobantesPendientesSunat() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comprobantes')
    .select('*')
    .eq('estado_sunat', 'PENDIENTE')
    .order('fecha_emision', { ascending: true })

  if (error) {
    console.error('Error al obtener comprobantes pendientes:', error)
    return []
  }

  return data || []
}

// ========================================
// EMITIR NOTA DE CRÉDITO PARCIAL
// ========================================
// Tipo 07: Devolución parcial por ítem (usado para acortamiento de estadía)
export type EmitirNotaCreditoInput = {
  comprobante_original_id: string
  monto_devolucion: number
  motivo: string
  dias_devueltos?: number
}

export async function emitirNotaCreditoParcial(input: EmitirNotaCreditoInput) {
  const supabase = await createClient()

  try {
    // 1. Obtener comprobante original
    const { data: comprobanteOriginal, error: comprobanteError } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('id', input.comprobante_original_id)
      .single()

    if (comprobanteError || !comprobanteOriginal) {
      return { success: false, error: 'Comprobante original no encontrado' }
    }

    if (comprobanteOriginal.estado_sunat === 'ANULADO') {
      return { success: false, error: 'No se puede emitir NC sobre comprobante anulado' }
    }

    // 2. Obtener turno de caja activo
    const { data: turnoActivo, error: turnoError } = await supabase
      .from('caja_turnos')
      .select('id')
      .eq('estado', 'ABIERTA')
      .single()

    if (turnoError || !turnoActivo) {
      return { success: false, error: 'No hay un turno de caja activo' }
    }

    // 3. Obtener serie de NC (buscar serie NC disponible)
    const { data: serieNC } = await supabase
      .from('series_comprobante')
      .select('serie')
      .eq('tipo_comprobante', 'NOTA_CREDITO')
      .limit(1)
      .single()

    if (!serieNC) {
      return { success: false, error: 'No hay serie de Nota de Crédito configurada' }
    }

    // 4. Obtener siguiente correlativo
    const { data: correlativo, error: corrError } = await supabase
      .rpc('obtener_siguiente_correlativo', { p_serie: serieNC.serie })

    if (corrError || !correlativo) {
      return { success: false, error: 'Error al obtener correlativo' }
    }

    // 5. Calcular montos de la NC
    const monto_devolucion = input.monto_devolucion
    const base_imponible = monto_devolucion / 1.18  // Descontar IGV
    const igv = monto_devolucion - base_imponible

    // 6. Crear la Nota de Crédito
    const { data: notaCredito, error: ncError } = await supabase
      .from('comprobantes')
      .insert({
        turno_caja_id: turnoActivo.id,
        reserva_id: comprobanteOriginal.reserva_id,
        tipo_comprobante: 'NOTA_CREDITO',
        serie: serieNC.serie,
        numero: correlativo,

        // Datos del receptor (mismo que original)
        receptor_tipo_doc: comprobanteOriginal.receptor_tipo_doc,
        receptor_nro_doc: comprobanteOriginal.receptor_nro_doc,
        receptor_razon_social: comprobanteOriginal.receptor_razon_social,
        receptor_direccion: comprobanteOriginal.receptor_direccion,

        // Montos (negativos conceptualmente, pero se guardan positivos)
        moneda: comprobanteOriginal.moneda,
        tipo_cambio: 1.000,
        op_gravadas: base_imponible,
        op_exoneradas: 0.00,
        op_inafectas: 0.00,
        monto_igv: igv,
        monto_icbper: 0.00,
        total_venta: monto_devolucion,

        // Referencia al comprobante original
        nota_credito_ref_id: comprobanteOriginal.id,

        estado_sunat: 'PENDIENTE',
        fecha_emision: new Date().toISOString(),
      })
      .select()
      .single()

    if (ncError) {
      console.error('Error al crear NC:', ncError)
      return { success: false, error: 'Error al emitir Nota de Crédito' }
    }

    // 7. Crear detalle de la NC
    const descripcionItem = input.dias_devueltos
      ? `Devolución por acortamiento de estadía (${input.dias_devueltos} noches)`
      : `Devolución parcial: ${input.motivo}`

    await supabase
      .from('comprobante_detalles')
      .insert({
        comprobante_id: notaCredito.id,
        descripcion: descripcionItem,
        cantidad: input.dias_devueltos || 1,
        precio_unitario: base_imponible / (input.dias_devueltos || 1),
        subtotal: base_imponible,
        codigo_afectacion_igv: '10'  // Gravado
      })

    revalidatePath('/comprobantes')

    const numeroCompleto = `${serieNC.serie}-${String(correlativo).padStart(8, '0')}`

    return {
      success: true,
      notaCredito: {
        id: notaCredito.id,
        numero: numeroCompleto,
        monto: monto_devolucion
      },
      mensaje: `Nota de Crédito ${numeroCompleto} emitida por S/${monto_devolucion.toFixed(2)}`
    }

  } catch (error) {
    console.error('Error en emitirNotaCreditoParcial:', error)
    return { success: false, error: 'Error al procesar la Nota de Crédito' }
  }
}
