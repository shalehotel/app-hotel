/**
 * SERVICIO PERUAPI — Consultas DNI/RUC
 * 
 * Consulta datos de RENIEC (DNI) y SUNAT (RUC) vía PeruAPI.
 * El token se almacena server-side para no exponerlo al cliente.
 * 
 * Documentación: https://peruapi.com/documentacion
 * 
 * Endpoints (apis.net.pe v1 público + Fallback RUC Sunat):
 * - DNI: GET /v1/dni?numero={numero}
 * - RUC: GET /v1/ruc?numero={numero}
 * 
 * Auth: Ninguna (Público)
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

const API_BASE_URL = 'https://api.apis.net.pe/v1'
const TIMEOUT_MS = 6000

// =====================================================
// HELPER: GENERAR RUC A PARTIR DE DNI (Módulo 11 SUNAT)
// =====================================================
function calcularRucDesdeDni(dni: string): string {
    const rucBase = '10' + dni
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    let suma = 0
    for (let i = 0; i < 10; i++) {
        suma += parseInt(rucBase[i]) * factores[i]
    }
    const rem = 11 - (suma % 11)
    const digito = rem === 10 ? 0 : rem === 11 ? 1 : rem
    return rucBase + digito
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
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        // 1. Intentar consultar primeramente en RENIEC
        let response = await fetch(
            `${API_BASE_URL}/dni?numero=${numero}`,
            {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            }
        )

        let data = response.ok ? await response.json() : null

        // 2. Si falla o no se encuentra (404/429/etc), usar FALLBACK (Consultar RUC en SUNAT)
        if (!response.ok || !data || !data.nombre) {
            const rucGenerado = calcularRucDesdeDni(numero)
            const responseRuc = await fetch(
                `${API_BASE_URL}/ruc?numero=${rucGenerado}`,
                {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                }
            )

            if (responseRuc.ok) {
                const rucData = await responseRuc.json()
                if (rucData && rucData.nombre) {
                    // Mapear los datos de SUNAT como si fueran de RENIEC
                    data = rucData
                    data.numeroDocumento = numero // Asegurar que el DNI original se mantenga
                }
            }
        }

        clearTimeout(timeoutId)

        if (!data || !data.nombre) {
            return { success: false, error: 'DNI no encontrado en registros públicos' }
        }

        // Parsear el nombre ("SALAZAR ALVA JUAN CARLOS")
        const partes = data.nombre.split(' ')
        const apellidoPaterno = partes[0] || ''
        const apellidoMaterno = partes.length > 2 ? partes[1] : ''
        const nombres = partes.length > 2 ? partes.slice(2).join(' ') : (partes[1] || '')

        return {
            success: true,
            dni: data.numeroDocumento || numero,
            nombres: nombres,
            apellidoPaterno: apellidoPaterno,
            apellidoMaterno: apellidoMaterno,
            nombreCompleto: data.nombre.trim(),
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
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch(
            `${API_BASE_URL}/ruc?numero=${numero}`,
            {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'RUC no encontrado en SUNAT' }
            }
            if (response.status === 429) {
                return { success: false, error: 'Demasiadas consultas. Intente en unos segundos' }
            }
            return { success: false, error: `Error del servicio (código ${response.status})` }
        }

        const data = await response.json()

        if (!data || !data.nombre) {
            return { success: false, error: 'RUC no encontrado en SUNAT' }
        }

        return {
            success: true,
            ruc: data.numeroDocumento || numero,
            razonSocial: data.nombre || '',
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
