/**
 * CLIENTE NUBEFACT - INTEGRACIÓN REAL CON API
 * 
 * Cliente para enviar comprobantes electrónicos a SUNAT vía NubeFact (OSE).
 * NubeFact maneja:
 * - Generación de XML UBL 2.1
 * - Firma digital
 * - Envío a SUNAT
 * - Generación de PDF y QR
 * - Almacenamiento de CDR
 * 
 * Documentación: https://nubefact.com/api
 */

'use server'

import { getHotelConfig } from '@/lib/actions/configuracion'
import { logger } from '@/lib/logger'

// URLs de API según ambiente
const NUBEFACT_API_DEMO = 'https://demo-api.nubefact.com/api/v1'
const NUBEFACT_API_PROD = 'https://api.nubefact.com/api/v1'

// =====================================================
// TYPES
// =====================================================

export type NubefactConfig = {
  token: string
  ruc: string
  modo_produccion: boolean
  api_url: string
}

export type NubefactResponse = {
  success: boolean
  mensaje?: string
  errors?: string
  enlace?: string        // URL del XML
  enlace_pdf?: string    // URL del PDF
  enlace_del_cdr?: string // URL del CDR
  hash?: string          // Hash CPE
  codigo_sunat?: string  // Código respuesta SUNAT
  aceptada_por_sunat?: boolean
}

export type NubefactComprobanteInput = {
  tipo_comprobante: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO'
  serie: string
  numero: number
  
  // Cliente
  cliente_tipo_documento: string
  cliente_numero_documento: string
  cliente_denominacion: string
  cliente_direccion?: string
  
  // Montos
  fecha_emision: string // YYYY-MM-DD
  moneda: 'PEN' | 'USD'
  tipo_cambio: number
  porcentaje_igv: number
  total_gravada: number
  total_exonerada: number
  total_igv: number
  total: number
  
  // Items
  items: Array<{
    unidad_de_medida: string
    codigo: string
    descripcion: string
    cantidad: number
    valor_unitario: number
    precio_unitario: number
    subtotal: number
    tipo_de_igv: number // 1=Gravado, 2=Exonerado, 3=Inafecto
  }>
  
  // Nota de Crédito (opcional)
  tipo_nota_credito?: string
  motivo_nota_credito?: string
  comprobante_referencia_tipo?: string
  comprobante_referencia_serie?: string
  comprobante_referencia_numero?: number
}

// =====================================================
// CONFIGURACIÓN
// =====================================================

async function getNubefactConfig(): Promise<NubefactConfig> {
  // Token SIEMPRE viene de variables de entorno (seguridad)
  const token = process.env.NUBEFACT_TOKEN
  const mode = process.env.NUBEFACT_MODE || 'demo'
  const envRuc = process.env.NUBEFACT_RUC
  
  if (!token) {
    throw new Error(
      'Token de NubeFact no configurado. ' +
      'Agrega NUBEFACT_TOKEN en el archivo .env.local'
    )
  }
  
  // RUC puede venir de .env o de BD
  const config = await getHotelConfig()
  const ruc = envRuc || config.ruc
  
  if (!ruc || ruc === '20000000001') {
    throw new Error(
      'Debe configurar el RUC real del hotel en Configuración'
    )
  }
  
  const modo_produccion = mode === 'production'
  const api_url = modo_produccion ? NUBEFACT_API_PROD : NUBEFACT_API_DEMO
  
  logger.info('Configuración NubeFact obtenida', {
    ruc,
    modo: mode,
    api_url
  })
  
  return {
    token,
    ruc,
    modo_produccion,
    api_url
  }
}

// =====================================================
// MAPEO DE CÓDIGOS SUNAT
// =====================================================

function mapearTipoDocumento(tipo: string): string {
  const mapeo: Record<string, string> = {
    'DNI': '1',
    'RUC': '6',
    'PASAPORTE': '7',
    'CE': '4',
    'CARNET_EXTRANJERIA': '4'
  }
  return mapeo[tipo] || '1'
}

function mapearTipoComprobante(tipo: string): string {
  const mapeo: Record<string, string> = {
    'BOLETA': '03',
    'FACTURA': '01',
    'NOTA_CREDITO': '07',
    'NOTA_DEBITO': '08'
  }
  return mapeo[tipo] || '03'
}

function mapearMoneda(moneda: string): number {
  return moneda === 'USD' ? 2 : 1
}

