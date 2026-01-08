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
      <div className="mx-2 mb-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/50 p-3 space-y-2">
        {/* Header - Turno Activo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold">Turno Activo</span>
          </div>
          <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600 text-[10px] px-1.5 py-0">
            <Lock className="h-2.5 w-2.5" />
          </Badge>
        </div>

        {/* Caja y tiempo */}
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">
            {turno.caja.nombre}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {tiempoActivo}
          </p>
        </div>

        <Separator className="my-2" />

        {/* Montos principales */}
        {loadingMovimientos ? (
          <div className="text-center text-[10px] text-muted-foreground py-2">
            Calculando...
          </div>
        ) : movimientos && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Efectivo
              </span>
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                S/ {movimientos.totalEfectivoPEN.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-sm font-bold">
                S/ {movimientos.totalGeneral.toFixed(2)}
              </span>
            </div>
            
            <p className="text-[10px] text-muted-foreground text-center pt-0.5">
              {movimientos.pagos.length} transacción(es)
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="pt-2 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-2 border-green-200 hover:bg-green-50 text-green-700"
                    onClick={() => setModalIngresoOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Registrar Ingreso</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-2 border-red-200 hover:bg-red-50 text-red-700"
                    onClick={() => setModalEgresoOpen(true)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Registrar Egreso</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => cargarMovimientos()}
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingMovimientos ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Actualizar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full h-7 text-xs"
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
