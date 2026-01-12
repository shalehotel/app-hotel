'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

// ========================================
// TYPES
// ========================================
export type Tarifa = {
  id: string
  tipo_habitacion_id: string
  categoria_habitacion_id: string
  nombre_tarifa: string
  precio_base: number
  precio_minimo: number
  fecha_inicio: string | null
  fecha_fin: string | null
  activa: boolean
  created_at: string
  tipos_habitacion?: { nombre: string }
  categorias_habitacion?: { nombre: string }
}

// ========================================
// OBTENER TARIFAS
// ========================================
export async function getTarifas() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tarifas')
    .select(`
      *,
      tipos_habitacion (nombre),
      categorias_habitacion (nombre)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error al obtener tarifas', { action: 'getTarifas', originalError: getErrorMessage(error) })
    throw new Error('Error al obtener tarifas')
  }

  return data as Tarifa[]
}

// ========================================
// CREAR TARIFA
// ========================================
export async function createTarifa(formData: FormData) {
  const supabase = await createClient()

  const tipo_habitacion_id = formData.get('tipo_habitacion_id') as string
  const categoria_habitacion_id = formData.get('categoria_habitacion_id') as string
  const nombre_tarifa = formData.get('nombre_tarifa') as string
  const precio_base = parseFloat(formData.get('precio_base') as string)
  const precio_minimo = parseFloat(formData.get('precio_minimo') as string)
  const fecha_inicio = formData.get('fecha_inicio') as string | null
  const fecha_fin = formData.get('fecha_fin') as string | null

  // Validaciones
  if (!tipo_habitacion_id || !categoria_habitacion_id || !nombre_tarifa) {
    throw new Error('Todos los campos son requeridos')
  }

  if (precio_minimo > precio_base) {
    throw new Error('El precio mínimo no puede ser mayor al precio base')
  }

  if (precio_base <= 0 || precio_minimo <= 0) {
    throw new Error('Los precios deben ser mayores a 0')
  }

  const { error } = await supabase.from('tarifas').insert({
    tipo_habitacion_id,
    categoria_habitacion_id,
    nombre_tarifa,
    precio_base,
    precio_minimo,
    fecha_inicio: fecha_inicio || null,
    fecha_fin: fecha_fin || null,
    activa: true
  })

  if (error) {
    logger.error('Error al crear tarifa', { action: 'createTarifa', originalError: getErrorMessage(error) })
    throw new Error('Error al crear tarifa')
  }

  revalidatePath('/configuracion/tarifas')
}

// ========================================
// ACTUALIZAR TARIFA
// ========================================
export async function updateTarifa(id: string, formData: FormData) {
  const supabase = await createClient()

  const nombre_tarifa = formData.get('nombre_tarifa') as string
  const precio_base = parseFloat(formData.get('precio_base') as string)
  const precio_minimo = parseFloat(formData.get('precio_minimo') as string)
  const fecha_inicio = formData.get('fecha_inicio') as string | null
  const fecha_fin = formData.get('fecha_fin') as string | null

  // Validaciones
  if (!nombre_tarifa) {
    throw new Error('El nombre es requerido')
  }

  if (precio_minimo > precio_base) {
    throw new Error('El precio mínimo no puede ser mayor al precio base')
  }

  if (precio_base <= 0 || precio_minimo <= 0) {
    throw new Error('Los precios deben ser mayores a 0')
  }

  const { error } = await supabase
    .from('tarifas')
    .update({
      nombre_tarifa,
      precio_base,
      precio_minimo,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null
    })
    .eq('id', id)

  if (error) {
    logger.error('Error al actualizar tarifa', { action: 'updateTarifa', originalError: getErrorMessage(error) })
    throw new Error('Error al actualizar tarifa')
  }

  revalidatePath('/configuracion/tarifas')
}

// ========================================
// TOGGLE ESTADO TARIFA
// ========================================
export async function toggleTarifaActiva(id: string, activa: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tarifas')
    .update({ activa })
    .eq('id', id)

  if (error) {
    logger.error('Error al cambiar estado de tarifa', { action: 'toggleTarifaActiva', originalError: getErrorMessage(error) })
    throw new Error('Error al cambiar estado de tarifa')
  }

  revalidatePath('/configuracion/tarifas')
}

// ========================================
// ELIMINAR TARIFA
// ========================================
export async function deleteTarifa(id: string) {
  const supabase = await createClient()

  // Verificar si está en uso
  const { data: reservas } = await supabase
    .from('reservas')
    .select('id')
    .limit(1)

  // Por seguridad, mejor desactivar que eliminar
  const { error } = await supabase
    .from('tarifas')
    .update({ activa: false })
    .eq('id', id)

  if (error) {
    logger.error('Error al eliminar tarifa', { action: 'deleteTarifa', originalError: getErrorMessage(error) })
    throw new Error('Error al eliminar tarifa')
  }

  revalidatePath('/configuracion/tarifas')
}
