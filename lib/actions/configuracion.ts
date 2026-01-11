'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

export type HotelConfig = Database['public']['Tables']['hotel_configuracion']['Row']

// Valores por defecto si no hay configuración
const DEFAULT_CONFIG: Partial<HotelConfig> = {
  ruc: '20000000001',
  razon_social: 'MI HOTEL S.A.C.',
  nombre_comercial: 'Mi Hotel',
  direccion_fiscal: 'Av. Principal 123',
  tasa_igv: 18.00,
  tasa_icbper: 0.50,
  moneda_principal: 'PEN',
  es_exonerado_igv: false,
  facturacion_activa: false,
  hora_checkin: '14:00:00',
  hora_checkout: '12:00:00'
}

/**
 * Obtener la configuración actual del hotel
 * Cacheada por defecto por Next.js
 */
export async function getHotelConfig(): Promise<HotelConfig> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hotel_configuracion')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error fetching config:', error)
    return DEFAULT_CONFIG as HotelConfig
  }

  if (!data) {
    // Es normal la primera vez
    return DEFAULT_CONFIG as HotelConfig
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
    console.log('Actualizando configuración ID:', existing.id, 'Datos:', data)
    const result = await supabase
      .from('hotel_configuracion')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single()
      
    if (result.data) {
        console.log('Configuración actualizada en BD:', result.data)
    }
    error = result.error
  } else {
    // 3. INSERTAR nuevo (Primera vez)
    const payload = {
      ...DEFAULT_CONFIG,
      ...data,
    }
    const result = await supabase
      .from('hotel_configuracion')
      .insert(payload)
      .select()
      .single()
    error = result.error
  }

  if (error) {
    console.error('Error updating config:', error)
    return { success: false, error: error.message }
  }

  // Revalidación agresiva de caché
  revalidatePath('/', 'layout') 
  revalidatePath('/configuracion')
  revalidatePath('/configuracion', 'page')
  
  return { success: true }
}