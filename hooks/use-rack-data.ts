'use client'

// Hook para gestión de datos del Rack
import { useEffect, useState, useCallback, useRef } from 'react'
import { addDays, startOfDay } from 'date-fns'
import {
  getRackHabitaciones,
  getRackReservas,
  getRackKPIs,
  getTareasDelDia,
} from '@/lib/actions/rack'
import type { RackHabitacion, RackReserva, RackKPIs } from '@/types/rack'

type TareasDelDia = {
  checkins: any[]
  checkouts: any[]
}

export function useRackData(daysRange = 30) {
  const [habitaciones, setHabitaciones] = useState<RackHabitacion[]>([])
  const [reservas, setReservas] = useState<RackReserva[]>([])
  const [kpis, setKpis] = useState<RackKPIs>({
    llegadas: 0,
    salidas: 0,
    sucias: 0,
    ocupadas: 0
  })
  const [tareas, setTareas] = useState<TareasDelDia>({
    checkins: [],
    checkouts: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Flag para saber si ya se cargaron las habitaciones
  const habitacionesCargadas = useRef(false)

  // Calcular rango de fechas: 3 días de contexto pasado, el resto futuro
  const today = startOfDay(new Date())
  const PAST_DAYS_CONTEXT = 3
  const startDate = addDays(today, -PAST_DAYS_CONTEXT)
  const endDate = addDays(today, daysRange - PAST_DAYS_CONTEXT)

  // Función para cargar solo datos dinámicos (reservas, kpis, tareas)
  const loadDynamicData = useCallback(async () => {
    const [reservasData, kpisData, tareasData] = await Promise.all([
      getRackReservas(startDate, endDate),
      getRackKPIs(),
      getTareasDelDia()
    ])
    setReservas(reservasData)
    setKpis(kpisData)
    setTareas(tareasData)
  }, [startDate, endDate])

  // Carga inicial: habitaciones (1 vez) + datos dinámicos
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true)
        setError(null)

        // Cargar habitaciones solo si no se han cargado antes
        if (!habitacionesCargadas.current) {
          const [habitacionesData, reservasData, kpisData, tareasData] = await Promise.all([
            getRackHabitaciones(),
            getRackReservas(startDate, endDate),
            getRackKPIs(),
            getTareasDelDia()
          ])
          setHabitaciones(habitacionesData)
          setReservas(reservasData)
          setKpis(kpisData)
          setTareas(tareasData)
          habitacionesCargadas.current = true
        } else {
          // Si ya tenemos habitaciones, solo cargar datos dinámicos
          await loadDynamicData()
        }
      } catch (err) {
        console.error('Error loading rack data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [daysRange]) // Solo re-ejecutar si cambia el rango

  // Función de refetch optimizada: solo recarga datos dinámicos
  const refetch = useCallback(async () => {
    try {
      setIsRefreshing(true)
      await loadDynamicData()
    } catch (err) {
      console.error('Error refreshing rack data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [loadDynamicData])

  // Función para forzar recarga de habitaciones (raro, pero disponible)
  const refetchHabitaciones = useCallback(async () => {
    try {
      const habitacionesData = await getRackHabitaciones()
      setHabitaciones(habitacionesData)
    } catch (err) {
      console.error('Error refreshing habitaciones:', err)
    }
  }, [])

  return {
    habitaciones,
    reservas,
    kpis,
    tareas,
    startDate,
    endDate,
    isLoading,
    isRefreshing,
    error,
    refetch,              // Solo recarga datos dinámicos (optimizado)
    refetchHabitaciones   // Para casos raros donde cambien las habitaciones
  }
}

