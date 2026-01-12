'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { differenceInDays } from 'date-fns'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

// ========================================
// TIPOS
// ========================================

export type ResultadoRedimension = {
    success: boolean
    error?: string
    resumen?: {
        diasOriginales: number
        diasNuevos: number
        diferenciaDias: number
        montoOriginal: number
        montoNuevo: number
        diferenciaMonto: number
        requiereFacturaExtra: boolean
        requiereNotaCredito: boolean
    }
}

export type DatosRedimension = {
    reservaId: string
    nuevaFechaSalida: string  // ISO string
}

// ========================================
// VALIDAR DISPONIBILIDAD PARA EXTENSIÓN
// ========================================

export async function validarDisponibilidadExtension(
    habitacionId: string,
    fechaSalidaActual: string,
    nuevaFechaSalida: string
): Promise<{ disponible: boolean; conflictos?: string[] }> {
    const supabase = await createClient()

    // Buscar reservas que se solapan con el período de extensión
    const { data: conflictos, error } = await supabase
        .from('reservas')
        .select('id, codigo_reserva, fecha_entrada, fecha_salida')
        .eq('habitacion_id', habitacionId)
        .neq('estado', 'CANCELADA')
        .neq('estado', 'NO_SHOW')
        .neq('estado', 'CHECKED_OUT')
        .gte('fecha_entrada', fechaSalidaActual)
        .lt('fecha_entrada', nuevaFechaSalida)

    if (error) {
        logger.error('Error al validar disponibilidad', {
            action: 'validarDisponibilidadExtension',
            habitacionId,
            originalError: getErrorMessage(error)
        })
        return { disponible: false, conflictos: ['Error al verificar disponibilidad'] }
    }

    if (conflictos && conflictos.length > 0) {
        return {
            disponible: false,
            conflictos: conflictos.map(c => `Reserva ${c.codigo_reserva} (${c.fecha_entrada})`)
        }
    }

    return { disponible: true }
}

// ========================================
// CALCULAR RESUMEN DE CAMBIO
// ========================================

export async function calcularResumenCambio(
    reservaId: string,
    nuevaFechaSalida: string
): Promise<ResultadoRedimension> {
    const supabase = await createClient()

    // Obtener datos de la reserva
    const { data: reserva, error } = await supabase
        .from('reservas')
        .select(`
      id,
      fecha_entrada,
      fecha_salida,
      precio_pactado,
      estado
    `)
        .eq('id', reservaId)
        .single()

    if (error || !reserva) {
        return { success: false, error: 'Reserva no encontrada' }
    }

    // Calcular días
    const fechaEntrada = new Date(reserva.fecha_entrada)
    const fechaSalidaActual = new Date(reserva.fecha_salida)
    const fechaSalidaNueva = new Date(nuevaFechaSalida)

    const diasOriginales = differenceInDays(fechaSalidaActual, fechaEntrada)
    const diasNuevos = differenceInDays(fechaSalidaNueva, fechaEntrada)
    const diferenciaDias = diasNuevos - diasOriginales

    if (diasNuevos < 1) {
        return { success: false, error: 'La estadía debe ser de al menos 1 noche' }
    }

    // Calcular montos
    const precioPorNoche = reserva.precio_pactado
    const montoOriginal = precioPorNoche * diasOriginales
    const montoNuevo = precioPorNoche * diasNuevos
    const diferenciaMonto = montoNuevo - montoOriginal

    // Verificar si hay comprobante emitido
    const { data: comprobantes } = await supabase
        .from('comprobantes')
        .select('id, tipo_comprobante, total_venta, estado_sunat')
        .eq('reserva_id', reservaId)
        .neq('estado_sunat', 'ANULADO')
        .in('tipo_comprobante', ['BOLETA', 'FACTURA'])

    const tieneComprobanteEmitido = comprobantes && comprobantes.length > 0

    return {
        success: true,
        resumen: {
            diasOriginales,
            diasNuevos,
            diferenciaDias,
            montoOriginal,
            montoNuevo,
            diferenciaMonto,
            requiereFacturaExtra: Boolean(tieneComprobanteEmitido && diferenciaMonto > 0),
            requiereNotaCredito: Boolean(tieneComprobanteEmitido && diferenciaMonto < 0)
        }
    }
}

