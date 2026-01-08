'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { 
  TipoMovimiento, 
  MonedaMovimiento, 
  CategoriaMovimiento 
} from '@/lib/utils/movimientos'

// =============================================
// TIPOS (Re-export para compatibilidad de Server Actions)
// =============================================

export type Movimiento = {
  id: string
  caja_turno_id: string
  usuario_id: string
  tipo: TipoMovimiento
  categoria: CategoriaMovimiento | null
  moneda: MonedaMovimiento
  monto: number
  motivo: string
  comprobante_referencia: string | null
  evidencia_url: string | null
  created_at: string
}

export type MovimientoConUsuario = Movimiento & {
  usuario: {
    nombres: string
    apellidos: string
  }
}

export type ResumenMovimientos = {
  total_ingresos_pen: number
  total_ingresos_usd: number
  total_egresos_pen: number
  total_egresos_usd: number
  neto_pen: number // ingresos - egresos
  neto_usd: number
  cantidad_movimientos: number
}

type Result<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================
// SERVER ACTIONS
// =============================================

/**
 * Crear un nuevo movimiento de caja (ingreso o egreso)
 * SOLO puede hacerse si el turno está ABIERTO
 */
export async function createMovimiento(data: {
  turno_id: string
  tipo: TipoMovimiento
  monto: number
  moneda: MonedaMovimiento
  motivo: string
  categoria?: CategoriaMovimiento
  comprobante_referencia?: string
  evidencia_url?: string
}): Promise<Result<Movimiento>> {
  try {
    const supabase = await createClient()

    // Validar que el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    // Validar que el turno existe y está ABIERTO
    const { data: turno, error: turnoError } = await supabase
      .from('caja_turnos')
      .select('id, usuario_id, estado')
      .eq('id', data.turno_id)
      .single()

    if (turnoError || !turno) {
      return { success: false, error: 'Turno no encontrado' }
    }

    if (turno.estado !== 'ABIERTA') {
      return { success: false, error: 'No puedes registrar movimientos en un turno cerrado' }
    }

    // Validar que es el usuario del turno
    if (turno.usuario_id !== user.id) {
      return { success: false, error: 'Solo puedes registrar movimientos en tu propio turno' }
    }

    // Validaciones de datos
    if (data.monto <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0' }
    }

    if (!data.motivo || data.motivo.trim().length < 5) {
      return { success: false, error: 'El motivo debe tener al menos 5 caracteres' }
    }

    // Crear el movimiento
    const { data: movimiento, error: insertError } = await supabase
      .from('caja_movimientos')
      .insert({
        caja_turno_id: data.turno_id,
        usuario_id: user.id,
        tipo: data.tipo,
        categoria: data.categoria || null,
        moneda: data.moneda,
        monto: data.monto,
        motivo: data.motivo.trim(),
        comprobante_referencia: data.comprobante_referencia || null,
        evidencia_url: data.evidencia_url || null
      })
      .select()
      .single()

    if (insertError) throw insertError

    revalidatePath('/cajas')

    return { success: true, data: movimiento }
  } catch (error: any) {
    console.error('Error al crear movimiento:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener movimientos de un turno específico
 */
export async function getMovimientosByTurno(
  turnoId: string
): Promise<Result<MovimientoConUsuario[]>> {
  try {
    const supabase = await createClient()

    const { data: movimientos, error } = await supabase
      .from('caja_movimientos')
      .select(`
        *,
        usuario:usuarios!usuario_id(nombres, apellidos)
      `)
      .eq('caja_turno_id', turnoId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transformar la respuesta para aplanar el objeto usuario
    const movimientosTransformados = movimientos.map((m: any) => ({
      ...m,
      usuario: {
        nombres: m.usuario.nombres,
        apellidos: m.usuario.apellidos
      }
    }))

    return { success: true, data: movimientosTransformados }
  } catch (error: any) {
    console.error('Error al obtener movimientos:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener resumen de movimientos de un turno
 * Calcula totales de ingresos y egresos por moneda
 */
export async function getResumenMovimientos(
  turnoId: string
): Promise<Result<ResumenMovimientos>> {
  try {
    const supabase = await createClient()

    // Opción 1: Usar la función SQL (más eficiente)
    const { data: resumen, error } = await supabase
      .rpc('calcular_movimientos_turno', { p_turno_id: turnoId })

    if (error) {
      // Si falla la función, calcular manualmente
      const { data: movimientos } = await supabase
        .from('caja_movimientos')
        .select('tipo, moneda, monto')
        .eq('caja_turno_id', turnoId)

      if (!movimientos) {
        return {
          success: true,
          data: {
            total_ingresos_pen: 0,
            total_ingresos_usd: 0,
            total_egresos_pen: 0,
            total_egresos_usd: 0,
            neto_pen: 0,
            neto_usd: 0,
            cantidad_movimientos: 0
          }
        }
      }

      const totales = movimientos.reduce((acc, mov) => {
        if (mov.tipo === 'INGRESO' && mov.moneda === 'PEN') {
          acc.total_ingresos_pen += Number(mov.monto)
        } else if (mov.tipo === 'INGRESO' && mov.moneda === 'USD') {
          acc.total_ingresos_usd += Number(mov.monto)
        } else if (mov.tipo === 'EGRESO' && mov.moneda === 'PEN') {
          acc.total_egresos_pen += Number(mov.monto)
        } else if (mov.tipo === 'EGRESO' && mov.moneda === 'USD') {
          acc.total_egresos_usd += Number(mov.monto)
        }
        return acc
      }, {
        total_ingresos_pen: 0,
        total_ingresos_usd: 0,
        total_egresos_pen: 0,
        total_egresos_usd: 0
      })

      return {
        success: true,
        data: {
          ...totales,
          neto_pen: totales.total_ingresos_pen - totales.total_egresos_pen,
          neto_usd: totales.total_ingresos_usd - totales.total_egresos_usd,
          cantidad_movimientos: movimientos.length
        }
      }
    }

    // Si la función SQL funcionó
    const row = resumen[0]
    return {
      success: true,
      data: {
        total_ingresos_pen: Number(row.total_ingresos_pen),
        total_ingresos_usd: Number(row.total_ingresos_usd),
        total_egresos_pen: Number(row.total_egresos_pen),
        total_egresos_usd: Number(row.total_egresos_usd),
        neto_pen: Number(row.total_ingresos_pen) - Number(row.total_egresos_pen),
        neto_usd: Number(row.total_ingresos_usd) - Number(row.total_egresos_usd),
        cantidad_movimientos: 0 // La función no lo retorna, habría que agregar
      }
    }
  } catch (error: any) {
    console.error('Error al obtener resumen de movimientos:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar un movimiento (solo si el turno aún está abierto)
 * Útil para corregir errores de captura
 */
export async function deleteMovimiento(
  movimientoId: string
): Promise<Result<void>> {
  try {
    const supabase = await createClient()

    // Verificar que el usuario es dueño del movimiento y turno está abierto
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: movimiento, error: movError } = await supabase
      .from('caja_movimientos')
      .select(`
        id,
        usuario_id,
        caja_turno_id,
        caja_turnos!caja_turno_id(estado)
      `)
      .eq('id', movimientoId)
      .single()

    if (movError || !movimiento) {
      return { success: false, error: 'Movimiento no encontrado' }
    }

    if (movimiento.usuario_id !== user.id) {
      return { success: false, error: 'Solo puedes eliminar tus propios movimientos' }
    }

    if ((movimiento as any).caja_turnos.estado !== 'ABIERTA') {
      return { success: false, error: 'No puedes eliminar movimientos de un turno cerrado' }
    }

    // Eliminar
    const { error: deleteError } = await supabase
      .from('caja_movimientos')
      .delete()
      .eq('id', movimientoId)

    if (deleteError) throw deleteError

    revalidatePath('/cajas')

    return { success: true, data: undefined }
  } catch (error: any) {
    console.error('Error al eliminar movimiento:', error)
    return { success: false, error: error.message }
  }
}