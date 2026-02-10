'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export type AuditLogEntry = {
  id: string
  tabla: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'
  registro_id: string
  usuario_id: string | null
  usuario_nombre?: string
  datos_antes: any
  datos_despues: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AuditFiltros = {
  fecha_inicio?: string
  fecha_fin?: string
  usuario_id?: string
  tabla?: string
  operacion?: string
  limite?: number
}

export async function getAuditLogs(filtros?: AuditFiltros) {
  const supabase = await createClient()

  let query = supabase
    .from('audit_log')
    .select(`
      id,
      tabla,
      operacion,
      registro_id,
      usuario_id,
      datos_antes,
      datos_despues,
      ip_address,
      user_agent,
      created_at,
      usuarios:usuario_id(nombres, apellidos)
    `)
    .order('created_at', { ascending: false })

  if (filtros?.fecha_inicio) {
    query = query.gte('created_at', filtros.fecha_inicio)
  }

  if (filtros?.fecha_fin) {
    query = query.lte('created_at', filtros.fecha_fin + ' 23:59:59')
  }

  if (filtros?.usuario_id) {
    query = query.eq('usuario_id', filtros.usuario_id)
  }

  if (filtros?.tabla) {
    query = query.eq('tabla', filtros.tabla)
  }

  if (filtros?.operacion) {
    query = query.eq('operacion', filtros.operacion)
  }

  const limite = filtros?.limite || 100
  query = query.limit(limite)

  const { data, error } = await query

  if (error) {
    logger.error('Error obteniendo audit logs', { error: error.message })
    return { success: false, error: 'Error cargando auditoría' }
  }

  const logs: AuditLogEntry[] = data.map((log: any) => ({
    ...log,
    usuario_nombre: log.usuarios 
      ? `${log.usuarios.nombres} ${log.usuarios.apellidos || ''}`.trim()
      : 'Sistema'
  }))

  return { success: true, data: logs }
}

export async function getAuditStats(fecha_inicio?: string, fecha_fin?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('audit_log')
    .select('operacion, tabla, usuario_id, created_at')

  if (fecha_inicio) {
    query = query.gte('created_at', fecha_inicio)
  }

  if (fecha_fin) {
    query = query.lte('created_at', fecha_fin + ' 23:59:59')
  }

  const { data, error } = await query

  if (error || !data) {
    return {
      success: false,
      stats: {
        total: 0,
        porOperacion: {},
        porTabla: {},
        usuariosMasActivos: []
      }
    }
  }

  // Calcular estadísticas
  const porOperacion = data.reduce((acc: any, log: any) => {
    acc[log.operacion] = (acc[log.operacion] || 0) + 1
    return acc
  }, {})

  const porTabla = data.reduce((acc: any, log: any) => {
    acc[log.tabla] = (acc[log.tabla] || 0) + 1
    return acc
  }, {})

  const usuariosCount = data.reduce((acc: any, log: any) => {
    if (log.usuario_id) {
      acc[log.usuario_id] = (acc[log.usuario_id] || 0) + 1
    }
    return acc
  }, {})

  // Top 5 usuarios más activos
  const usuariosMasActivos = Object.entries(usuariosCount)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ usuario_id: id, acciones: count }))

  return {
    success: true,
    stats: {
      total: data.length,
      porOperacion,
      porTabla,
      usuariosMasActivos
    }
  }
}

export async function getTablesWithAudit() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select('tabla')

  if (error) return []

  // Obtener lista única de tablas
  const tablas = [...new Set(data.map((row: any) => row.tabla))].sort()
  
  return tablas
}

export async function getUsuariosConActividad() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      usuario_id,
      usuarios:usuario_id(nombres, apellidos)
    `)
    .not('usuario_id', 'is', null)

  if (error || !data) return []

  // Obtener lista única de usuarios
  const usuariosMap = new Map()
  
  data.forEach((log: any) => {
    if (log.usuario_id && log.usuarios) {
      usuariosMap.set(log.usuario_id, {
        id: log.usuario_id,
        nombre: `${log.usuarios.nombres} ${log.usuarios.apellidos || ''}`.trim()
      })
    }
  })

  return Array.from(usuariosMap.values()).sort((a, b) => 
    a.nombre.localeCompare(b.nombre)
  )
}

export async function getDetalleRegistro(tabla: string, registroId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      id,
      operacion,
      datos_antes,
      datos_despues,
      created_at,
      usuarios:usuario_id(nombres, apellidos)
    `)
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .order('created_at', { ascending: true })

  if (error) {
    return { success: false, error: 'Error obteniendo historial' }
  }

  const historial = data.map((log: any) => ({
    ...log,
    usuario_nombre: log.usuarios 
      ? `${log.usuarios.nombres} ${log.usuarios.apellidos || ''}`.trim()
      : 'Sistema'
  }))

  return { success: true, data: historial }
}