// ========================================
// EXTENDER ESTADÍA
// ========================================

export async function extenderEstadia(
    reservaId: string,
    nuevaFechaSalida: string
): Promise<{ success: boolean; error?: string; mensaje?: string }> {
    const supabase = await createClient()

    try {
        // 1. Obtener datos de la reserva
        const { data: reserva, error: reservaError } = await supabase
            .from('reservas')
            .select(`
        id,
        habitacion_id,
        fecha_entrada,
        fecha_salida,
        precio_pactado,
        estado
      `)
            .eq('id', reservaId)
            .single()

        if (reservaError || !reserva) {
            return { success: false, error: 'Reserva no encontrada' }
        }

        // Validar que la nueva fecha sea posterior a la actual
        if (new Date(nuevaFechaSalida) <= new Date(reserva.fecha_salida)) {
            return { success: false, error: 'Para extender, la nueva fecha debe ser posterior a la actual' }
        }

        // 2. Validar disponibilidad
        const disponibilidad = await validarDisponibilidadExtension(
            reserva.habitacion_id,
            reserva.fecha_salida,
            nuevaFechaSalida
        )

        if (!disponibilidad.disponible) {
            return {
                success: false,
                error: `Habitación no disponible. Conflictos: ${disponibilidad.conflictos?.join(', ')}`
            }
        }

        // 3. Calcular resumen
        const resumen = await calcularResumenCambio(reservaId, nuevaFechaSalida)
        if (!resumen.success || !resumen.resumen) {
            return { success: false, error: resumen.error || 'Error al calcular cambio' }
        }

        // 4. Actualizar fecha de salida
        const { error: updateError } = await supabase
            .from('reservas')
            .update({ fecha_salida: nuevaFechaSalida })
            .eq('id', reservaId)

        if (updateError) {
            logger.error('Error al actualizar fecha de salida', {
                action: 'extenderEstadia',
                reservaId,
                originalError: getErrorMessage(updateError)
            })
            return { success: false, error: 'Error al actualizar la reserva' }
        }

        // 5. Si hay comprobante, emitir factura adicional por la diferencia
        if (resumen.resumen.requiereFacturaExtra) {
            // TODO: Emitir factura adicional
            // Por ahora solo loggeamos
            logger.info('Extensión requiere factura adicional', {
                action: 'extenderEstadia',
                reservaId,
                montoExtra: resumen.resumen.diferenciaMonto
            })
        }

        logger.info('Estadía extendida exitosamente', {
            action: 'extenderEstadia',
            reservaId,
            diasExtra: resumen.resumen.diferenciaDias,
            montoExtra: resumen.resumen.diferenciaMonto
        })

        revalidatePath('/rack')
        revalidatePath('/ocupaciones')

        return {
            success: true,
            mensaje: `Estadía extendida ${resumen.resumen.diferenciaDias} noches. ${resumen.resumen.requiereFacturaExtra ? 'Se debe emitir factura adicional por S/' + resumen.resumen.diferenciaMonto.toFixed(2) : ''}`
        }

    } catch (error) {
        logger.error('Error en extenderEstadia', {
            action: 'extenderEstadia',
            reservaId,
            originalError: getErrorMessage(error)
        })
        return { success: false, error: 'Error al procesar la extensión' }
    }
}

// ========================================
// ACORTAR ESTADÍA
// ========================================

