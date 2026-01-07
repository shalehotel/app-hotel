'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ========================================
// TIPOS DE HABITACIÓN
// ========================================

export async function getTiposHabitacion() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tipos_habitacion')
    .select('*')
    .order('nombre')
  
  if (error) throw error
  return data
}

export async function createTipoHabitacion(formData: FormData) {
  const supabase = await createClient()
  
  const nombre = formData.get('nombre') as string
  const capacidad_personas = parseInt(formData.get('capacidad_personas') as string)
  
  const { error } = await supabase
    .from('tipos_habitacion')
    .insert({ nombre, capacidad_personas })
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function updateTipoHabitacion(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const nombre = formData.get('nombre') as string
  const capacidad_personas = parseInt(formData.get('capacidad_personas') as string)
  
  const { error } = await supabase
    .from('tipos_habitacion')
    .update({ nombre, capacidad_personas })
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function deleteTipoHabitacion(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tipos_habitacion')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

// ========================================
// CATEGORÍAS DE HABITACIÓN
// ========================================

export async function getCategoriasHabitacion() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('categorias_habitacion')
    .select('*')
    .order('nombre')
  
  if (error) throw error
  return data
}

export async function createCategoriaHabitacion(formData: FormData) {
  const supabase = await createClient()
  
  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  
  const { error } = await supabase
    .from('categorias_habitacion')
    .insert({ nombre, descripcion })
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function updateCategoriaHabitacion(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  
  const { error } = await supabase
    .from('categorias_habitacion')
    .update({ nombre, descripcion })
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function deleteCategoriaHabitacion(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('categorias_habitacion')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

// ========================================
// HABITACIONES
// ========================================

export async function getHabitaciones() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('habitaciones')
    .select(`
      *,
      tipos_habitacion:tipo_id (id, nombre, capacidad_personas),
      categorias_habitacion:categoria_id (id, nombre)
    `)
    .order('numero')
  
  if (error) throw error
  return data
}

export async function createHabitacion(formData: FormData) {
  const supabase = await createClient()
  
  const numero = formData.get('numero') as string
  const piso = formData.get('piso') as string
  const tipo_id = formData.get('tipo_id') as string
  const categoria_id = formData.get('categoria_id') as string
  
  const { error } = await supabase
    .from('habitaciones')
    .insert({
      numero,
      piso,
      tipo_id,
      categoria_id,
      estado_ocupacion: 'LIBRE',
      estado_limpieza: 'LIMPIA',
      estado_servicio: 'OPERATIVA'
    })
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function updateHabitacion(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const numero = formData.get('numero') as string
  const piso = formData.get('piso') as string
  const tipo_id = formData.get('tipo_id') as string
  const categoria_id = formData.get('categoria_id') as string
  
  const { error } = await supabase
    .from('habitaciones')
    .update({
      numero,
      piso,
      tipo_id,
      categoria_id
    })
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function deleteHabitacion(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('habitaciones')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}

export async function updateEstadoHabitacion(
  id: string,
  campo: 'estado_ocupacion' | 'estado_limpieza' | 'estado_servicio',
  valor: string
) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('habitaciones')
    .update({ [campo]: valor })
    .eq('id', id)
  
  if (error) throw error
  
  revalidatePath('/configuracion/habitaciones')
  return { success: true }
}
