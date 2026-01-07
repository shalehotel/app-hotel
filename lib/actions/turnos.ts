'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================
// TIPOS
// =============================================

export type EstadoTurno = 'ABIERTA' | 'CERRADA'

export type Turno = {
  id: string
  caja_id: string
  usuario_id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_apertura: number
  monto_cierre_declarado: number | null
  monto_cierre_sistema: number | null
  estado: EstadoTurno
  // Multimoneda (nuevas columnas)
  monto_apertura_usd?: number
  monto_cierre_declarado_usd?: number
  monto_cierre_sistema_usd?: number
}

export type TurnoActivo = Turno & {
  caja: {
    id: string
    nombre: string
  }
  usuario: {
    id: string
    nombres: string
    apellidos: string
  }
  series: Array<{
    id: string
    tipo_comprobante: string
    serie: string
    correlativo_actual: number
  }>
}

// Tipo para historial de turnos (incluye relaciones)
export type TurnoHistorial = Turno & {
  caja: {
    id: string
    nombre: string
  }
  usuario: {
    id: string
    nombres: string
    apellidos: string
  }
}

// Tipo para detalle completo de turno (con info adicional)
export type TurnoDetalle = TurnoHistorial & {
  movimientos?: MovimientosTurno
  comprobantes?: Array<any>
  estadisticas?: {
    duracion: string
    total_transacciones: number
    total_comprobantes: number
  }
}

export type MovimientosTurno = {
  pagos: Array<{
    id: string
    metodo_pago: string
    monto: number
    moneda_pago: string
    fecha_pago: string
    reserva_id: string
  }>
  totalEfectivoPEN: number
  totalEfectivoUSD: number
  totalTarjeta: number
  totalYape: number
  totalGeneral: number
}

export type EstadoCuadre = 'EXACTO' | 'SOBRANTE' | 'FALTANTE'

export type ResultadoCierre = {
  success: true
  monto_sistema_pen: number
  monto_sistema_usd: number
  diferencia_pen: number
  diferencia_usd: number
  estado_cuadre: EstadoCuadre
  mensaje: string
} | {
  success: false
  error: string
}

type Result<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

/**
 * Verificar si un usuario tiene turno activo
 */
