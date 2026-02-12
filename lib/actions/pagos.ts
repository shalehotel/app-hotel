'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { enviarComprobanteNubefact } from '@/lib/services/nubefact'
import { calcularTotalReserva, getFechaEmisionPeru } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'
import { requireOperador } from '@/lib/auth/permissions'

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

  // Idempotencia
  idempotencyKey?: string // UUID único para evitar duplicados
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
// FUNCIÓN ENTERPRISE: COBRAR Y FACTURAR (ATÓMICO)
// Usa RPC transaccional para garantizar ACID
// ========================================
export async function cobrarYFacturarAtomico(input: CobrarYFacturarInput) {
  await requireOperador()
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

    // 3. Validar que la serie existe
    const { data: serieValida, error: serieError } = await supabase
      .from('series_comprobante')
      .select('id, tipo_comprobante')
      .eq('serie', input.serie)
      .eq('tipo_comprobante', input.tipo_comprobante)
      .single()

    if (serieError || !serieValida) {
      throw new Error(`La serie ${input.serie} no existe para el tipo ${input.tipo_comprobante}`)
    }

    // 4. Obtener configuración y calcular IGV
    const config = await getHotelConfig()
    if (!config) {
      throw new Error('⚠️ Configure su hotel en /configuracion antes de emitir comprobantes')
    }
    if (!config.facturacion_activa) {
      throw new Error('La facturación electrónica no está activada')
    }
    if (!config.ruc || config.ruc === '20000000001') {
      throw new Error('Debe configurar un RUC válido antes de emitir comprobantes')
    }

    // VALIDACIÓN CRÍTICA: Formato de documentos según tipo
    if (input.cliente_tipo_doc === 'RUC') {
      if (!/^(10|15|17|20)\d{9}$/.test(input.cliente_numero_doc)) {
        throw new Error('RUC inválido. Debe tener 11 dígitos y empezar con 10, 15, 17 o 20')
      }
    } else if (input.cliente_tipo_doc === 'DNI') {
      if (!/^\d{8}$/.test(input.cliente_numero_doc)) {
        throw new Error('DNI inválido. Debe tener exactamente 8 dígitos')
      }
    }

    const TASA_IGV = (config.tasa_igv || 18.00) / 100
    const ES_EXONERADO = config.es_exonerado_igv

    let op_gravadas = 0
    let op_exoneradas = 0
    let monto_igv = 0
    let total_venta = 0

    for (const item of input.items) {
      total_venta += item.subtotal
      const codigoAfectacion = ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')
      if (codigoAfectacion === '10') {
        const base = item.subtotal / (1 + TASA_IGV)
        op_gravadas += base
        monto_igv += (item.subtotal - base)
      } else {
        op_exoneradas += item.subtotal
      }
    }

    // VALIDACIÓN CRÍTICA: Boleta >700 PEN requiere RUC según normativa SUNAT
    if (input.tipo_comprobante === 'BOLETA' && 
        input.moneda === 'PEN' && 
        total_venta > 700 &&
        input.cliente_tipo_doc !== 'RUC') {
      throw new Error(
        'Las boletas mayores a S/ 700.00 requieren el RUC del cliente. ' +
        'Por favor solicite el RUC o emita una FACTURA en su lugar.'
      )
    }

    // 5. Generar idempotency key para prevenir duplicados
    const idempotencyKey = `${input.reserva_id}-${Date.now()}`

    // 6. LLAMAR RPC ATÓMICO (todo en una transacción)
    const { data: resultado, error: rpcError } = await supabase.rpc('registrar_cobro_completo', {
      p_turno_caja_id: cajaTurnoId,
      p_reserva_id: input.reserva_id,
      p_tipo_comprobante: input.tipo_comprobante,
      p_serie: input.serie,
      p_receptor_tipo_doc: input.cliente_tipo_doc,
      p_receptor_nro_doc: input.cliente_numero_doc,
      p_receptor_razon_social: input.cliente_nombre,
      p_receptor_direccion: input.cliente_direccion || '',
      p_moneda: input.moneda,
      p_tipo_cambio: input.tipo_cambio || 1.0,
      p_op_gravadas: Number(op_gravadas.toFixed(2)),
      p_op_exoneradas: Number(op_exoneradas.toFixed(2)),
      p_monto_igv: Number(monto_igv.toFixed(2)),
      p_total_venta: Number(total_venta.toFixed(2)),
      p_metodo_pago: input.metodo_pago,
      p_monto_pago: input.monto,
      p_referencia_pago: input.referencia_pago || '',
      p_nota: input.nota || '',
      p_idempotency_key: idempotencyKey,
      p_usuario_id: user.id
    })

    if (rpcError) {
      logger.error('Error en RPC registrar_cobro_completo', {
        action: 'cobrarYFacturarAtomico',
        reservaId: input.reserva_id,
        originalError: rpcError.message
      })
      throw new Error(`Error en transacción: ${rpcError.message}`)
    }

    if (!resultado?.success) {
      throw new Error(resultado?.error || 'Error desconocido en RPC')
    }

    // Si fue duplicado, retornar sin enviar a NubeFact
    if (resultado.duplicado) {
      logger.info('Operación duplicada detectada (idempotencia)', {
        action: 'cobrarYFacturarAtomico',
        pagoId: resultado.pago_id
      })
      return { success: true, message: 'Operación ya procesada', duplicado: true }
    }

    // 7. Insertar detalles del comprobante (CRÍTICO para reenvíos/correcciones)
    const detallesToInsert = input.items.map(item => ({
      comprobante_id: resultado.comprobante_id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      codigo_afectacion_igv: ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')
    }))

    const { error: detError } = await supabase.from('comprobante_detalles').insert(detallesToInsert)
    if (detError) {
      logger.error('Error guardando detalles del comprobante', {
        comprobanteId: resultado.comprobante_id,
        error: detError.message
      })
      // No lanzamos error porque el comprobante ya se creó
    }

    // 8. Enviar a NubeFact

    try {
      // Usar zona horaria de Perú (Vercel corre en UTC, SUNAT requiere fecha Perú)
      const fechaFormateada = getFechaEmisionPeru()

      const respuestaNubefact = await enviarComprobanteNubefact({
        tipo_comprobante: input.tipo_comprobante,
        serie: input.serie,
        numero: resultado.correlativo,
        cliente_tipo_documento: input.cliente_tipo_doc,
        cliente_numero_documento: input.cliente_numero_doc,
        cliente_denominacion: input.cliente_nombre,
        cliente_direccion: input.cliente_direccion,
        fecha_emision: fechaFormateada,
        moneda: input.moneda,
        tipo_cambio: input.tipo_cambio || 1.0,
        porcentaje_igv: config.tasa_igv || 18,
        total_gravada: op_gravadas,
        total_exonerada: op_exoneradas,
        total_igv: monto_igv,
        total: total_venta,
        items: input.items.map(item => {
          const esExonerado = ES_EXONERADO || item.codigo_afectacion_igv === '20'
          const tasaIgv = esExonerado ? 0 : TASA_IGV
          const valorUnitario = item.precio_unitario / (1 + tasaIgv)
          const subtotalItem = valorUnitario * item.cantidad
          const igvLinea = subtotalItem * tasaIgv
          const totalLinea = subtotalItem + igvLinea

          return {
            unidad_de_medida: 'ZZ',
            codigo: '90101501',
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            valor_unitario: Number(valorUnitario.toFixed(10)),
            precio_unitario: Number(item.precio_unitario.toFixed(2)),
            subtotal: Number(subtotalItem.toFixed(2)),
            tipo_de_igv: esExonerado ? 8 : 1,
            igv: Number(igvLinea.toFixed(2)),
            total: Number(totalLinea.toFixed(2))
          }
        })
      })

      const estadoFinal = respuestaNubefact.success
        ? (respuestaNubefact.aceptada_por_sunat ? 'ACEPTADO' : 'PENDIENTE')
        : 'RECHAZADO'

      await supabase
        .from('comprobantes')
        .update({
          estado_sunat: estadoFinal,
          hash_cpe: respuestaNubefact.hash,
          xml_url: respuestaNubefact.enlace,
          cdr_url: respuestaNubefact.enlace_del_cdr,
          pdf_url: respuestaNubefact.enlace_pdf,
          observaciones: respuestaNubefact.mensaje || respuestaNubefact.errors
        })
        .eq('id', resultado.comprobante_id)

    } catch (nubefactError) {
      logger.warn('Error NubeFact (comprobante PENDIENTE)', {
        action: 'cobrarYFacturarAtomico',
        comprobanteId: resultado.comprobante_id,
        error: getErrorMessage(nubefactError)
      })
    }

    revalidatePath('/rack')
    revalidatePath('/reservas')
    revalidatePath('/ocupaciones')
    revalidatePath(`/reservas/${input.reserva_id}`)

    return {
      success: true,
      comprobante_id: resultado.comprobante_id,
      numero_completo: resultado.numero_completo,
      message: 'Cobro registrado y comprobante emitido (transacción ACID)'
    }

  } catch (error: unknown) {
    logger.error('Error en cobrarYFacturarAtomico', {
      action: 'cobrarYFacturarAtomico',
      reservaId: input.reserva_id,
      originalError: getErrorMessage(error)
    })
    return {
      success: false,
      error: getErrorMessage(error) || 'Error desconocido al procesar el cobro'
    }
  }
}

