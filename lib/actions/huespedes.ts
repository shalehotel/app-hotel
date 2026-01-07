'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ========================================
// TIPOS
// ========================================

export type HuespedData = {
  nombres: string
  apellidos: string
  tipo_documento: 'DNI' | 'PASAPORTE' | 'CE' | 'OTRO'
  numero_documento: string
  nacionalidad: string
  correo?: string | null
  telefono?: string | null
  fecha_nacimiento?: string | null
}

export type HuespedConRelacion = HuespedData & {
  es_titular: boolean
}

// ========================================
// CREAR/BUSCAR HUÉSPED
// ========================================

/**
 * Crear o actualizar un huésped
 * Si ya existe (por documento), lo actualiza
 */
export async function upsertHuesped(data: HuespedData) {
  const supabase = await createClient()

  const { data: existing, error: searchError } = await supabase
    .from('huespedes')
    .select('id')
    .eq('tipo_documento', data.tipo_documento)
    .eq('numero_documento', data.numero_documento)
    .maybeSingle()

  if (searchError) {
    console.error('Error al buscar huésped:', searchError)
    return { success: false, error: searchError.message }
  }

  // Si existe, actualizar
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('huespedes')
      .update({
        nombres: data.nombres,
        apellidos: data.apellidos,
        nacionalidad: data.nacionalidad,
        correo: data.correo,
        telefono: data.telefono,
        fecha_nacimiento: data.fecha_nacimiento,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updated }
  }

  // Si no existe, crear
  const { data: created, error: createError } = await supabase
    .from('huespedes')
    .insert(data)
    .select()
    .single()

  if (createError) {
    return { success: false, error: createError.message }
  }

  return { success: true, data: created }
}

/**
 * Buscar huésped por documento
 */
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
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ========================================
// VINCULAR HUÉSPEDES A RESERVA
// ========================================

/**
 * Registrar múltiples huéspedes y vincularlos a una reserva
 * - Crea/actualiza todos los huéspedes
 * - Los vincula a la reserva en reserva_huespedes
 * - Marca uno como titular
 */
export async function registrarHuespedesEnReserva(
  reservaId: string,
  huespedes: HuespedConRelacion[]
) {
  const supabase = await createClient()

  try {
    // 1. Validar que haya al menos un huésped
    if (huespedes.length === 0) {
      return { success: false, error: 'Debe registrar al menos un huésped' }
    }

    // 2. Validar que haya exactamente un titular
    const titulares = huespedes.filter((h) => h.es_titular)
    if (titulares.length !== 1) {
      return {
        success: false,
        error: 'Debe haber exactamente un huésped titular',
      }
    }

    // 3. Crear/actualizar cada huésped y obtener sus IDs
    const huespedesIds: Array<{ id: string; es_titular: boolean }> = []

    for (const huesped of huespedes) {
      const result = await upsertHuesped({
        nombres: huesped.nombres,
        apellidos: huesped.apellidos,
        tipo_documento: huesped.tipo_documento,
        numero_documento: huesped.numero_documento,
        nacionalidad: huesped.nacionalidad,
        correo: huesped.correo,
        telefono: huesped.telefono,
        fecha_nacimiento: huesped.fecha_nacimiento,
      })

      if (!result.success || !result.data) {
        return {
          success: false,
          error: `Error al registrar huésped ${huesped.nombres}: ${result.error}`,
        }
      }

      huespedesIds.push({
        id: result.data.id,
        es_titular: huesped.es_titular,
      })
    }

    // 4. Limpiar vínculos anteriores de esta reserva
    const { error: deleteError } = await supabase
      .from('reserva_huespedes')
      .delete()
      .eq('reserva_id', reservaId)

    if (deleteError) {
      return {
        success: false,
        error: `Error al limpiar vínculos anteriores: ${deleteError.message}`,
      }
    }

    // 5. Crear los nuevos vínculos
    const vinculos = huespedesIds.map((h) => ({
      reserva_id: reservaId,
      huesped_id: h.id,
      es_titular: h.es_titular,
    }))

    const { error: insertError } = await supabase
      .from('reserva_huespedes')
      .insert(vinculos)

    if (insertError) {
      return {
        success: false,
        error: `Error al vincular huéspedes: ${insertError.message}`,
      }
    }

    revalidatePath('/rack')
    return { success: true, huespedesIds }
  } catch (error: any) {
    console.error('Error en registrarHuespedesEnReserva:', error)
    return { success: false, error: error.message }
  }
}

// ========================================
// OBTENER HUÉSPEDES DE UNA RESERVA
// ========================================

/**
 * Obtener todos los huéspedes vinculados a una reserva
 */
export async function getHuespedesByReserva(reservaId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reserva_huespedes')
    .select(
      `
      id,
      es_titular,
      huespedes (
        id,
        nombres,
        apellidos,
        tipo_documento,
        numero_documento,
        nacionalidad,
        correo,
        telefono,
        fecha_nacimiento
      )
    `
    )
    .eq('reserva_id', reservaId)
    .order('es_titular', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ========================================
// LISTADO GENERAL
// ========================================

/**
 * Obtener todos los huéspedes registrados
 */
export async function getAllHuespedes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('huespedes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Buscar huéspedes por nombre o documento
 */
export async function searchHuespedes(query: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('huespedes')
    .select('*')
    .or(
      `nombres.ilike.%${query}%,apellidos.ilike.%${query}%,numero_documento.ilike.%${query}%`
    )
    .limit(10)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
