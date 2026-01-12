'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getTurnoActivo, type DetalleTurno } from '@/lib/actions/cajas'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type CheckTurnoResult = {
  loading: boolean
  required: boolean // Si el usuario necesita tener turno (RECEPCION)
  hasActiveTurno: boolean
  turno: DetalleTurno | null
  refetch: () => Promise<void>
}

/**
 * Hook para verificar si el usuario actual tiene turno de caja abierto
 * Incluye suscripción Realtime para actualizaciones automáticas
 */
export function useCheckTurno(): CheckTurnoResult {
  const [loading, setLoading] = useState(true)
  const [required, setRequired] = useState(false)
  const [hasActiveTurno, setHasActiveTurno] = useState(false)
  const [turno, setTurno] = useState<DetalleTurno | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchTurnoStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    try {
      const supabase = supabaseRef.current

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Obtener rol del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      const esRecepcion = usuario?.rol === 'RECEPCION'
      setRequired(esRecepcion)

      // Intentar obtener turno activo
      const turnoActivo = await getTurnoActivo(user.id)

      if (turnoActivo) {
        setHasActiveTurno(true)
        setTurno(turnoActivo)
      } else {
        setHasActiveTurno(false)
        setTurno(null)
      }
    } catch (error) {
      console.error('Error al verificar turno:', error)
      setHasActiveTurno(false)
      setTurno(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Configurar suscripción Realtime
  useEffect(() => {
    const supabase = supabaseRef.current

    // Primero, fetch inicial
    fetchTurnoStatus()

    // Suscribirse a cambios en caja_turnos
    const channel = supabase
      .channel('turno-activo-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'caja_turnos'
        },
        (payload) => {
          console.log('[Realtime] Cambio en caja_turnos:', payload.eventType)

          // Al detectar cualquier cambio, refetch sin mostrar loading
          // Esto es más simple y robusto que filtrar por usuario aquí
          fetchTurnoStatus(false)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Suscrito a cambios de turnos')
        }
      })

    channelRef.current = channel

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchTurnoStatus])

  return {
    loading,
    required,
    hasActiveTurno,
    turno,
    refetch: () => fetchTurnoStatus(true)
  }
}