// ========================================
// FUNCIÓN PRINCIPAL: COBRAR Y FACTURAR
// ========================================
export async function cobrarYFacturar(input: CobrarYFacturarInput) {
  await requireOperador()
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
      .eq('tipo_comprobante', input.tipo_comprobante)
      .single()

    if (serieError || !serieValida) {
      if (serieError && serieError.code !== 'PGRST116') {
        console.error('Error DB buscando serie:', serieError)
      }
      throw new Error(`La serie ${input.serie} no existe para el tipo ${input.tipo_comprobante}. Verifique Configuración > Cajas`)
    }

    // 4. Obtener Correlativo (Atómico) - YA NO ES NECESARIO PORQUE EL RPC LO HACE
    // 5. Calcular Totales Fiscales
    // Obtener configuración dinámica del hotel
    const config = await getHotelConfig()
    if (!config) {
      throw new Error('⚠️ Configure su hotel en /configuracion antes de emitir comprobantes')
    }

    // Validar que la facturación electrónica esté activa
    if (!config.facturacion_activa) {
      throw new Error('La facturación electrónica no está activada. Active esta opción en Configuración > General.')
    }

    // Validar RUC configurado
    if (!config.ruc || config.ruc === '20000000001') {
      throw new Error('Debe configurar un RUC válido en Configuración antes de emitir comprobantes.')
    }

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

    // ========================================================================
    // USAR RPC TRANSACCIONAL CON IDEMPOTENCIA
    // ========================================================================
    const { data: rpcResult, error: rpcError } = await supabase.rpc('registrar_cobro_completo', {
      p_turno_caja_id: cajaTurnoId,
      p_reserva_id: input.reserva_id,
      p_tipo_comprobante: input.tipo_comprobante,
      p_serie: input.serie,
      p_receptor_tipo_doc: input.cliente_tipo_doc,
      p_receptor_nro_doc: input.cliente_numero_doc,
      p_receptor_razon_social: input.cliente_nombre,
      p_receptor_direccion: input.cliente_direccion || null,
      p_moneda: input.moneda,
      p_tipo_cambio: input.tipo_cambio || 1.0,
      p_op_gravadas: op_gravadas,
      p_op_exoneradas: op_exoneradas,
      p_monto_igv: monto_igv,
      p_total_venta: total_venta,
      p_metodo_pago: input.metodo_pago,
      p_monto_pago: input.monto,
      p_referencia_pago: input.referencia_pago || null,
      p_nota: input.nota || null,
      p_idempotency_key: input.idempotencyKey || null, // ¡CLAVE IDEMPOTENCIA!
      p_usuario_id: user.id
    })

    if (rpcError) {
      console.error('Error RPC registrar_cobro_completo:', rpcError)
      throw new Error(`Error procesando cobro: ${rpcError.message}`)
    }

    if (!rpcResult.success) {
      throw new Error(rpcResult.error || 'Error desconocido en RPC')
    }

    // Recuperar datos retornados por RPC para Nubefact
    // El RPC devuelve: { success: true, comprobante_id, pago_id, numero_completo, correlativo }
    const comprobante = {
      id: rpcResult.comprobante_id,
      serie: input.serie,
      numero: rpcResult.correlativo
    }

    const correlativo = rpcResult.correlativo

    // ========================================================================
    // GUARDAR DETALLES DEL COMPROBANTE (CRÍTICO para reenvíos/correcciones)
    // ========================================================================
    const detallesToInsert = input.items.map(item => ({
      comprobante_id: rpcResult.comprobante_id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      codigo_afectacion_igv: ES_EXONERADO ? '20' : (item.codigo_afectacion_igv || '10')
    }))

    const { error: detError } = await supabase.from('comprobante_detalles').insert(detallesToInsert)
    if (detError) {
      logger.error('Error guardando detalles del comprobante', {
        comprobanteId: rpcResult.comprobante_id,
        error: detError.message
      })
      // No lanzamos error porque el comprobante ya se creó
    }

    // 10. ENVIAR A NUBEFACT (Facturación Electrónica)

    // Esto se hace DESPUÉS de guardar todo localmente para no perder datos si Nubefact falla
    try {
      // Usar zona horaria de Perú (Vercel corre en UTC, SUNAT requiere fecha Perú)
      const fechaFormateada = getFechaEmisionPeru()

      const respuestaNubefact = await enviarComprobanteNubefact({
        tipo_comprobante: input.tipo_comprobante,
        serie: input.serie,
        numero: correlativo,

        cliente_tipo_documento: input.cliente_tipo_doc,
        cliente_numero_documento: input.cliente_numero_doc,
        cliente_denominacion: input.cliente_nombre,
        cliente_direccion: input.cliente_direccion,

        fecha_emision: fechaFormateada,
        moneda: input.moneda,
        tipo_cambio: input.tipo_cambio || 1.0,
        porcentaje_igv: config.tasa_igv || 18,
        total_gravada: op_gravadas,
        total_exonerada: op_exoneradas,
        total_igv: monto_igv,
        total: total_venta,

        items: input.items.map(item => {
          const esExonerado = ES_EXONERADO || item.codigo_afectacion_igv === '20'
          const tasaIgv = esExonerado ? 0 : TASA_IGV
          // valor_unitario = precio sin IGV
          const valorUnitario = item.precio_unitario / (1 + tasaIgv)
          // subtotal = valor_unitario * cantidad (sin IGV)
          const subtotalItem = valorUnitario * item.cantidad
          // igv de la línea
          const igvLinea = subtotalItem * tasaIgv
          // total de la línea
          const totalLinea = subtotalItem + igvLinea

          return {
            unidad_de_medida: 'ZZ', // ZZ = Servicio
            codigo: '90101501', // Código SUNAT para servicios de alojamiento
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            valor_unitario: Number(valorUnitario.toFixed(10)),
            precio_unitario: Number(item.precio_unitario.toFixed(2)),
            subtotal: Number(subtotalItem.toFixed(2)),
            tipo_de_igv: esExonerado ? 8 : 1, // 1=Gravado, 8=Exonerado
            igv: Number(igvLinea.toFixed(2)),
            total: Number(totalLinea.toFixed(2))
          }
        })
      })

      if (respuestaNubefact.success) {
        // ÉXITO: Tenemos respuesta válida de Nubefact (PDF generado)
        // Puede estar ACEPTADO o PENDIENTE (en proceso/demo)
        const estadoFinal = respuestaNubefact.aceptada_por_sunat ? 'ACEPTADO' : 'PENDIENTE'

        // Actualizar comprobante con datos de Nubefact
        await supabase
          .from('comprobantes')
          .update({
            estado_sunat: estadoFinal,
            hash_cpe: respuestaNubefact.hash,
            xml_url: respuestaNubefact.enlace,
            cdr_url: respuestaNubefact.enlace_del_cdr,
            pdf_url: respuestaNubefact.enlace_pdf, // Guardamos PDF para prevenir "null"
            external_id: respuestaNubefact.enlace_pdf, // Usar external_id como backup del link
            observaciones: respuestaNubefact.mensaje // Guardamos "Enviado a SUNAT (En Proceso)" o similar
          })
          .eq('id', comprobante.id)

        logger.info(`Comprobante procesado exitosamente (${estadoFinal})`, {
          action: 'cobrarYFacturar',
          comprobanteId: comprobante.id,
          hash: respuestaNubefact.hash
        })
      } else if (respuestaNubefact.es_error_red) {
        // ERROR DE RED: Queda PENDIENTE
        // No marcamos como RECHAZADO para permitir reintentos con el mismo número
        await supabase
          .from('comprobantes')
          .update({
            // No cambiamos estado_sunat, queda en PENDIENTE por defecto
            observaciones: `Error de conexión: ${respuestaNubefact.errors || respuestaNubefact.mensaje} (Pendiente de Reintento)`
          })
          .eq('id', comprobante.id)

        logger.warn('Error de red al enviar a Nubefact (quedará PENDIENTE)', {
          action: 'cobrarYFacturar',
          comprobanteId: comprobante.id,
          error: respuestaNubefact.errors
        })

      } else {
        // FALLO: Nubefact o SUNAT rechazaron explícitamente (RECHAZO FISCAL)
        // Marcar como rechazado
        await supabase
          .from('comprobantes')
          .update({
            estado_sunat: 'RECHAZADO',
            observaciones: respuestaNubefact.errors || respuestaNubefact.mensaje
          })
          .eq('id', comprobante.id)

        logger.warn('Comprobante rechazado por SUNAT/Nubefact', {
          action: 'cobrarYFacturar',
          comprobanteId: comprobante.id,
          error: respuestaNubefact.errors
        })
      }
    } catch (nubefactError) {
      // Si falla Nubefact, el comprobante queda PENDIENTE (no bloqueamos el pago)
      logger.error('Error al enviar a Nubefact (comprobante queda PENDIENTE)', {
        action: 'cobrarYFacturar',
        comprobanteId: comprobante.id,
        error: getErrorMessage(nubefactError)
      })
      // NO lanzamos error - el pago y comprobante local ya se guardaron
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
