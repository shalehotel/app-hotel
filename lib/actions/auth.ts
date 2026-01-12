'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

// Schema de validación
const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type LoginState = {
    error?: string
    success?: boolean
}

export async function login(prevState: LoginState | null, formData: FormData): Promise<LoginState> {
    try {
        // 1. Validar datos
        const rawData = {
            email: formData.get('email'),
            password: formData.get('password'),
        }

        const validated = loginSchema.parse(rawData)

        // 2. Autenticar con Supabase
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
            email: validated.email,
            password: validated.password,
        })

        if (error) {
            return { error: error.message }
        }

        if (!data.user) {
            return { error: 'Error al iniciar sesión' }
        }

        // 3. Verificar que el usuario existe en la tabla usuarios
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuarios')
            .select('id, nombres, apellidos, rol, estado')
            .eq('id', data.user.id)
            .single()

        if (usuarioError || !usuario) {
            logger.warn('Intento de login sin usuario en tabla usuarios', {
                action: 'login',
                userId: data.user.id,
                originalError: usuarioError ? getErrorMessage(usuarioError) : 'Usuario no encontrado en BD',
            })
            // Usuario autenticado pero no existe en la tabla usuarios
            await supabase.auth.signOut()
            return { error: 'Usuario no autorizado' }
        }

        if (!usuario.estado) {
            await supabase.auth.signOut()
            return { error: 'Usuario inactivo. Contacte al administrador' }
        }

        return { success: true }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message }
        }
        return { error: 'Error al iniciar sesión' }
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function getUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    // Obtener datos completos del usuario
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        logger.error('Error al obtener usuario de BD', {
            action: 'getUser',
            userId: user.id,
            originalError: getErrorMessage(error),
        })
        return null
    }

    return usuario
}

