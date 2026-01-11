'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { getMovimientosTurno, type TurnoActivo } from '@/lib/actions/turnos'
import { ModalCierreTurno } from './modal-cierre-turno'
import { ModalMovimiento } from './modal-movimiento'
import { DollarSign, Lock, Plus, Minus, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  turno: TurnoActivo
  onTurnoCerrado: () => void
}

export function WidgetTurnoSidebar({ turno, onTurnoCerrado }: Props) {
  const [modalCierreOpen, setModalCierreOpen] = useState(false)
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalEgresoOpen, setModalEgresoOpen] = useState(false)
  const [movimientos, setMovimientos] = useState<any>(null)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)

  const cargarMovimientos = async () => {
    setLoadingMovimientos(true)
    const result = await getMovimientosTurno(turno.id)
    
    if (result.success) {
      setMovimientos(result.data)
    }
    setLoadingMovimientos(false)
  }

  const handleMovimientoRegistrado = () => {
    cargarMovimientos()
  }

  useEffect(() => {
    cargarMovimientos()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarMovimientos, 30000)
    return () => clearInterval(interval)
  }, [turno.id])

  const tiempoActivo = formatDistanceToNow(new Date(turno.fecha_apertura), { 
    locale: es,
    addSuffix: false 
  })

  return (
    <>
      <div className="mx-2 mb-2 rounded-lg border bg-card p-3 shadow-sm">
        {/* Header - Turno Activo */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold">Caja Abierta</span>
          </div>
          <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal">
            {turno.caja.nombre}
          </Badge>
        </div>

        {/* Montos principales */}
        {loadingMovimientos ? (
          <div className="text-center text-[10px] text-muted-foreground py-4">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
            Actualizando...
          </div>
        ) : movimientos && (
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total en Caja</span>
              <span className="text-xl font-bold tracking-tight">
                S/ {movimientos.totalGeneral.toFixed(2)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/50 rounded p-2">
                <span className="text-[10px] text-muted-foreground block">Efectivo</span>
                <span className="text-sm font-semibold block">S/ {movimientos.totalEfectivoPEN.toFixed(2)}</span>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <span className="text-[10px] text-muted-foreground block">Transacciones</span>
                <span className="text-sm font-semibold block">{movimientos.pagos.length}</span>
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground text-right">
              Abierto hace {tiempoActivo}
            </div>
          </div>
        )}

        <Separator className="my-3" />

        {/* Botones de acción */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs justify-start px-2"
              onClick={() => setModalIngresoOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Ingreso
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs justify-start px-2"
              onClick={() => setModalEgresoOpen(true)}
            >
              <Minus className="h-3 w-3 mr-1.5" />
              Egreso
            </Button>
          </div>
          
          <Button 
            variant="default" 
            size="sm" 
            className="w-full h-8 text-xs"
            onClick={() => setModalCierreOpen(true)}
          >
            <Lock className="h-3 w-3 mr-1.5" />
            Cerrar Turno
          </Button>
        </div>
      </div>

      {/* Modal de cierre */}
      <ModalCierreTurno
        open={modalCierreOpen}
        onOpenChange={setModalCierreOpen}
        turno={turno}
        movimientos={movimientos}
        onSuccess={onTurnoCerrado}
      />

      {/* Modales de movimientos */}
      <ModalMovimiento
        open={modalIngresoOpen}
        onOpenChange={setModalIngresoOpen}
        turnoId={turno.id}
        tipo="INGRESO"
        onSuccess={handleMovimientoRegistrado}
      />

      <ModalMovimiento
        open={modalEgresoOpen}
        onOpenChange={setModalEgresoOpen}
        turnoId={turno.id}
        tipo="EGRESO"
        onSuccess={handleMovimientoRegistrado}
      />
    </>
  )
}
