'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ROLES_DISPONIBLES } from '@/lib/constants/roles'

// ========================================
// VERIFICAR PERMISOS
// ========================================

export async function verificarEsAdmin() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'ADMIN') {
    throw new Error('No tienes permisos para realizar esta acción')
  }

  return true
}

// ========================================
// ROLES
// ========================================

export async function getRolesDisponibles() {
  return ROLES_DISPONIBLES
}

// ========================================
// USUARIOS
// ========================================

export async function getUsuarios() {
  await verificarEsAdmin()
  
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  
  // 1. Obtener usuarios de la tabla public.usuarios
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  if (!usuarios) return []

  // 2. Obtener emails desde auth.users
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (authError) {
    console.error('Error al obtener usuarios de auth:', authError)
    return usuarios // Retornar sin emails si falla
  }

  // 3. Combinar datos
  const usuariosConEmail = usuarios.map(usuario => {
    const authUser = authUsers?.find(u => u.id === usuario.id)
    return {
      ...usuario,
      email: authUser?.email || null
    }
  })

  return usuariosConEmail
}

export async function getUsuarioActual() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error al obtener usuario:', error)
    return null
  }

  return usuario
}

export async function createUsuario(formData: FormData) {
  await verificarEsAdmin()
  
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient() // Cliente admin para operaciones auth
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nombres = formData.get('nombres') as string
  const apellidos = formData.get('apellidos') as string
  const rol = formData.get('rol') as RolUsuario

  // 1. Crear usuario en Supabase Auth (con cliente admin)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirmar email
  })

  if (authError) {
    console.error('Error al crear usuario en auth:', authError)
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('No se pudo crear el usuario')
  }

  // 2. Crear registro en tabla usuarios
  const { error: dbError } = await supabase
    .from('usuarios')
    .insert({
      id: authData.user.id,
      rol,
      nombres,
      apellidos,
      estado: true
    })

  if (dbError) {
    // Si falla la inserción en DB, intentar eliminar el usuario de Auth
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    console.error('Error al crear usuario en DB:', dbError)
    throw new Error(dbError.message)
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true, userId: authData.user.id }
}

export async function updateUsuario(id: string, formData: FormData) {
  await verificarEsAdmin()
  
  const supabase = await createClient()
  
  const nombres = formData.get('nombres') as string
  const apellidos = formData.get('apellidos') as string
  const rol = formData.get('rol') as RolUsuario
  const estado = formData.get('estado') === 'true'

  const { error } = await supabase
    .from('usuarios')
    .update({
      nombres,
      apellidos,
      rol,
      estado
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

export async function deleteUsuario(id: string) {
  await verificarEsAdmin()
  
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient() // Cliente admin

  // Verificar que no sea el usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === id) {
    throw new Error('No puedes eliminar tu propio usuario')
  }

  // 1. Eliminar de auth (cascade eliminará de usuarios)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
  
  if (authError) {
    console.error('Error al eliminar usuario:', authError)
    throw new Error(authError.message)
  }

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}

export async function resetPasswordUsuario(id: string, nuevaPassword: string) {
  await verificarEsAdmin()
  
  const supabaseAdmin = createAdminClient() // Cliente admin

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: nuevaPassword
  })

  if (error) {
    console.error('Error al resetear contraseña:', error)
    throw new Error(error.message)
  }

  return { success: true }
}

export async function toggleEstadoUsuario(id: string, nuevoEstado: boolean) {
  await verificarEsAdmin()
  
  const supabase = await createClient()

  // Verificar que no sea el usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === id) {
    throw new Error('No puedes desactivar tu propio usuario')
  }

  const { error } = await supabase
    .from('usuarios')
    .update({ estado: nuevoEstado })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/configuracion/usuarios')
  return { success: true }
}
