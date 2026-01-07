'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  serie_id: string
  
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
async function obtenerSiguienteCorrelativo(serie_id: string): Promise<{
  serie: string
  correlativo: number
  numero_completo: string
}> {
  const supabase = await createClient()

  // Llamar a la función de Postgres que incrementa atómicamente
  const { data, error } = await supabase
    .rpc('obtener_siguiente_correlativo', {
      p_serie_id: serie_id
    })

  if (error) {
    console.error('Error al obtener correlativo:', error)
    throw new Error('Error al generar número de comprobante')
  }

  if (!data) {
    throw new Error('No se pudo obtener correlativo')
  }

  // Obtener datos de la serie para construir número completo
  const { data: serieData, error: serieError } = await supabase
    .from('series_comprobante')
    .select('serie, correlativo_actual')
    .eq('id', serie_id)
    .single()

  if (serieError || !serieData) {
    throw new Error('Error al obtener datos de la serie')
  }

  const numero_completo = `${serieData.serie}-${serieData.correlativo_actual.toString().padStart(8, '0')}`

  return {
    serie: serieData.serie,
    correlativo: serieData.correlativo_actual,
    numero_completo
  }
}

// ========================================
// EMITIR COMPROBANTE
// ========================================
export async function emitirComprobante(input: EmitirComprobanteInput) {
  const supabase = await createClient()

  // 1. Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
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

  // 4. Calcular montos
  const subtotal = input.items.reduce((sum, item) => sum + item.subtotal, 0)
  const igv = subtotal * 0.18 // 18% IGV
  const total = subtotal + igv

  // 5. Obtener siguiente correlativo (atómico)
  const { serie, correlativo, numero_completo } = await obtenerSiguienteCorrelativo(input.serie_id)

  // 6. Crear comprobante
  const { data: comprobante, error: comprobanteError } = await supabase
    .from('comprobantes')
    .insert({
      serie_id: input.serie_id,
      tipo_comprobante: input.tipo_comprobante,
      serie_numero: serie,
      correlativo: correlativo,
      numero_completo: numero_completo,
      
      cliente_tipo_doc: input.cliente_tipo_doc,
      cliente_numero_doc: input.cliente_numero_doc,
      cliente_nombre: input.cliente_nombre,
      cliente_direccion: input.cliente_direccion,
      
      subtotal: subtotal,
      igv: igv,
      total: total,
      moneda: 'PEN',
      
      estado_sunat: 'PENDIENTE',
      fecha_emision: new Date().toISOString(),
      usuario_emisor_id: user.id,
      reserva_id: input.reserva_id,
      
      observaciones: input.observaciones
    })
    .select()
    .single()

  if (comprobanteError) {
    console.error('Error al crear comprobante:', comprobanteError)
    throw new Error('Error al emitir el comprobante')
  }

  // 7. Crear items del comprobante
  const itemsToInsert = input.items.map(item => ({
    comprobante_id: comprobante.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
    codigo_afectacion_igv: item.codigo_afectacion_igv || '10'
  }))

  const { error: itemsError } = await supabase
    .from('comprobante_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('Error al crear items:', itemsError)
    // Intentar eliminar el comprobante creado
    await supabase.from('comprobantes').delete().eq('id', comprobante.id)
    throw new Error('Error al registrar items del comprobante')
  }

  // 8. TODO: Enviar a SUNAT (integración futura)
  // - Generar XML
  // - Firmar con certificado digital
  // - Enviar a webservice de SUNAT
  // - Actualizar estado_sunat, hash_cpe, xml_firmado

  revalidatePath('/comprobantes')
  revalidatePath('/rack')

  return comprobante
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
      comprobante_items (
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

  // 3. TODO: Generar Nota de Crédito electrónica en SUNAT
  // - Crear nuevo comprobante tipo NOTA_CREDITO
  // - Referenciar al comprobante original
  // - Enviar a SUNAT

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