export async function getTurnoActivoByUsuario(
  usuarioId: string
): Promise<Result<TurnoActivo | null>> {
  try {
    const supabase = await createClient()

    const { data: turno, error } = await supabase
      .from('caja_turnos')
      .select(`
        *,
        caja:cajas(id, nombre),
        usuario:usuarios(id, nombres, apellidos)
      `)
      .eq('usuario_id', usuarioId)
      .eq('estado', 'ABIERTA')
      .single()

    if (error) {
      // Si no encuentra turno activo, no es error
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      throw error
    }

    // Obtener series de la caja
    const { data: series } = await supabase
      .from('series_comprobante')
      .select('id, tipo_comprobante, serie, correlativo_actual')
      .eq('caja_id', turno.caja_id)

    return { 
      success: true, 
      data: {
        ...turno,
        series: series || []
      }
    }
  } catch (error: any) {
    console.error('Error al obtener turno activo:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Abrir turno (con soporte multimoneda)
 */
export async function abrirTurno(data: {
  caja_id: string
  usuario_id: string
  monto_apertura_pen: number
  monto_apertura_usd?: number
}): Promise<Result<Turno>> {
  try {
    const supabase = await createClient()

    // Validar que el usuario existe y es RECEPCION o ADMIN
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.usuario_id)
      .single()

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    if (usuario.rol !== 'RECEPCION' && usuario.rol !== 'ADMIN') {
      return { success: false, error: 'Solo recepcionistas pueden abrir turnos de caja' }
    }

    // Verificar que la caja existe y está activa
    const { data: caja } = await supabase
      .from('cajas')
      .select('id, estado')
      .eq('id', data.caja_id)
      .single()

    if (!caja) {
      return { success: false, error: 'Caja no encontrada' }
    }

    if (!caja.estado) {
      return { success: false, error: 'La caja está inactiva' }
    }

    // Verificar que el usuario NO tenga otro turno abierto
    const { data: turnoExistente } = await supabase
      .from('caja_turnos')
      .select('id')
      .eq('usuario_id', data.usuario_id)
      .eq('estado', 'ABIERTA')
      .single()

    if (turnoExistente) {
      return { 
        success: false, 
        error: 'Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.' 
      }
    }

    // Verificar que la caja NO tenga otro turno abierto
    const { data: turnoEnCaja } = await supabase
      .from('caja_turnos')
      .select('id')
      .eq('caja_id', data.caja_id)
      .eq('estado', 'ABIERTA')
      .single()

    if (turnoEnCaja) {
      return { 
        success: false, 
        error: 'Esta caja ya tiene un turno abierto por otro usuario.' 
      }
    }

    // Validar montos
    if (data.monto_apertura_pen < 0) {
      return { success: false, error: 'El monto de apertura no puede ser negativo' }
    }

    // Crear turno
    const { data: nuevoTurno, error } = await supabase
      .from('caja_turnos')
      .insert({
        caja_id: data.caja_id,
        usuario_id: data.usuario_id,
        monto_apertura: data.monto_apertura_pen,
        monto_apertura_usd: data.monto_apertura_usd || 0,
        estado: 'ABIERTA'
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/cajas')
    return { success: true, data: nuevoTurno }
  } catch (error: any) {
    console.error('Error al abrir turno:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener movimientos del turno (pagos)
 */
export async function getMovimientosTurno(
  turnoId: string
): Promise<Result<MovimientosTurno>> {
  try {
    const supabase = await createClient()

    // Obtener todos los pagos del turno
    const { data: pagos, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('caja_turno_id', turnoId)
      .order('fecha_pago', { ascending: false })

    if (error) throw error

    // Calcular totales por método de pago
    const totalEfectivoPEN = (pagos || [])
      .filter(p => p.metodo_pago === 'EFECTIVO' && p.moneda_pago === 'PEN')
      .reduce((sum, p) => sum + Number(p.monto), 0)

    const totalEfectivoUSD = (pagos || [])
      .filter(p => p.metodo_pago === 'EFECTIVO' && p.moneda_pago === 'USD')
      .reduce((sum, p) => sum + Number(p.monto), 0)

    const totalTarjeta = (pagos || [])
      .filter(p => p.metodo_pago === 'VISA' || p.metodo_pago === 'MASTERCARD')
      .reduce((sum, p) => sum + Number(p.monto), 0)

    const totalYape = (pagos || [])
      .filter(p => p.metodo_pago === 'YAPE' || p.metodo_pago === 'PLIN')
      .reduce((sum, p) => sum + Number(p.monto), 0)

    const totalGeneral = (pagos || []).reduce((sum, p) => sum + Number(p.monto), 0)

    return {
      success: true,
      data: {
        pagos: pagos || [],
        totalEfectivoPEN,
        totalEfectivoUSD,
        totalTarjeta,
        totalYape,
        totalGeneral
      }
    }
  } catch (error: any) {
    console.error('Error al obtener movimientos del turno:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cerrar turno con CIERRE CIEGO
 * El usuario cuenta el dinero y declara el monto, el sistema calcula la diferencia
 */
export async function cerrarTurno(data: {
  turno_id: string
  declarado_pen: number
  declarado_usd?: number
  arqueo_pen?: Record<string, number>
  arqueo_usd?: Record<string, number>
  nota?: string
}): Promise<ResultadoCierre> {
  try {
    const supabase = await createClient()

    // Obtener el turno
    const { data: turno, error: turnoError } = await supabase
      .from('caja_turnos')
      .select('*')
      .eq('id', data.turno_id)
      .single()

    if (turnoError) throw turnoError

    if (!turno) {
      return { success: false, error: 'Turno no encontrado' }
    }

    if (turno.estado !== 'ABIERTA') {
      return { success: false, error: 'El turno ya está cerrado' }
    }

    // Validar que es el usuario correcto
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id !== turno.usuario_id) {
      return { success: false, error: 'Solo puedes cerrar tus propios turnos' }
    }

    // Calcular monto sistema desde pagos Y movimientos de caja
    const movimientosPagos = await getMovimientosTurno(data.turno_id)
    if (!movimientosPagos.success) {
      return { success: false, error: 'Error al calcular movimientos de pagos' }
    }

    // Importar y usar la función de movimientos de caja
    const { getResumenMovimientos } = await import('./movimientos')
    const movimientosCaja = await getResumenMovimientos(data.turno_id)
    if (!movimientosCaja.success) {
      return { success: false, error: 'Error al calcular movimientos de caja' }
    }

    // FÓRMULA COMPLETA:
    // Sistema = Apertura + Pagos en Efectivo + Ingresos Manuales - Egresos Manuales
    const monto_sistema_pen = 
      turno.monto_apertura + 
      movimientosPagos.data.totalEfectivoPEN +
      movimientosCaja.data.neto_pen // neto_pen = ingresos - egresos
    
    const monto_sistema_usd = 
      (turno.monto_apertura_usd || 0) + 
      movimientosPagos.data.totalEfectivoUSD +
      movimientosCaja.data.neto_usd

    // Calcular diferencias
    const diferencia_pen = data.declarado_pen - monto_sistema_pen
    const diferencia_usd = (data.declarado_usd || 0) - monto_sistema_usd

    // Determinar estado de cuadre
    let estado_cuadre: EstadoCuadre = 'EXACTO'
    const tolerancia = 0.50 // 50 céntimos de tolerancia

    if (Math.abs(diferencia_pen) > tolerancia || Math.abs(diferencia_usd) > tolerancia) {
      if (diferencia_pen > 0 || diferencia_usd > 0) {
        estado_cuadre = 'SOBRANTE'
      } else {
        estado_cuadre = 'FALTANTE'
      }
    }

    // Actualizar turno (TRANSACCIÓN)
    const { error: updateError } = await supabase
      .from('caja_turnos')
      .update({
        fecha_cierre: new Date().toISOString(),
        monto_cierre_declarado: data.declarado_pen,
        monto_cierre_sistema: monto_sistema_pen,
        monto_cierre_declarado_usd: data.declarado_usd || 0,
        monto_cierre_sistema_usd: monto_sistema_usd,
        estado: 'CERRADA'
      })
      .eq('id', data.turno_id)

    if (updateError) throw updateError

    // Si hay descuadre significativo, registrar en tabla de auditoría (TODO: crear tabla)
    if (estado_cuadre !== 'EXACTO') {
      console.warn(`⚠️ Descuadre en turno ${data.turno_id}:`, {
        diferencia_pen,
        diferencia_usd,
        estado_cuadre
      })
    }

    revalidatePath('/cajas')

    return {
      success: true,
      monto_sistema_pen,
      monto_sistema_usd,
      diferencia_pen,
      diferencia_usd,
      estado_cuadre,
      mensaje: estado_cuadre === 'EXACTO' 
        ? '✅ Turno cerrado correctamente. Cuadre exacto.' 
        : `⚠️ Turno cerrado con ${estado_cuadre.toLowerCase()}.`
    }
  } catch (error: any) {
    console.error('Error al cerrar turno:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cierre forzoso (solo ADMIN)
 * Para turnos abandonados o emergencias
 */
export async function forceCloseTurno(
  turnoId: string,
  adminId: string,
  motivo: string
): Promise<Result<void>> {
  try {
    const supabase = await createClient()

    // Validar que quien cierra es ADMIN
    const { data: admin } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', adminId)
      .single()

    if (admin?.rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores pueden forzar el cierre' }
    }

    // Obtener turno
    const { data: turno } = await supabase
      .from('caja_turnos')
      .select('*')
      .eq('id', turnoId)
      .single()

    if (!turno) {
      return { success: false, error: 'Turno no encontrado' }
    }

    if (turno.estado !== 'ABIERTA') {
      return { success: false, error: 'El turno ya está cerrado' }
    }

    // Calcular sistema
    const movimientos = await getMovimientosTurno(turnoId)
    if (!movimientos.success) {
      return { success: false, error: 'Error al calcular movimientos' }
    }

    const monto_sistema_pen = turno.monto_apertura + movimientos.data.totalEfectivoPEN
    const monto_sistema_usd = (turno.monto_apertura_usd || 0) + movimientos.data.totalEfectivoUSD

    // Cerrar asumiendo que el declarado = sistema (cierre administrativo)
    const { error } = await supabase
      .from('caja_turnos')
      .update({
        fecha_cierre: new Date().toISOString(),
        monto_cierre_declarado: monto_sistema_pen,
        monto_cierre_sistema: monto_sistema_pen,
        monto_cierre_declarado_usd: monto_sistema_usd,
        monto_cierre_sistema_usd: monto_sistema_usd,
        estado: 'CERRADA'
      })
      .eq('id', turnoId)

    if (error) throw error

    // Registrar auditoría (TODO: crear tabla de auditoría)
    console.warn(`🔒 Cierre forzoso por admin ${adminId} en turno ${turnoId}. Motivo: ${motivo}`)

    revalidatePath('/cajas')
    return { success: true, data: undefined }
  } catch (error: any) {
    console.error('Error al forzar cierre:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Historial de turnos con filtros
 */
export async function getHistorialTurnos(filters?: {
  usuario_id?: string
  caja_id?: string
  desde?: string
  hasta?: string
  estado?: EstadoTurno
}): Promise<Result<TurnoHistorial[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('caja_turnos')
      .select(`
        *,
        caja:cajas(id, nombre),
        usuario:usuarios(id, nombres, apellidos)
      `)
      .order('fecha_apertura', { ascending: false })

    if (filters?.usuario_id) {
      query = query.eq('usuario_id', filters.usuario_id)
    }

    if (filters?.caja_id) {
      query = query.eq('caja_id', filters.caja_id)
    }

    if (filters?.estado) {
      query = query.eq('estado', filters.estado)
    }

    if (filters?.desde) {
      query = query.gte('fecha_apertura', filters.desde)
    }

    if (filters?.hasta) {
      query = query.lte('fecha_apertura', filters.hasta)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error al obtener historial:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Detalle completo de un turno cerrado
 */
export async function getDetalleTurno(turnoId: string): Promise<Result<TurnoDetalle>> {
  try {
    const supabase = await createClient()

    // Obtener turno
    const { data: turno, error: turnoError } = await supabase
      .from('caja_turnos')
      .select(`
        *,
        caja:cajas(id, nombre),
        usuario:usuarios(id, nombres, apellidos)
      `)
      .eq('id', turnoId)
      .single()

    if (turnoError) throw turnoError

    // Obtener movimientos
    const movimientos = await getMovimientosTurno(turnoId)

    // Obtener comprobantes emitidos en el turno
    const { data: comprobantes } = await supabase
      .from('comprobantes')
      .select('*')
      .eq('turno_caja_id', turnoId)
      .order('fecha_emision', { ascending: false })

    // Calcular estadísticas
    const duracionMs = turno.fecha_cierre 
      ? new Date(turno.fecha_cierre).getTime() - new Date(turno.fecha_apertura).getTime()
      : Date.now() - new Date(turno.fecha_apertura).getTime()
    
    const duracionHoras = Math.floor(duracionMs / (1000 * 60 * 60))
    const duracionMinutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60))

    return {
      success: true,
      data: {
        ...turno,
        movimientos: movimientos.success ? movimientos.data : undefined,
        comprobantes: comprobantes || [],
        estadisticas: {
          duracion: `${duracionHoras}h ${duracionMinutos}m`,
          total_transacciones: movimientos.success ? movimientos.data.pagos.length : 0,
          total_comprobantes: comprobantes?.length || 0
        }
      }
    }
  } catch (error: any) {
    console.error('Error al obtener detalle del turno:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener turnos con descuadre (para auditoría)
 */
export async function getTurnosConDescuadre(filters?: {
  desde?: string
  hasta?: string
}): Promise<Result<any[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('caja_turnos')
      .select(`
        *,
        caja:cajas(nombre),
        usuario:usuarios(nombres, apellidos)
      `)
      .eq('estado', 'CERRADA')
      .order('fecha_cierre', { ascending: false })

    if (filters?.desde) {
      query = query.gte('fecha_cierre', filters.desde)
    }

    if (filters?.hasta) {
      query = query.lte('fecha_cierre', filters.hasta)
    }

    const { data, error } = await query

    if (error) throw error

    // Filtrar solo los que tienen diferencia
    const conDescuadre = (data || [])
      .filter(turno => {
        const diferencia_pen = (turno.monto_cierre_declarado || 0) - (turno.monto_cierre_sistema || 0)
        const diferencia_usd = (turno.monto_cierre_declarado_usd || 0) - (turno.monto_cierre_sistema_usd || 0)
        return Math.abs(diferencia_pen) > 0.5 || Math.abs(diferencia_usd) > 0.5
      })
      .map(turno => ({
        ...turno,
        diferencia_pen: (turno.monto_cierre_declarado || 0) - (turno.monto_cierre_sistema || 0),
        diferencia_usd: (turno.monto_cierre_declarado_usd || 0) - (turno.monto_cierre_sistema_usd || 0)
      }))

    return { success: true, data: conDescuadre }
  } catch (error: any) {
    console.error('Error al obtener turnos con descuadre:', error)
    return { success: false, error: error.message }
  }
}
