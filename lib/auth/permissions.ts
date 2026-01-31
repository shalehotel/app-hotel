import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLES, type RolUsuario } from '@/lib/constants/roles'
import { logger } from '@/lib/logger'

/**
 * Verifica si el usuario actual tiene uno de los roles permitidos.
 * Si no está autenticado, redirige a login.
 * Si está autenticado pero no tiene permiso, lanza un Error.
 */
export async function requireRole(allowedRoles: RolUsuario[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Obtener rol del usuario desde la tabla usuarios
    // Usamos maybeSingle para manejar casos donde el usuario auth existe pero no tiene registro en public.usuarios
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()

    if (error) {
        logger.error('Error verificando rol de usuario', { userId: user.id, error: error.message })
        throw new Error('Error de autorización al verificar permisos.')
    }

    if (!usuario || !usuario.rol) {
        logger.warn('Usuario sin rol intentó acción protegida', { userId: user.id })
        throw new Error('No tienes un rol asignado para realizar esta acción.')
    }

    if (!allowedRoles.includes(usuario.rol as RolUsuario)) {
        logger.warn('Acceso denegado por rol insuficiente', {
            userId: user.id,
            userRole: usuario.rol,
            requiredRoles: allowedRoles
        })
        throw new Error('No tienes permisos suficientes para realizar esta acción.')
    }

    return { user, role: usuario.rol as RolUsuario }
}

/**
 * Verifica si el usuario es ADMIN. Shortcut común.
 */
export async function requireAdmin() {
    return requireRole([ROLES.ADMIN])
}

/**
 * Verifica si el usuario puede operar (ADMIN o RECEPCION).
 * Común para Check-in, Pagos, Reservas.
 */
export async function requireOperador() {
    return requireRole([ROLES.ADMIN, ROLES.RECEPCION])
}
