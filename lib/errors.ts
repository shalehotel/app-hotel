/**
 * Utilidades de manejo de errores para el PMS Hotel
 * 
 * Proporciona:
 * - Clases de error personalizadas
 * - Type guards para errores
 * - Funciones helper para extraer mensajes de error
 */

/**
 * Error personalizado de la aplicación
 * Incluye código de error y status HTTP
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message)
        this.name = 'AppError'

        // Mantiene el stack trace correcto en V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError)
        }
    }
}

/**
 * Error de validación (datos inválidos del usuario)
 */
export class ValidationError extends AppError {
    constructor(message: string, code: string = 'VALIDATION_ERROR') {
        super(message, code, 400)
        this.name = 'ValidationError'
    }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends AppError {
    constructor(message: string, code: string = 'NOT_FOUND') {
        super(message, code, 404)
        this.name = 'NotFoundError'
    }
}

/**
 * Error de autorización
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'No autorizado', code: string = 'UNAUTHORIZED') {
        super(message, code, 401)
        this.name = 'UnauthorizedError'
    }
}

/**
 * Error de regla de negocio
 */
export class BusinessRuleError extends AppError {
    constructor(message: string, code: string) {
        super(message, code, 422)
        this.name = 'BusinessRuleError'
    }
}

// ============================================
// Type Guards
// ============================================

/**
 * Verifica si el error es un Error estándar de JavaScript
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error
}

/**
 * Verifica si el error es un AppError personalizado
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError
}

/**
 * Verifica si es un error de Supabase
 */
export function isSupabaseError(
    error: unknown
): error is { message: string; code?: string; details?: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    )
}

/**
 * Verifica si es un error de Zod (validación)
 */
export function isZodError(
    error: unknown
): error is { issues: Array<{ message: string }> } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'issues' in error &&
        Array.isArray((error as Record<string, unknown>).issues)
    )
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extrae el mensaje de error de cualquier tipo de error
 * Maneja de forma segura errores desconocidos
 * 
 * @example
 * ```ts
 * try {
 *   await someOperation()
 * } catch (error: unknown) {
 *   logger.error('Operación falló', { 
 *     originalError: getErrorMessage(error) 
 *   })
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
    // Error estándar de JavaScript
    if (isError(error)) {
        return error.message
    }

    // String directo
    if (typeof error === 'string') {
        return error
    }

    // Objeto con propiedad message
    if (isSupabaseError(error)) {
        return error.message
    }

    // Error de Zod
    if (isZodError(error)) {
        return error.issues[0]?.message || 'Error de validación'
    }

    // Fallback para cualquier otro caso
    return 'Error desconocido'
}

/**
 * Extrae el código de error si está disponible
 */
export function getErrorCode(error: unknown): string | undefined {
    if (isAppError(error)) {
        return error.code
    }

    if (isSupabaseError(error) && 'code' in error) {
        return error.code
    }

    return undefined
}

/**
 * Crea un objeto de respuesta de error consistente
 * para usar en Server Actions
 */
export function createErrorResponse(
    error: unknown,
    defaultMessage: string = 'Error de sistema'
): { error: string; code: string; message?: string } {
    const errorMessage = getErrorMessage(error)
    const errorCode = getErrorCode(error) || 'ERROR_SISTEMA'

    return {
        error: defaultMessage,
        code: errorCode,
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }
}