// =====================================================
// ENVIAR COMPROBANTE A NUBEFACT
// =====================================================

export async function enviarComprobanteNubefact(
  input: NubefactComprobanteInput
): Promise<NubefactResponse> {
  try {
    const config = await getNubefactConfig()
    
    // Construir payload según especificación NubeFact
    const payload = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: mapearTipoComprobante(input.tipo_comprobante),
      serie: input.serie,
      numero: input.numero,
      sunat_transaction: 1, // 1 = enviar a SUNAT inmediatamente
      
      // Emisor (NubeFact lo obtiene del RUC configurado)
      // No es necesario enviar nombre_comercial, dirección, etc.
      
      // Receptor
      cliente_tipo_de_documento: mapearTipoDocumento(input.cliente_tipo_documento),
      cliente_numero_de_documento: input.cliente_numero_documento,
      cliente_denominacion: input.cliente_denominacion,
      cliente_direccion: input.cliente_direccion || '',
      
      // Fechas y moneda
      fecha_de_emision: input.fecha_emision,
      moneda: mapearMoneda(input.moneda),
      tipo_de_cambio: input.tipo_cambio,
      
      // Montos
      porcentaje_de_igv: input.porcentaje_igv,
      total_gravada: input.total_gravada,
      total_exonerada: input.total_exonerada,
      total_inafecta: 0,
      total_igv: input.total_igv,
      total: input.total,
      
      // Items
      items: input.items.map(item => ({
        unidad_de_medida: item.unidad_de_medida,
        codigo: item.codigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        valor_unitario: item.valor_unitario,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        tipo_de_igv: item.tipo_de_igv
      }))
    }
    
    // Si es Nota de Crédito, agregar referencia
    if (input.tipo_comprobante === 'NOTA_CREDITO' && input.comprobante_referencia_tipo) {
      Object.assign(payload, {
        tipo_de_nota_credito: input.tipo_nota_credito || '01',
        motivo_nota_credito: input.motivo_nota_credito || 'Anulación de la operación',
        codigo_tipo_documento_referencia: mapearTipoComprobante(input.comprobante_referencia_tipo),
        numero_documento_referencia: `${input.comprobante_referencia_serie}-${input.comprobante_referencia_numero}`
      })
    }
    
    logger.info('Enviando comprobante a NubeFact', {
      tipo: input.tipo_comprobante,
      serie: input.serie,
      numero: input.numero,
      total: input.total
    })
    
    // Enviar a NubeFact
    const response = await fetch(`${config.api_url}/invoice/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      logger.error('Error de NubeFact', {
        status: response.status,
        data
      })
      
      return {
        success: false,
        errors: data.errors || data.mensaje || 'Error desconocido de NubeFact',
        mensaje: 'Error al enviar a SUNAT vía NubeFact'
      }
    }
    
    // Respuesta exitosa
    logger.info('Comprobante enviado exitosamente', {
      hash: data.hash,
      aceptado: data.aceptada_por_sunat
    })
    
    return {
      success: true,
      mensaje: 'Comprobante enviado correctamente',
      enlace: data.enlace,
      enlace_pdf: data.enlace_pdf,
      enlace_del_cdr: data.enlace_del_cdr,
      hash: data.hash,
      codigo_sunat: data.codigo_sunat,
      aceptada_por_sunat: data.aceptada_por_sunat !== false
    }
    
  } catch (error: any) {
    logger.error('Error al conectar con NubeFact', {
      error: error.message
    })
    
    return {
      success: false,
      errors: error.message,
      mensaje: 'Error de conexión con NubeFact'
    }
  }
}

// =====================================================
// CONSULTAR ESTADO DE COMPROBANTE
// =====================================================

export async function consultarEstadoNubefact(
  tipo_comprobante: string,
  serie: string,
  numero: number
): Promise<NubefactResponse> {
  try {
    const config = await getNubefactConfig()
    
    const payload = {
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: mapearTipoComprobante(tipo_comprobante),
      serie,
      numero
    }
    
    const response = await fetch(`${config.api_url}/consultar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    return {
      success: response.ok,
      mensaje: data.mensaje,
      aceptada_por_sunat: data.aceptada_por_sunat
    }
    
  } catch (error: any) {
    logger.error('Error al consultar estado en NubeFact', {
      error: error.message
    })
    
    return {
      success: false,
      errors: error.message
    }
  }
}
