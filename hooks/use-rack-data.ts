'use client'

import { useEffect, useState } from 'react'
import { addDays, startOfDay } from 'date-fns'
import {
  getRackHabitaciones,
  getRackReservas,
  getRackKPIs,
  getTareasDelDia,
  type RackHabitacion,
  type RackReserva,
  type RackKPIs
} from '@/lib/actions/rack'

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
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Calcular rango de fechas (hoy ± daysRange/2)
  const today = startOfDay(new Date())
  const startDate = addDays(today, -Math.floor(daysRange / 2))
  const endDate = addDays(today, Math.floor(daysRange / 2))

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const [
          habitacionesData,
          reservasData,
          kpisData,
          tareasData
        ] = await Promise.all([
          getRackHabitaciones(),
          getRackReservas(startDate, endDate),
          getRackKPIs(),
          getTareasDelDia()
        ])

        setHabitaciones(habitacionesData)
        setReservas(reservasData)
        setKpis(kpisData)
        setTareas(tareasData)
      } catch (err) {
        console.error('Error loading rack data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [daysRange, refreshKey])

  return {
    habitaciones,
    reservas,
    kpis,
    tareas,
    startDate,
    endDate,
    isLoading,
    error,
    refetch: () => {
      setRefreshKey(prev => prev + 1)
    }
  }
}
