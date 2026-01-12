import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Cliente admin con service_role key - PROTEGIDO
 * 
 * Solo usuarios con rol ADMIN pueden usar este cliente.
 * Valida la sesión actual antes de retornar el cliente.
 * 
 * SOLO usar para operaciones administrativas como:
 * - Crear usuarios en auth
 * - Operaciones que requieren bypassing RLS
 * 
 * @throws Error si el usuario no es ADMIN
 */
export async function createAdminClient() {
    // Obtener sesión actual
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        logger.warn('Intento de acceso a admin client sin autenticación', { action: 'createAdminClient' })
        throw new Error('UNAUTHORIZED: Authentication required')
    }

    // Verificar rol en la tabla usuarios
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (error || !usuario || usuario.rol !== 'ADMIN') {
        logger.warn('Intento de acceso a admin client sin permisos', {
            action: 'createAdminClient',
            userId: user.id,
            rol: usuario?.rol || 'unknown'
        })
        throw new Error('UNAUTHORIZED: Admin access required')
    }

    logger.debug('Admin client creado', { action: 'createAdminClient', userId: user.id })

    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

/**
 * Cliente admin SIN validación de rol - USAR CON EXTREMA PRECAUCIÓN
 * 
 * ⚠️ SOLO para operaciones del sistema que NO tienen contexto de usuario:
 * - Triggers/webhooks externos
 * - Migraciones de datos
 * - Operaciones de bootstrap inicial
 * 
 * ❌ NUNCA usar en Server Actions accesibles por usuarios
 */
export function createAdminClientUnsafe() {
    logger.warn('Usando admin client sin validación de rol', { action: 'createAdminClientUnsafe' })

    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

