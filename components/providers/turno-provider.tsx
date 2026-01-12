'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { getTurnoActivo, type DetalleTurno } from '@/lib/actions/cajas'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type TurnoContextValue = {
    loading: boolean
    turno: DetalleTurno | null
    hasActiveTurno: boolean
    refetchTurno: () => Promise<void>
}

const TurnoContext = createContext<TurnoContextValue | null>(null)

export function TurnoProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [turno, setTurno] = useState<DetalleTurno | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)

    const fetchTurno = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setTurno(null)
                setLoading(false)
                return
            }

            const turnoActivo = await getTurnoActivo(user.id)
            setTurno(turnoActivo)
        } catch (error) {
            console.error('[TurnoContext] Error fetching turno:', error)
            setTurno(null)
        } finally {
            setLoading(false)
        }
    }, [])

    // Setup inicial y realtime (como fallback)
    useEffect(() => {
        fetchTurno()

        // Intentar suscripción realtime (puede no funcionar si la tabla no está habilitada)
        const supabase = createClient()
        const channel = supabase
            .channel('turno-global-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'caja_turnos' },
                () => {
                    console.log('[TurnoContext] Realtime event received')
                    fetchTurno(false)
                }
            )
            .subscribe((status) => {
                console.log('[TurnoContext] Subscription status:', status)
            })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [fetchTurno])

    const value: TurnoContextValue = {
        loading,
        turno,
        hasActiveTurno: !!turno,
        refetchTurno: () => fetchTurno(false)
    }

    return (
        <TurnoContext.Provider value={value}>
            {children}
        </TurnoContext.Provider>
    )
}

export function useTurnoContext() {
    const context = useContext(TurnoContext)
    if (!context) {
        throw new Error('useTurnoContext debe usarse dentro de un TurnoProvider')
    }
    return context
}
