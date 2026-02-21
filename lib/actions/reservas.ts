'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'
import { esTransicionValida } from '@/lib/utils/validaciones-reservas'
import { requireOperador } from '@/lib/auth/permissions'

// ========================================
// CANCELAR RESERVA
// ========================================
export async function cancelarReserva(reservaId: string, motivo?: string) {
  await requireOperador()
  const supabase = await createClient()

  try {
    // 1. Obtener datos de la reserva
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('id, estado, habitacion_id')
      .eq('id', reservaId)
      .single()

    if (reservaError || !reserva) {
      return {
        error: 'Reserva no encontrada',
        code: 'RESERVA_NO_ENCONTRADA'
      }
    }

    // 2. Validar que se pueda cancelar usando el helper
    const validacion = esTransicionValida(reserva.estado, 'CANCELADA')
    if (!validacion.valida) {
      return {
        error: validacion.mensaje || 'Transición de estado no permitida',
        code: 'TRANSICION_INVALIDA'
      }
    }

    // 3. Actualizar estado de reserva
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        estado: 'CANCELADA'
      })
      .eq('id', reservaId)

    if (updateError) {
      throw new Error(`Error al actualizar reserva: ${updateError.message}`)
    }

    // 4. Si estaba CHECKED_IN, liberar habitación
    if (reserva.estado === 'CHECKED_IN' && reserva.habitacion_id) {
      await supabase
        .from('habitaciones')
        .update({
          estado_ocupacion: 'LIBRE',
          estado_limpieza: 'SUCIA'
        })
        .eq('id', reserva.habitacion_id)
    }

    logger.info('Reserva cancelada exitosamente', {
      action: 'cancelarReserva',
      reservaId,
    })

    return {
      success: true,
      message: 'Reserva cancelada exitosamente'
    }
  } catch (error: unknown) {
    logger.error('Error al cancelar reserva', {
      action: 'cancelarReserva',
      reservaId,
      originalError: getErrorMessage(error),
    })
    return {
      error: 'Error de sistema',
      message: 'Hubo un problema al cancelar la reserva',
      code: 'ERROR_SISTEMA'
    }
  }
}

// ========================================
// HELPERS PARA CÁLCULOS
// ========================================
// Helpers movidos a @/lib/utils para evitar error de Server Actions
// calcularTotalReserva
// calcularNoches

// ========================================
// CONTROL DE PRESENCIA (LLAVE)
// ========================================
export async function toggleHuespedPresente(reservaId: string, presente: boolean) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('reservas')
      .update({ huesped_presente: presente })
      .eq('id', reservaId)

    if (error) throw error

    // NOTA: No usar revalidatePath - Realtime + optimistic updates manejan la UI
    return { success: true }
  } catch (error: unknown) {
    logger.error('Error al actualizar estado del huésped', {
      action: 'toggleHuespedPresente',
      reservaId,
      originalError: getErrorMessage(error),
    })
    return { error: 'Error al actualizar estado del huésped' }
  }
}

// ========================================
// ACTUALIZAR RESERVA (EDICIÓN COMPLETA)
// ========================================
export type UpdateReservaInput = {
  reservaId: string
  reserva: {
    fecha_entrada: Date
    fecha_salida: Date
    precio_pactado: number
    moneda_pactada: 'PEN' | 'USD'
    nota?: string
    habitacion_id?: string // Opcional: cambiar la habitación asignada
  }
  titular?: {
    nombres: string
    apellidos: string
    tipo_documento: 'DNI' | 'PASAPORTE' | 'CE' | 'OTRO'
    numero_documento: string
    pais: string
    procedencia_ciudad?: string
    procedencia_departamento?: string
    correo?: string
    telefono?: string
    sexo?: 'M' | 'F'
    notas_internas?: string
  }
}

