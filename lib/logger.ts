/**
 * Sistema de Logging Estructurado para el PMS Hotel
 * 
 * Proporciona logging consistente en toda la aplicación con:
 * - Timestamps automáticos
 * - Niveles de log (debug, info, warn, error)
 * - Contexto estructurado (action, userId, etc.)
 * - Formato JSON para fácil parsing
 * 
 * En producción, este logger puede extenderse para enviar
 * logs a servicios externos (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
    /** Nombre de la acción o función */
    action?: string
    /** ID del usuario que ejecuta la acción */
    userId?: string
    /** ID de la reserva involucrada */
    reservaId?: string
    /** ID de la habitación involucrada */
    habitacionId?: string
    /** ID del turno de caja */
    turnoId?: string
    /** Mensaje de error original */
    originalError?: string
    /** Cualquier dato adicional */
    [key: string]: unknown
}

interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: LogContext
}

const LOG_COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m',
}

function formatLog(entry: LogEntry): string {
    const color = LOG_COLORS[entry.level]
    const reset = LOG_COLORS.reset

    if (process.env.NODE_ENV === 'development') {
        // Formato legible para desarrollo
        const contextStr = entry.context
            ? `\n  ${JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n  ')}`
            : ''
        return `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}${contextStr}`
    }

    // JSON compacto para producción
    return JSON.stringify(entry)
}

function log(level: LogLevel, message: string, context?: LogContext): void {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(context && { context }),
    }

    const formattedLog = formatLog(entry)

    switch (level) {
        case 'debug':
            if (process.env.NODE_ENV === 'development') {
                console.debug(formattedLog)
            }
            break
        case 'info':
            console.info(formattedLog)
            break
        case 'warn':
            console.warn(formattedLog)
            break
        case 'error':
            console.error(formattedLog)
            break
    }
}

/**
 * Logger estructurado para el sistema PMS
 * 
 * @example
 * ```ts
 * import { logger } from '@/lib/logger'
 * 
 * logger.info('Check-in completado', { 
 *   action: 'crearCheckIn', 
 *   reservaId: '123' 
 * })
 * 
 * logger.error('Error al cancelar reserva', {
 *   action: 'cancelarReserva',
 *   reservaId: '456',
 *   originalError: getErrorMessage(error)
 * })
 * ```
 */
export const logger = {
    /** Log de debug - solo visible en desarrollo */
    debug: (message: string, context?: LogContext) => log('debug', message, context),

    /** Log de información general */
    info: (message: string, context?: LogContext) => log('info', message, context),

    /** Log de advertencia */
    warn: (message: string, context?: LogContext) => log('warn', message, context),

    /** Log de error */
    error: (message: string, context?: LogContext) => log('error', message, context),
}
