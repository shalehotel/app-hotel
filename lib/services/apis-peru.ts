/**
 * SERVICIO PERUAPI — Consultas DNI/RUC
 * 
 * Consulta datos de RENIEC (DNI) y SUNAT (RUC) vía PeruAPI.
 * El token se almacena server-side para no exponerlo al cliente.
 * 
 * Documentación: https://peruapi.com/documentacion
 * 
 * Endpoints:
 * - DNI: GET /api/dni/{numero}
 * - RUC: GET /api/ruc/{numero}
 * 
 * Auth: Header X-API-KEY
 */

// =====================================================
// TYPES
// =====================================================

export interface ResultadoDNI {
    success: true
    dni: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    nombreCompleto: string // campo "cliente" del API
}

export interface ResultadoRUC {
    success: true
    ruc: string
    razonSocial: string
    direccion: string
    estado: string       // ACTIVO, BAJA DE OFICIO, etc.
    condicion: string    // HABIDO, NO HABIDO, etc.
    departamento: string
    provincia: string
    distrito: string
    ubigeo: string
}

export interface ResultadoError {
    success: false
    error: string
}

export type ResultadoConsultaDNI = ResultadoDNI | ResultadoError
export type ResultadoConsultaRUC = ResultadoRUC | ResultadoError

// =====================================================
// CONFIG
// =====================================================

const API_BASE_URL = 'https://peruapi.com/api'
const TIMEOUT_MS = 8000

function getToken(): string {
    const token = process.env.PERU_API_TOKEN
    if (!token) {
        throw new Error('PERU_API_TOKEN no está configurado en las variables de entorno')
    }
    return token
}

// =====================================================
// CONSULTAR DNI (RENIEC)
// =====================================================

export async function consultarDNI(numero: string): Promise<ResultadoConsultaDNI> {
    // Validar formato
    if (!/^\d{8}$/.test(numero)) {
        return { success: false, error: 'El DNI debe tener exactamente 8 dígitos numéricos' }
    }

    try {
        const token = getToken()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch(
            `${API_BASE_URL}/dni/${numero}?summary=0&plan=0`,
            {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-KEY': token
                }
            }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'DNI no encontrado en RENIEC' }
            }
            if (response.status === 401) {
                return { success: false, error: 'Token de PeruAPI inválido o IP no autorizada' }
            }
            if (response.status === 429) {
                return { success: false, error: 'Demasiadas consultas. Intente en unos segundos' }
            }
            if (response.status === 400) {
                return { success: false, error: 'Formato de DNI inválido' }
            }
            return { success: false, error: `Error del servicio (código ${response.status})` }
        }

        const data = await response.json()

        // PeruAPI devuelve code "200" para éxito
        if (!data || data.code === '404' || (!data.nombres && !data.cliente)) {
            return { success: false, error: 'DNI no encontrado en RENIEC' }
        }

        return {
            success: true,
            dni: data.dni || numero,
            nombres: data.nombres || '',
            apellidoPaterno: data.apellido_paterno || '',
            apellidoMaterno: data.apellido_materno || '',
            nombreCompleto: data.cliente || `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`.trim(),
        }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Tiempo de espera agotado. Intente nuevamente' }
        }
        console.error('[PeruAPI] Error consultando DNI:', error)
        return { success: false, error: 'Error de conexión con el servicio de consulta DNI' }
    }
}

// =====================================================
// CONSULTAR RUC (SUNAT)
// =====================================================

export async function consultarRUC(numero: string): Promise<ResultadoConsultaRUC> {
    // Validar formato
    if (!/^\d{11}$/.test(numero)) {
        return { success: false, error: 'El RUC debe tener exactamente 11 dígitos numéricos' }
    }

    // Validar prefijos válidos
    const prefix = numero.substring(0, 2)
    const validPrefixes = ['10', '15', '17', '20']
    if (!validPrefixes.includes(prefix)) {
        return { success: false, error: 'RUC inválido: debe comenzar con 10, 15, 17 o 20' }
    }

    try {
        const token = getToken()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch(
            `${API_BASE_URL}/ruc/${numero}?summary=0&plan=0`,
            {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-KEY': token
                }
            }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'RUC no encontrado en SUNAT' }
            }
            if (response.status === 401) {
                return { success: false, error: 'Token de PeruAPI inválido o IP no autorizada' }
            }
            if (response.status === 429) {
                return { success: false, error: 'Demasiadas consultas. Intente en unos segundos' }
            }
            if (response.status === 400) {
                return { success: false, error: 'Formato de RUC inválido' }
            }
            return { success: false, error: `Error del servicio (código ${response.status})` }
        }

        const data = await response.json()

        if (!data || data.code === '404' || !data.razon_social) {
            return { success: false, error: 'RUC no encontrado en SUNAT' }
        }

        return {
            success: true,
            ruc: data.ruc || numero,
            razonSocial: data.razon_social || '',
            direccion: data.direccion || '',
            estado: data.estado || '',
            condicion: data.condicion || '',
            departamento: data.departamento || '',
            provincia: data.provincia || '',
            distrito: data.distrito || '',
            ubigeo: data.ubigeo || '',
        }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Tiempo de espera agotado. Intente nuevamente' }
        }
        console.error('[PeruAPI] Error consultando RUC:', error)
        return { success: false, error: 'Error de conexión con el servicio de consulta RUC' }
    }
}