export async function updateReserva(input: UpdateReservaInput) {
  await requireOperador()
  const supabase = await createClient()

  try {
    // 1. Validar Reserva
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('id, estado, habitacion_id')
      .eq('id', input.reservaId)
      .single()

    if (reservaError || !reserva) {
      throw new Error('Reserva no encontrada')
    }

    if (reserva.estado === 'CANCELADA' || reserva.estado === 'CHECKED_OUT') {
      throw new Error('No se puede editar una reserva cancelada o finalizada')
    }

    // 2. Si viene nueva habitación, validar que no tenga conflicto de fechas
    const nuevaHabitacionId = input.reserva.habitacion_id
    if (nuevaHabitacionId && nuevaHabitacionId !== reserva.habitacion_id) {
      const { data: conflicto } = await supabase
        .from('reservas')
        .select('id')
        .eq('habitacion_id', nuevaHabitacionId)
        .not('id', 'eq', input.reservaId)
        .not('estado', 'in', '(CANCELADA,CHECKED_OUT)')
        .lt('fecha_entrada', input.reserva.fecha_salida.toISOString())
        .gt('fecha_salida', input.reserva.fecha_entrada.toISOString())
        .limit(1)

      if (conflicto && conflicto.length > 0) {
        return { success: false, error: 'La habitación seleccionada no está disponible en esas fechas' }
      }
    }

    // 3. Actualizar Reserva
    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        fecha_entrada: input.reserva.fecha_entrada.toISOString(),
        fecha_salida: input.reserva.fecha_salida.toISOString(),
        precio_pactado: input.reserva.precio_pactado,
        moneda_pactada: input.reserva.moneda_pactada,
        ...(nuevaHabitacionId ? { habitacion_id: nuevaHabitacionId } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', input.reservaId)

    if (updateError) throw new Error(`Error al actualizar reserva: ${updateError.message}`)

    // 4. Si había cambio de habitación y el huésped ya hizo check-in,
    //    actualizar estados de ocupación entre las dos habitaciones
    if (nuevaHabitacionId && nuevaHabitacionId !== reserva.habitacion_id && reserva.estado === 'CHECKED_IN') {
      // Liberar habitación anterior
      if (reserva.habitacion_id) {
        await supabase.from('habitaciones').update({
          estado_ocupacion: 'LIBRE',
          estado_limpieza: 'SUCIA'
        }).eq('id', reserva.habitacion_id)
      }
      // Ocupar habitación nueva
      await supabase.from('habitaciones').update({
        estado_ocupacion: 'OCUPADA',
      }).eq('id', nuevaHabitacionId)
    }

    if (input.titular) {
      // Buscar el ID del titular actual
      const { data: relacionHuesped } = await supabase
        .from('reserva_huespedes')
        .select('huesped_id')
        .eq('reserva_id', input.reservaId)
        .eq('es_titular', true)
        .single()

      if (relacionHuesped) {
        // Actualizar datos del huésped titular
        const { error: huespedError } = await supabase
          .from('huespedes')
          .update({
            nombres: input.titular.nombres,
            apellidos: input.titular.apellidos,
            tipo_documento: input.titular.tipo_documento,
            numero_documento: input.titular.numero_documento,
            pais: input.titular.pais,
            procedencia_ciudad: input.titular.procedencia_ciudad,
            procedencia_departamento: input.titular.procedencia_departamento,
            correo: input.titular.correo,
            telefono: input.titular.telefono,
            sexo: input.titular.sexo,
            notas_internas: input.titular.notas_internas
          })
          .eq('id', relacionHuesped.huesped_id)

        if (huespedError) throw new Error(`Error al actualizar titular: ${huespedError.message}`)
      }
    }


    logger.info('Reserva actualizada', {
      action: 'updateReserva',
      reservaId: input.reservaId
    })

    return { success: true }
  } catch (error: unknown) {
    logger.error('Error al actualizar reserva', {
      action: 'updateReserva',
      reservaId: input.reservaId,
      originalError: getErrorMessage(error)
    })
    return { success: false, error: getErrorMessage(error) }
  }
}

// ========================================
// HABITACIONES DISPONIBLES PARA SELECTOR DE EDICIÓN
// ========================================
export type HabitacionParaEdicion = {
  id: string
  numero: string
  piso: number
  categoria_nombre: string
  disponible: boolean // false si hay conflicto con otras reservas en esas fechas
}

export async function getHabitacionesDisponiblesParaEdicion(
  reservaId: string,
  _fechaEntrada: string,
  _fechaSalida: string
): Promise<HabitacionParaEdicion[]> {
  const supabase = await createClient()

  // Obtener el habitacion_id actual de la reserva
  const { data: reservaActual } = await supabase
    .from('reservas')
    .select('habitacion_id')
    .eq('id', reservaId)
    .single()

  const habitacionActualId = reservaActual?.habitacion_id

  // Obtener todas las habitaciones con su estado de ocupación
  const { data: habitaciones, error } = await supabase
    .from('habitaciones')
    .select('id, numero, piso, estado_ocupacion, categorias_habitacion(nombre)')
    .order('numero')

  if (error || !habitaciones) return []

  return habitaciones.map((h: any) => ({
    id: h.id,
    numero: h.numero,
    piso: h.piso,
    categoria_nombre: h.categorias_habitacion?.nombre || 'Sin categoría',
    // Disponible si es la habitación actual (siempre seleccionable) o está LIBRE
    disponible: h.id === habitacionActualId || h.estado_ocupacion === 'LIBRE',
  }))
}