export async function acortarEstadia(
    reservaId: string,
    nuevaFechaSalida: string
): Promise<{ success: boolean; error?: string; mensaje?: string; montoDevolucion?: number }> {
    const supabase = await createClient()

    try {
        // 1. Obtener datos de la reserva
        const { data: reserva, error: reservaError } = await supabase
            .from('reservas')
            .select(`
        id,
        habitacion_id,
        fecha_entrada,
        fecha_salida,
        precio_pactado,
        estado
      `)
            .eq('id', reservaId)
            .single()

        if (reservaError || !reserva) {
            return { success: false, error: 'Reserva no encontrada' }
        }

        // Validar que la nueva fecha sea anterior a la actual
        if (new Date(nuevaFechaSalida) >= new Date(reserva.fecha_salida)) {
            return { success: false, error: 'Para acortar, la nueva fecha debe ser anterior a la actual' }
        }

        // Validar que no sea antes de la fecha de entrada
        if (new Date(nuevaFechaSalida) <= new Date(reserva.fecha_entrada)) {
            return { success: false, error: 'La fecha de salida no puede ser anterior o igual a la entrada' }
        }

        // 2. Calcular resumen
        const resumen = await calcularResumenCambio(reservaId, nuevaFechaSalida)
        if (!resumen.success || !resumen.resumen) {
            return { success: false, error: resumen.error || 'Error al calcular cambio' }
        }

        const montoDevolucion = Math.abs(resumen.resumen.diferenciaMonto)

        // 3. Actualizar fecha de salida
        const { error: updateError } = await supabase
            .from('reservas')
            .update({ fecha_salida: nuevaFechaSalida })
            .eq('id', reservaId)

        if (updateError) {
            logger.error('Error al actualizar fecha de salida', {
                action: 'acortarEstadia',
                reservaId,
                originalError: getErrorMessage(updateError)
            })
            return { success: false, error: 'Error al actualizar la reserva' }
        }

        // 4. Si hay comprobante, emitir Nota de Crédito
        if (resumen.resumen.requiereNotaCredito) {
            // TODO: Emitir NC tipo 07 por devolución parcial
            // Por ahora solo loggeamos
            logger.info('Acortamiento requiere Nota de Crédito', {
                action: 'acortarEstadia',
                reservaId,
                montoDevolucion
            })
        }

        // 5. Registrar devolución como egreso de caja
        // TODO: Implementar registro de devolución

        logger.info('Estadía acortada exitosamente', {
            action: 'acortarEstadia',
            reservaId,
            diasMenos: Math.abs(resumen.resumen.diferenciaDias),
            montoDevolucion
        })

        revalidatePath('/rack')
        revalidatePath('/ocupaciones')

        return {
            success: true,
            mensaje: `Estadía acortada ${Math.abs(resumen.resumen.diferenciaDias)} noches. Devolución: S/${montoDevolucion.toFixed(2)}`,
            montoDevolucion
        }

    } catch (error) {
        logger.error('Error en acortarEstadia', {
            action: 'acortarEstadia',
            reservaId,
            originalError: getErrorMessage(error)
        })
        return { success: false, error: 'Error al procesar el acortamiento' }
    }
}

// ========================================
// REDIMENSIONAR ESTADÍA (Función principal)
// ========================================

export async function redimensionarEstadia(
    reservaId: string,
    nuevaFechaSalida: string
): Promise<{ success: boolean; error?: string; mensaje?: string; tipo?: 'extension' | 'acortamiento' }> {
    const supabase = await createClient()

    // Obtener fecha de salida actual
    const { data: reserva } = await supabase
        .from('reservas')
        .select('fecha_salida')
        .eq('id', reservaId)
        .single()

    if (!reserva) {
        return { success: false, error: 'Reserva no encontrada' }
    }

    const fechaSalidaActual = new Date(reserva.fecha_salida)
    const fechaSalidaNueva = new Date(nuevaFechaSalida)

    if (fechaSalidaNueva > fechaSalidaActual) {
        // Extensión
        const resultado = await extenderEstadia(reservaId, nuevaFechaSalida)
        return { ...resultado, tipo: 'extension' }
    } else if (fechaSalidaNueva < fechaSalidaActual) {
        // Acortamiento
        const resultado = await acortarEstadia(reservaId, nuevaFechaSalida)
        return { ...resultado, tipo: 'acortamiento' }
    } else {
        return { success: false, error: 'La nueva fecha es igual a la actual' }
    }
}
