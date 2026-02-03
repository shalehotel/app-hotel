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
  hora_checkout: '12:00:00',
  proveedor_metadata: null,
  terminos_condiciones: `1.- LA HORA HOTELERA CUMPLE A LAS 13 HORAS.
2.- PROHIBIDO FUMAR EN LA HABITACIÓN SEGÚN LEY 29517
3.- EVITAR QUE LAS LLAVES DE AGUA QUEDEN ABIERTAS Y DESCONECTAR LOS DISPOSITIVOS ELÉCTRICOS.
4.- EL HUÉSPED ESTÁ OBLIGADO A DECLARAR EL NÚMERO EXACTO DE PERSONAS QUE UTILIZARÁN LA HABITACIÓN Y PAGAR EL IMPORTE POR PERSONAS EXTRAS. DE NO HACERLO ASÍ, LAS PERSONAS NO REGISTRADAS NO PODRÁN PASAR LA NOCHE EN EL HOTEL.
5.- EL HOTEL NO ES RESPONSABLE POR OBJETOS OLVIDADOS EN ÁREAS PÚBLICAS DEL ESTABLECIMIENTO.
6.- LOS HUÉSPEDES QUE PRESENTEN UNA ACTITUD AGRESIVA, AMENAZANTE O QUE FALTEN AL RESPETO YA SEA AL PERSONAL DEL HOTEL U OTROS HUÉSPEDES DEBERÁN ABANDONAR EL HOTEL DE INMEDIATO Y SERÁN DENUNCIADOS ANTE LA AUTORIDAD COMPETENTE.`,
  ciudad: 'Chachapoyas',
  region: 'Amazonas - Perú'
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
    logger.error('Error al obtener configuración', { action: 'getHotelConfig', originalError: getErrorMessage(error) })
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
    logger.error('Error al actualizar configuración', { action: 'updateHotelConfig', originalError: getErrorMessage(error) })
    return { success: false, error: error.message }
  }

  // Revalidación agresiva de caché
  revalidatePath('/', 'layout')
  revalidatePath('/configuracion')
  revalidatePath('/configuracion', 'page')

  return { success: true }
}