'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

export type HotelConfig = Database['public']['Tables']['hotel_configuracion']['Row'] & {
  terminos_condiciones?: string | null
  ciudad?: string | null
  region?: string | null
}

/**
 * Obtener la configuración actual del hotel
 * Retorna null si no está configurado
 */
export async function getHotelConfig(): Promise<HotelConfig | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hotel_configuracion')
    .select('*')
    .maybeSingle()

  if (error) {
    logger.error('Error al obtener configuración', { action: 'getHotelConfig', originalError: getErrorMessage(error) })
    return null
  }

  return data
}

/**
 * Actualizar configuración
 * Maneja automáticamente Insert (si está vacía) o Update
 */
export async function updateHotelConfig(data: Partial<HotelConfig>) {
  const supabase = await createClient()

  // 1. Verificar si ya existe un registro real en BD
  const { data: existing, error: searchError } = await supabase
    .from('hotel_configuracion')
    .select('id')
    .maybeSingle()

  if (searchError) {
    return { success: false, error: searchError.message }
  }

  let error;

  if (existing?.id) {
    // 2. ACTUALIZAR existente
    logger.debug('Actualizando configuración', { action: 'updateHotelConfig', configId: existing.id })
    const result = await supabase
      .from('hotel_configuracion')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()

    if (result.data) {
      logger.debug('Configuración actualizada en BD', { action: 'updateHotelConfig' })
    }
    error = result.error
  } else {
    // 3. INSERTAR nuevo (Primera vez) - Usuario debe proporcionar todos los datos
    const result = await supabase
      .from('hotel_configuracion')
      .insert(data)
      .select()
      .single()
    error = result.error
  }

  if (error) {
    logger.error('Error al actualizar configuración', { action: 'updateHotelConfig', originalError: getErrorMessage(error) })
    return { success: false, error: error.message }
  }

  // Revalidación agresiva de caché
  revalidatePath('/', 'layout')
  revalidatePath('/configuracion')
  revalidatePath('/configuracion', 'page')

  return { success: true }
}