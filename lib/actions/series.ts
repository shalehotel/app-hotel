'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================
// TIPOS
// =============================================

export type TipoComprobante = 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_INTERNO'

export type Serie = {
  id: string
  caja_id: string
  tipo_comprobante: TipoComprobante
  serie: string
  correlativo_actual: number
}

export type SerieWithCaja = Serie & {
  cajas: {
    id: string
    nombre: string
  }
}

type Result<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================
// VALIDACIONES
// =============================================

/**
 * Validar formato de serie según tipo
 * Boletas: B001, B002, etc.
 * Facturas: F001, F002, etc.
 * Notas Crédito: NC01, NC02, etc.
 */
function validarFormatoSerie(serie: string, tipo: TipoComprobante): boolean {
  const patterns = {
    BOLETA: /^B\d{3,4}$/,
    FACTURA: /^F\d{3,4}$/,
    NOTA_CREDITO: /^NC\d{2,3}$/,
    TICKET_INTERNO: /^T\d{3,4}$/
  }

  return patterns[tipo].test(serie)
}

// =============================================
// FUNCIONES CRUD
// =============================================

/**
 * Obtener todas las series
 */
export async function getSeries(): Promise<Result<SerieWithCaja[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('series_comprobante')
      .select(`
        *,
        cajas(id, nombre)
      `)
      .order('serie', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error al obtener series:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener series de una caja específica
 */
export async function getSeriesByCaja(cajaId: string): Promise<Result<Serie[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('series_comprobante')
      .select('*')
      .eq('caja_id', cajaId)
      .order('tipo_comprobante')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error al obtener series de caja:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener serie por ID
 */
export async function getSerieById(id: string): Promise<Result<Serie>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('series_comprobante')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error al obtener serie:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crear nueva serie
 */
export async function createSerie(data: {
  caja_id: string
  tipo_comprobante: TipoComprobante
  serie: string
  correlativo_actual?: number
}): Promise<Result<Serie>> {
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
      return { success: false, error: 'Solo administradores pueden crear series' }
    }

    // Validar formato de serie
    const serieUpper = data.serie.toUpperCase().trim()
    if (!validarFormatoSerie(serieUpper, data.tipo_comprobante)) {
      return { 
        success: false, 
        error: `Formato de serie inválido. Ejemplo: ${
          data.tipo_comprobante === 'BOLETA' ? 'B001' :
          data.tipo_comprobante === 'FACTURA' ? 'F001' :
          data.tipo_comprobante === 'NOTA_CREDITO' ? 'NC01' : 'T001'
        }` 
      }
    }

    // Verificar que la caja existe
    const { data: caja } = await supabase
      .from('cajas')
      .select('id')
      .eq('id', data.caja_id)
      .single()

    if (!caja) {
      return { success: false, error: 'Caja no encontrada' }
    }

    // Verificar que no exista una serie con el mismo código (UNIQUE constraint)
    const { data: existente } = await supabase
      .from('series_comprobante')
      .select('id')
      .eq('serie', serieUpper)
      .eq('tipo_comprobante', data.tipo_comprobante)
      .single()

    if (existente) {
      return { 
        success: false, 
        error: `Ya existe la serie ${serieUpper} para ${data.tipo_comprobante}` 
      }
    }

    // Crear serie
    const { data: nuevaSerie, error } = await supabase
      .from('series_comprobante')
      .insert({
        caja_id: data.caja_id,
        tipo_comprobante: data.tipo_comprobante,
        serie: serieUpper,
        correlativo_actual: data.correlativo_actual || 0
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: nuevaSerie }
  } catch (error: any) {
    console.error('Error al crear serie:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualizar serie (solo el código, NO el correlativo)
 */
export async function updateSerie(
  id: string,
  data: {
    serie?: string
  }
): Promise<Result<Serie>> {
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
      return { success: false, error: 'Solo administradores pueden editar series' }
    }

    // Obtener serie actual
    const { data: serieActual } = await supabase
      .from('series_comprobante')
      .select('*')
      .eq('id', id)
      .single()

    if (!serieActual) {
      return { success: false, error: 'Serie no encontrada' }
    }

    const updateData: any = {}

    if (data.serie !== undefined) {
      const serieUpper = data.serie.toUpperCase().trim()
      
      // Validar formato
      if (!validarFormatoSerie(serieUpper, serieActual.tipo_comprobante)) {
        return { success: false, error: 'Formato de serie inválido' }
      }

      // Verificar duplicado
      const { data: duplicado } = await supabase
        .from('series_comprobante')
        .select('id')
        .eq('serie', serieUpper)
        .eq('tipo_comprobante', serieActual.tipo_comprobante)
        .neq('id', id)
        .single()

      if (duplicado) {
        return { success: false, error: 'Ya existe otra serie con ese código' }
      }

      updateData.serie = serieUpper
    }

    // Actualizar
    const { data: serieActualizada, error } = await supabase
      .from('series_comprobante')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: serieActualizada }
  } catch (error: any) {
    console.error('Error al actualizar serie:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar serie
 * ADVERTENCIA: Solo permitir si no tiene comprobantes emitidos
 */
export async function deleteSerie(id: string): Promise<Result<void>> {
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
      return { success: false, error: 'Solo administradores pueden eliminar series' }
    }

    // Verificar que no tenga comprobantes emitidos
    const { data: serie } = await supabase
      .from('series_comprobante')
      .select('serie, correlativo_actual')
      .eq('id', id)
      .single()

    if (!serie) {
      return { success: false, error: 'Serie no encontrada' }
    }

    if (serie.correlativo_actual > 0) {
      return { 
        success: false, 
        error: `No se puede eliminar. La serie ${serie.serie} ya ha emitido ${serie.correlativo_actual} comprobantes.` 
      }
    }

    // Eliminar
    const { error } = await supabase
      .from('series_comprobante')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: undefined }
  } catch (error: any) {
    console.error('Error al eliminar serie:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Resetear correlativo (solo ADMIN, casos excepcionales)
 */
export async function resetCorrelativo(
  id: string,
  nuevoCorrelativo: number
): Promise<Result<Serie>> {
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
      return { success: false, error: 'Solo administradores pueden resetear correlativos' }
    }

    if (nuevoCorrelativo < 0) {
      return { success: false, error: 'El correlativo debe ser mayor o igual a 0' }
    }

    // Actualizar
    const { data: serieActualizada, error } = await supabase
      .from('series_comprobante')
      .update({ correlativo_actual: nuevoCorrelativo })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion/cajas')
    return { success: true, data: serieActualizada }
  } catch (error: any) {
    console.error('Error al resetear correlativo:', error)
    return { success: false, error: error.message }
  }
}

/**
 * FUNCIÓN CRÍTICA: Obtener siguiente correlativo
 * Usa la función de BD que es ATÓMICA para evitar race conditions
 */
export async function getNextCorrelativo(serie: string): Promise<Result<number>> {
  try {
    const supabase = await createClient()

    // Llamar a la función de PostgreSQL que incrementa atómicamente
    const { data, error } = await supabase
      .rpc('obtener_siguiente_correlativo', { p_serie: serie })

    if (error) throw error

    if (!data) {
      return { success: false, error: 'No se pudo obtener el correlativo' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error al obtener correlativo:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Validar si una serie está disponible para crear
 */
export async function validateSerie(
  serie: string,
  tipo: TipoComprobante
): Promise<Result<boolean>> {
  try {
    const supabase = await createClient()

    const serieUpper = serie.toUpperCase().trim()

    // Verificar formato
    if (!validarFormatoSerie(serieUpper, tipo)) {
      return { success: false, error: 'Formato inválido' }
    }

    // Verificar disponibilidad
    const { data } = await supabase
      .from('series_comprobante')
      .select('id')
      .eq('serie', serieUpper)
      .eq('tipo_comprobante', tipo)
      .single()

    return { success: true, data: !data } // true si NO existe
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Obtener series activas por tipo de comprobante
 * Útil para selects en formularios
 */
export async function getSeriesByTipo(
  tipo: TipoComprobante
): Promise<Result<Serie[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('series_comprobante')
      .select('*')
      .eq('tipo_comprobante', tipo)
      .order('serie')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error al obtener series por tipo:', error)
    return { success: false, error: error.message }
  }
}
