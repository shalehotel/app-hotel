'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'
import { getFechaHoraPeru } from '@/lib/utils'

/**
 * Datos del comprobante a emitir
 */
interface ComprobanteData {
  tipo_comprobante: 'BOLETA' | 'FACTURA'
  serie_id: string
  reserva_id: string
  base_imponible: number
  total: number
  moneda: 'PEN' | 'USD'
  tipo_cambio: number
  fecha_emision?: Date
}

/**
 * Datos del pago a registrar
 */
interface PagoData {
  monto: number
  moneda: 'PEN' | 'USD'
  tipo_cambio: number
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN'
  referencia?: string
}

/**
 * Datos del contexto de caja y usuario
 */
interface ContextoCaja {
  sesion_caja_id: string
  usuario_id: string
  descripcion?: string
}

/**
 * Resultado de la operación atómica
 */
interface ResultadoAtomico {
  success: boolean
  comprobante_id?: string
  numero_comprobante?: string
  pago_id?: string
  movimiento_id?: string
  error?: string
}

/**
 * =====================================================
 * COBRAR Y FACTURAR ATÓMICO
 * =====================================================
 * 
 * Wrapper de la función PostgreSQL que ejecuta:
 * 1. Generar correlativo y crear comprobante
 * 2. Registrar pago
 * 3. Registrar movimiento de caja (si es efectivo)
 * 
 * Todo en una transacción ACID. Si falla cualquier paso,
 * se hace rollback automático.
 * 
 * @param comprobante - Datos del comprobante a emitir
 * @param pago - Datos del pago a registrar
 * @param contexto - Sesión de caja y usuario
 * @returns Resultado con IDs generados o error
 */
export async function cobrarYFacturarAtomico(
  comprobante: ComprobanteData,
  pago: PagoData,
  contexto: ContextoCaja
): Promise<ResultadoAtomico> {
  try {
    const supabase = await createClient()

    // Ejecutar la función PostgreSQL
    const { data, error } = await supabase.rpc('cobrar_y_facturar_atomico', {
      // Parámetros del comprobante
      p_tipo_comprobante: comprobante.tipo_comprobante,
      p_serie_id: comprobante.serie_id,
      p_reserva_id: comprobante.reserva_id,
      p_base_imponible: comprobante.base_imponible,
      p_total: comprobante.total,
      p_moneda: comprobante.moneda,
      p_tipo_cambio_factura: comprobante.tipo_cambio,
      p_fecha_emision: comprobante.fecha_emision || getFechaHoraPeru(),

      // Parámetros del pago
      p_monto_pago: pago.monto,
      p_moneda_pago: pago.moneda,
      p_tipo_cambio_pago: pago.tipo_cambio,
      p_metodo_pago: pago.metodo_pago,
      p_referencia_pago: pago.referencia || null,

      // Parámetros del contexto
      p_sesion_caja_id: contexto.sesion_caja_id,
      p_usuario_id: contexto.usuario_id,
      p_descripcion: contexto.descripcion || `Pago de reserva ${comprobante.reserva_id}`
    })

    if (error) {
      logger.error('Error en transacción atómica cobrar_y_facturar', {
        action: 'cobrarYFacturarAtomico',
        error: getErrorMessage(error),
        comprobante,
        pago
      })

      return {
        success: false,
        error: `Error al procesar la transacción: ${getErrorMessage(error)}`
      }
    }

    logger.info('Transacción atómica completada exitosamente', {
      action: 'cobrarYFacturarAtomico',
      result: data
    })

    return {
      success: true,
      comprobante_id: data.comprobante_id,
      numero_comprobante: data.numero_comprobante,
      pago_id: data.pago_id,
      movimiento_id: data.movimiento_id
    }

  } catch (error) {
    logger.error('Error inesperado en cobrarYFacturarAtomico', {
      action: 'cobrarYFacturarAtomico',
      error: getErrorMessage(error)
    })

    return {
      success: false,
      error: `Error inesperado: ${getErrorMessage(error)}`
    }
  }
}

/**
 * =====================================================
 * EJEMPLO DE USO
 * =====================================================
 * 
 * ```typescript
 * import { cobrarYFacturarAtomico } from '@/lib/actions/facturacion-atomica'
 * 
 * const resultado = await cobrarYFacturarAtomico(
 *   // Comprobante
 *   {
 *     tipo_comprobante: 'BOLETA',
 *     serie_id: 'uuid-de-serie',
 *     reserva_id: 'uuid-de-reserva',
 *     base_imponible: 100.00,
 *     total: 118.00,
 *     moneda: 'PEN',
 *     tipo_cambio: 1.00
 *   },
 *   // Pago
 *   {
 *     monto: 118.00,
 *     moneda: 'PEN',
 *     tipo_cambio: 1.00,
 *     metodo_pago: 'EFECTIVO'
 *   },
 *   // Contexto
 *   {
 *     sesion_caja_id: 'uuid-sesion',
 *     usuario_id: 'uuid-usuario'
 *   }
 * )
 * 
 * if (resultado.success) {
 *   console.log('Comprobante:', resultado.numero_comprobante)
 * } else {
 *   console.error('Error:', resultado.error)
 * }
 * ```
 */
