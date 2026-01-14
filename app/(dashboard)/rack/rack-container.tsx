'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PanelRightOpen } from 'lucide-react'
import { CommandBar } from './components/command-bar/command-bar'
import { SmartSidebar } from './components/smart-sidebar/smart-sidebar'
import { RackGrid } from './components/main-grid/rack-grid'
import { RoomCard } from './components/main-grid/room-card'
import { ReservationDetailSheet } from '@/components/reservas/reservation-detail-sheet'
import { NewReservationDialog } from './components/dialogs/new-reservation-dialog'
import { ModalAperturaTurno } from '@/components/cajas/modal-apertura-turno'
import { useRackData } from '@/hooks/use-rack-data'
import { useTurnoContext } from '@/components/providers/turno-provider'
import { getRoomVisualState } from '@/lib/utils/room-status'
import { type FilterState, initialFilters } from './components/smart-sidebar/filters-tab'
import type { RackHabitacion } from '@/types/rack'

type NewReservationData = {
  habitacion: RackHabitacion
  fecha: Date
  fechaFinal?: Date
}

export function RackContainer() {
  const router = useRouter()
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [newReservation, setNewReservation] = useState<NewReservationData | null>(null)
  const [viewMode, setViewMode] = useState<'rack' | 'cards'>('rack')
  const [filters, setFilters] = useState<FilterState>(initialFilters)

  // Check de turno activo (ahora desde contexto global)
  const {
    loading: loadingTurno,
    hasActiveTurno,
    refetchTurno,
    // Datos pre-cargados para el modal (optimización)
    cajasDisponibles,
    loadingCajas,
    userId
  } = useTurnoContext()
  // Para recepcionistas, el turno es requerido
  const turnoRequired = true // TODO: Verificar rol si es necesario

  // Cargar datos reales desde Supabase
  const {
    habitaciones,
    reservas,
    kpis,
    tareas,
    startDate,
    endDate,
    isLoading,
    isRefreshing,
    error,
    refetch
  } = useRackData(30)

  // Filtrar habitaciones (memorizado para evitar recálculos innecesarios)
  const filteredHabitaciones = useMemo(() => {
    return habitaciones.filter(h => {
      if (filters.tipoId !== 'all' && h.tipo_id !== filters.tipoId) return false
      if (filters.categoriaId !== 'all' && h.categoria_id !== filters.categoriaId) return false
      if (filters.estadoLimpieza !== 'all' && h.estado_limpieza !== filters.estadoLimpieza) return false
      if (filters.estadoOcupacion !== 'all' && h.estado_ocupacion !== filters.estadoOcupacion) return false
      if (filters.estadoServicio !== 'all' && h.estado_servicio !== filters.estadoServicio) return false
      return true
    })
  }, [habitaciones, filters])

  const handleNewReservation = (habitacion: RackHabitacion, fecha: Date, fechaFinal?: Date) => {
    setNewReservation({ habitacion, fecha, fechaFinal })
  }

  const handleReservationCreated = () => {
    // Solo recargamos datos. El modal se encarga de mostrar el paso de éxito/pago
    // y cerrarse cuando el usuario lo decida.
    refetch()
  }

  const handleTurnoAbierto = async () => {
    // Refetch inmediato - el turno ya está guardado en BD
    console.log('[RackContainer] Turno abierto, refetching...')
    await refetchTurno()
    console.log('[RackContainer] refetchTurno completado')
  }

  const handleCancelarApertura = () => {
    router.push('/')
  }

  // Si está cargando el check de turno, mostrar loading
  if (loadingTurno) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-muted-foreground">Verificando turno de caja...</p>
      </div>
    )
  }

  // Si requiere turno pero no lo tiene, mostrar modal bloqueante
  if (turnoRequired && !hasActiveTurno) {
    return (
      <div className="h-full w-full">
        <ModalAperturaTurno
          onSuccess={handleTurnoAbierto}
          onCancel={handleCancelarApertura}
          allowCancel={true}
          cajasIniciales={cajasDisponibles}
          loadingCajasInicial={loadingCajas}
          userIdInicial={userId}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* ZONA A: Command Bar (Fixed Header) */}
      <div className="flex-shrink-0 z-10">
        <CommandBar
          kpis={kpis}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Recarga silenciosa - sin indicadores visuales molestos */}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* ZONA C: Main Grid */}
        <div className="flex-1 overflow-auto no-scrollbar">
          {isLoading && habitaciones.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Cargando habitaciones...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">{error}</p>
            </div>
          ) : viewMode === 'rack' ? (
            <RackGrid
              habitaciones={filteredHabitaciones}
              reservas={reservas}
              startDate={startDate}
              endDate={endDate}
              onReservationClick={setSelectedReservationId}
              onNewReservation={handleNewReservation}
              onUpdate={refetch}
              clearSelection={!newReservation}
            />
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredHabitaciones.map((habitacion) => (
                  <RoomCard
                    key={habitacion.id}
                    habitacion={habitacion}
                    reservas={reservas.filter(r => r.habitacion_id === habitacion.id)}
                    onReservationClick={setSelectedReservationId}
                    onNewReservation={handleNewReservation}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toggle button when sidebar is closed */}
        {!isSidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            className="fixed right-4 top-20 z-30 shadow-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}

        {/* ZONA B: Smart Sidebar */}
        <SmartSidebar
          open={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onReservationClick={setSelectedReservationId}
          tareas={tareas}
          habitaciones={habitaciones}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      {/* Sheet unificado para detalles de reserva */}
      {selectedReservationId && (
        <ReservationDetailSheet
          reservaId={selectedReservationId}
          open={!!selectedReservationId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedReservationId(null)
              refetch() // Recargar datos por si hubo cambios
            }
          }}
          onUpdate={refetch}
        />
      )}

      {/* Dialog para nueva reserva */}
      {newReservation && (
        <NewReservationDialog
          open={!!newReservation}
          onOpenChange={(open) => !open && setNewReservation(null)}
          habitacion={newReservation.habitacion}
          fechaInicial={newReservation.fecha}
          fechaFinal={newReservation.fechaFinal}
          onSuccess={handleReservationCreated}
        />
      )}
    </div>
  )
}
