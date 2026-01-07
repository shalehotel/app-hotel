'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PanelRightOpen } from 'lucide-react'
import { CommandBar } from './components/command-bar/command-bar'
import { SmartSidebar } from './components/smart-sidebar/smart-sidebar'
import { RackGrid } from './components/main-grid/rack-grid'
import { ReservationDetailSheet } from '@/components/reservas/reservation-detail-sheet'
import { NewReservationDialog } from './components/dialogs/new-reservation-dialog'
import { ModalAperturaTurno } from '@/components/cajas/modal-apertura-turno'
import { useRackData } from '@/hooks/use-rack-data'
import { useCheckTurno } from '@/hooks/use-check-turno'
import type { RackHabitacion } from '@/lib/actions/rack'

type NewReservationData = {
  habitacion: RackHabitacion
  fecha: Date
  fechaFinal?: Date
}

export function RackContainer() {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [newReservation, setNewReservation] = useState<NewReservationData | null>(null)
  const [viewMode, setViewMode] = useState<'rack' | 'cards'>('rack')

  // Check de turno activo
  const { loading: loadingTurno, required: turnoRequired, hasActiveTurno, refetch: refetchTurno } = useCheckTurno()

  // Cargar datos reales desde Supabase
  const {
    habitaciones,
    reservas,
    kpis,
    tareas,
    startDate,
    endDate,
    isLoading,
    error,
    refetch
  } = useRackData(30)

  const handleNewReservation = (habitacion: RackHabitacion, fecha: Date, fechaFinal?: Date) => {
    setNewReservation({ habitacion, fecha, fechaFinal })
  }

  const handleReservationCreated = () => {
    setNewReservation(null) // Esto limpiará la selección
    refetch()
  }

  const handleTurnoAbierto = () => {
    refetchTurno()
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
        <ModalAperturaTurno onSuccess={handleTurnoAbierto} />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* ZONA A: Command Bar (Fixed Header) */}
      <div className="flex-shrink-0 z-10">
        <CommandBar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          kpis={kpis}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* ZONA C: Main Grid */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Cargando habitaciones...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">{error}</p>
            </div>
          ) : viewMode === 'rack' ? (
            <RackGrid 
              habitaciones={habitaciones}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {habitaciones.map((habitacion) => (
                  <div key={habitacion.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{habitacion.numero}</h3>
                        <p className="text-sm text-muted-foreground">{habitacion.tipos_habitacion.nombre}</p>
                      </div>
                      <div className="text-xs">
                        {habitacion.estado_limpieza === 'LIMPIA' && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded">LIMPIA</span>
                        )}
                        {habitacion.estado_limpieza === 'SUCIA' && (
                          <span className="bg-red-500 text-white px-2 py-1 rounded">SUCIA</span>
                        )}
                        {habitacion.estado_limpieza === 'OCUPADA' && (
                          <span className="bg-gray-500 text-white px-2 py-1 rounded">OCUPADA</span>
                        )}
                        {habitacion.estado_limpieza === 'MANTENIMIENTO' && (
                          <span className="bg-yellow-500 text-white px-2 py-1 rounded">MANT.</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Piso:</span> {habitacion.piso}</p>
                      <p><span className="text-muted-foreground">Capacidad:</span> {habitacion.tipos_habitacion.capacidad_personas} personas</p>
                      <p><span className="text-muted-foreground">Categoría:</span> {habitacion.categorias_habitacion.nombre}</p>
                    </div>
                  </div>
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
