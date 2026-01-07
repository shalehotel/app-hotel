'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ========================================
// TYPES
// ========================================
export type HotelConfiguracion = {
  id: string
  ruc: string
  razon_social: string
  nombre_comercial: string | null
  direccion_fiscal: string | null
  ubigeo_codigo: string | null
  tasa_igv: number
  tasa_icbper: number
  es_exonerado_igv: boolean
  facturacion_activa: boolean
  proveedor_sunat_config: any
  hora_checkin: string
  hora_checkout: string
  telefono: string | null
  email: string | null
  pagina_web: string | null
  logo_url: string | null
  descripcion: string | null
  updated_at: string
}

// ========================================
// OBTENER CONFIGURACIÓN DEL HOTEL
// ========================================
export async function getHotelConfiguracion(): Promise<HotelConfiguracion | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hotel_configuracion')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching hotel configuration:', error)
    return null
  }

  return data
}

// ========================================
// ACTUALIZAR CONFIGURACIÓN DEL HOTEL
// ========================================
export async function updateHotelConfiguracion(updates: {
  ruc?: string
  razon_social?: string
  nombre_comercial?: string
  direccion_fiscal?: string
  telefono?: string
  email?: string
  pagina_web?: string
  hora_checkin?: string
  hora_checkout?: string
  descripcion?: string
}) {
  const supabase = await createClient()

  // Primero verificamos si existe algún registro
  const { data: existing } = await supabase
    .from('hotel_configuracion')
    .select('id')
    .limit(1)
    .maybeSingle()

  let result

  if (existing) {
    // Actualizar registro existente
    result = await supabase
      .from('hotel_configuracion')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Crear primer registro
    result = await supabase
      .from('hotel_configuracion')
      .insert({
        ...updates,
        updated_at: new Date().toISOString()
      })
  }

  if (result.error) {
    console.error('Error updating hotel configuration:', result.error)
    throw new Error('Error al actualizar la configuración')
  }

  revalidatePath('/configuracion')
  return result.data
}
