'use client'

import { useEffect, useState } from 'react'
import { getTurnoActivoByUsuario, type TurnoActivo } from '@/lib/actions/turnos'
import { createClient } from '@/lib/supabase/client'

type CheckTurnoResult = {
  loading: boolean
  required: boolean // Si el usuario necesita tener turno (RECEPCION)
  hasActiveTurno: boolean
  turno: TurnoActivo | null
  refetch: () => Promise<void>
}

/**
 * Hook para verificar si el usuario actual tiene turno de caja abierto
 * Solo aplica para usuarios con rol RECEPCION
 */
export function useCheckTurno(): CheckTurnoResult {
  const [loading, setLoading] = useState(true)
  const [required, setRequired] = useState(false)
  const [hasActiveTurno, setHasActiveTurno] = useState(false)
  const [turno, setTurno] = useState<TurnoActivo | null>(null)

  const fetchTurnoStatus = async () => {
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener rol del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      // Solo validar turno para RECEPCION
      if (usuario?.rol !== 'RECEPCION') {
        setRequired(false)
        setHasActiveTurno(true) // No necesita turno
        setTurno(null)
        setLoading(false)
        return
      }

      // Usuario es RECEPCION, verificar turno activo
      setRequired(true)
      const result = await getTurnoActivoByUsuario(user.id)

      if (result.success && result.data) {
        setHasActiveTurno(true)
        setTurno(result.data)
      } else {
        setHasActiveTurno(false)
        setTurno(null)
      }
    } catch (error) {
      console.error('Error al verificar turno:', error)
      setRequired(false)
      setHasActiveTurno(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTurnoStatus()
  }, [])

  return {
    loading,
    required,
    hasActiveTurno,
    turno,
    refetch: fetchTurnoStatus
  }
}
