'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================
// TIPOS
// =============================================

export type Caja = {
  id: string
  nombre: string
  estado: boolean
  created_at: string
}

export type CajaWithStats = Caja & {
  total_series: number
  turno_activo: boolean
  ultimo_cierre?: string
}

type Result<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================
// FUNCIONES CRUD
// =============================================

/**
 * Obtener todas las cajas
 */
export async function getCajas(): Promise<Result<Caja[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cajas')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error al obtener cajas:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener cajas con estadísticas
 */
export async function getCajasWithStats(): Promise<Result<CajaWithStats[]>> {
  try {
    const supabase = await createClient()

    // Obtener cajas
    const { data: cajas, error: cajasError } = await supabase
      .from('cajas')
      .select('*')
      .order('created_at', { ascending: true })

    if (cajasError) throw cajasError

    // Por cada caja, obtener estadísticas
    const cajasWithStats = await Promise.all(
      (cajas || []).map(async (caja) => {
        // Contar series
        const { count: seriesCount } = await supabase
          .from('series_comprobante')
          .select('*', { count: 'exact', head: true })
          .eq('caja_id', caja.id)

        // Verificar turno activo
        const { data: turnoActivo } = await supabase
          .from('caja_turnos')
          .select('id')
          .eq('caja_id', caja.id)
          .eq('estado', 'ABIERTA')
          .single()

        // Último cierre
        const { data: ultimoCierre } = await supabase
          .from('caja_turnos')
          .select('fecha_cierre')
          .eq('caja_id', caja.id)
          .eq('estado', 'CERRADA')
          .order('fecha_cierre', { ascending: false })
          .limit(1)
          .single()

        return {
          ...caja,
          total_series: seriesCount || 0,
          turno_activo: !!turnoActivo,
          ultimo_cierre: ultimoCierre?.fecha_cierre
        }
      })
    )

    return { success: true, data: cajasWithStats }
  } catch (error: any) {
    console.error('Error al obtener cajas con stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener caja por ID
 */
export async function getCajaById(id: string): Promise<Result<Caja>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cajas')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error al obtener caja:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener caja con sus series
 */
export async function getCajaWithSeries(id: string): Promise<Result<any>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cajas')
      .select(`
        *,
        series:series_comprobante(
          id,
          tipo_comprobante,
          serie,
          correlativo_actual
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error al obtener caja con series:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crear nueva caja
 */
export async function createCaja(data: {
  nombre: string
}): Promise<Result<Caja>> {
  try {
    const supabase = await createClient()

    // Validar que el usuario sea ADMIN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores pueden crear cajas' }
    }

    // Validar nombre
    if (!data.nombre || data.nombre.trim().length === 0) {
      return { success: false, error: 'El nombre de la caja es obligatorio' }
    }

    // Verificar que no exista una caja con el mismo nombre
    const { data: existente } = await supabase
      .from('cajas')
      .select('id')
      .ilike('nombre', data.nombre.trim())
      .single()

    if (existente) {
      return { success: false, error: 'Ya existe una caja con ese nombre' }
    }

    // Crear caja
    const { data: nuevaCaja, error } = await supabase
      .from('cajas')
      .insert({
        nombre: data.nombre.trim(),
        estado: true
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: nuevaCaja }
  } catch (error: any) {
    console.error('Error al crear caja:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualizar caja
 */
export async function updateCaja(
  id: string,
  data: {
    nombre?: string
    estado?: boolean
  }
): Promise<Result<Caja>> {
  try {
    const supabase = await createClient()

    // Validar que el usuario sea ADMIN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores pueden editar cajas' }
    }

    // Validar que la caja existe
    const { data: cajaExistente } = await supabase
      .from('cajas')
      .select('id')
      .eq('id', id)
      .single()

    if (!cajaExistente) {
      return { success: false, error: 'Caja no encontrada' }
    }

    // Preparar datos a actualizar
    const updateData: any = {}

    if (data.nombre !== undefined) {
      if (data.nombre.trim().length === 0) {
        return { success: false, error: 'El nombre no puede estar vacío' }
      }

      // Verificar nombre único (excluyendo la caja actual)
      const { data: duplicado } = await supabase
        .from('cajas')
        .select('id')
        .ilike('nombre', data.nombre.trim())
        .neq('id', id)
        .single()

      if (duplicado) {
        return { success: false, error: 'Ya existe otra caja con ese nombre' }
      }

      updateData.nombre = data.nombre.trim()
    }

    if (data.estado !== undefined) {
      updateData.estado = data.estado
    }

    // Actualizar
    const { data: cajaActualizada, error } = await supabase
      .from('cajas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: cajaActualizada }
  } catch (error: any) {
    console.error('Error al actualizar caja:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar caja (soft delete)
 */
export async function deleteCaja(id: string): Promise<Result<void>> {
  try {
    const supabase = await createClient()

    // Validar que el usuario sea ADMIN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores pueden eliminar cajas' }
    }

    // Verificar que no tenga turnos activos
    const { data: turnoActivo } = await supabase
      .from('caja_turnos')
      .select('id')
      .eq('caja_id', id)
      .eq('estado', 'ABIERTA')
      .single()

    if (turnoActivo) {
      return { 
        success: false, 
        error: 'No se puede eliminar una caja con turnos activos. Cierra el turno primero.' 
      }
    }

    // Soft delete: marcar como inactiva
    const { error } = await supabase
      .from('cajas')
      .update({ estado: false })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: undefined }
  } catch (error: any) {
    console.error('Error al eliminar caja:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener cajas disponibles (activas sin turno abierto)
 */
export async function getCajasDisponibles(): Promise<Result<Caja[]>> {
  try {
    const supabase = await createClient()

    // Obtener todas las cajas activas
    const { data: cajas, error } = await supabase
      .from('cajas')
      .select('*')
      .eq('estado', true)
      .order('nombre')

    if (error) throw error

    // Filtrar las que NO tienen turno activo
    const cajasDisponibles = await Promise.all(
      (cajas || []).map(async (caja) => {
        const { data: turnoActivo } = await supabase
          .from('caja_turnos')
          .select('id')
          .eq('caja_id', caja.id)
          .eq('estado', 'ABIERTA')
          .single()

        return turnoActivo ? null : caja
      })
    )

    const filtered = cajasDisponibles.filter((c): c is Caja => c !== null)

    return { success: true, data: filtered }
  } catch (error: any) {
    console.error('Error al obtener cajas disponibles:', error)
    return { success: false, error: error.message }
  }
}
