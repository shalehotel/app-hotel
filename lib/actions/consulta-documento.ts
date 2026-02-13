'use server'

import { consultarDNI, consultarRUC } from '@/lib/services/apis-peru'
import { createClient } from '@/lib/supabase/server'

// =====================================================
// TYPES
// =====================================================

export interface DatosDocumento {
    // Datos de la API (RENIEC/SUNAT)
    nombres?: string
    apellidos?: string       // apellidoPaterno + apellidoMaterno para DNI
    razon_social?: string    // Solo para RUC
    direccion?: string       // Solo para RUC
    estado_ruc?: string      // Solo para RUC: ACTIVO, BAJA, etc.
    condicion_ruc?: string   // Solo para RUC: HABIDO, NO HABIDO
    // Datos de la BD local (huésped existente)
    huesped_existente?: {
        id: string
        pais: string | null
        procedencia_departamento: string | null
        procedencia_ciudad: string | null
        correo: string | null
        telefono: string | null
        fecha_nacimiento: string | null
        sexo: string | null
        notas_internas: string | null
        es_frecuente: boolean
    }
}

export interface ResultadoConsulta {
    success: boolean
    data?: DatosDocumento
    error?: string
    advertencia?: string  // Para RUC con estado BAJA o condición NO HABIDO
}

// =====================================================
// CONSULTAR DOCUMENTO (DNI o RUC)
// Combina datos de APISPerú + BD local
// =====================================================

export async function consultarDocumento(
    tipo: 'DNI' | 'RUC',
    numero: string
): Promise<ResultadoConsulta> {
    if (!numero || numero.trim() === '') {
        return { success: false, error: 'Ingrese un número de documento' }
    }

    const num = numero.trim()
    const resultado: DatosDocumento = {}
    let advertencia: string | undefined

    // -----------------------------------------------
    // 1. Consultar APISPerú
    // -----------------------------------------------
    if (tipo === 'DNI') {
        const apiResult = await consultarDNI(num)

        if (apiResult.success) {
            resultado.nombres = apiResult.nombres
            resultado.apellidos = `${apiResult.apellidoPaterno} ${apiResult.apellidoMaterno}`.trim()
        } else {
            // La API no encontró el DNI — devolver el error pero seguir buscando en BD local
            // para no bloquear si la API tiene problemas temporales
            return { success: false, error: apiResult.error }
        }
    } else if (tipo === 'RUC') {
        const apiResult = await consultarRUC(num)

        if (apiResult.success) {
            resultado.razon_social = apiResult.razonSocial
            resultado.direccion = apiResult.direccion
            resultado.estado_ruc = apiResult.estado
            resultado.condicion_ruc = apiResult.condicion

            // Verificar estado del contribuyente
            const estadoUpper = (apiResult.estado || '').toUpperCase()
            const condicionUpper = (apiResult.condicion || '').toUpperCase()

            if (estadoUpper !== 'ACTIVO') {
                advertencia = `⚠️ RUC con estado: ${apiResult.estado}`
            } else if (condicionUpper !== 'HABIDO') {
                advertencia = `⚠️ RUC con condición: ${apiResult.condicion}`
            }
        } else {
            return { success: false, error: apiResult.error }
        }
    }

    // -----------------------------------------------
    // 2. Buscar en BD local (datos complementarios)
    // Solo para DNI — busca huésped existente
    // -----------------------------------------------
    if (tipo === 'DNI') {
        try {
            const supabase = await createClient()
            const { data: huesped } = await supabase
                .from('huespedes')
                .select('id, pais, procedencia_departamento, procedencia_ciudad, correo, telefono, fecha_nacimiento, sexo, notas_internas, es_frecuente')
                .eq('tipo_documento', tipo)
                .eq('numero_documento', num)
                .is('deleted_at', null)
                .single()

            if (huesped) {
                resultado.huesped_existente = huesped as any
            }
        } catch {
            // No es crítico si la BD local falla
        }
    }

    return {
        success: true,
        data: resultado,
        advertencia,
    }
}
