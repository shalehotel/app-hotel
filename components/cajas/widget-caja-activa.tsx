'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getMovimientosTurno, type TurnoActivo } from '@/lib/actions/turnos'
import { getResumenMovimientos } from '@/lib/actions/movimientos'
import { ModalCierreTurno } from './modal-cierre-turno'
import { ModalMovimiento } from './modal-movimiento'
import { DollarSign, Clock, Lock, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  turno: TurnoActivo
  onTurnoCerrado: () => void
}

export function WidgetCajaActiva({ turno, onTurnoCerrado }: Props) {
  const [modalCierreOpen, setModalCierreOpen] = useState(false)
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalEgresoOpen, setModalEgresoOpen] = useState(false)
  const [movimientos, setMovimientos] = useState<any>(null)
  const [resumenMovimientos, setResumenMovimientos] = useState<any>(null)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)

  const cargarMovimientos = async () => {
    setLoadingMovimientos(true)
    const [resultMovimientos, resultResumen] = await Promise.all([
      getMovimientosTurno(turno.id),
      getResumenMovimientos(turno.id)
    ])
    
    if (resultMovimientos.success) {
      setMovimientos(resultMovimientos.data)
    }
    if (resultResumen.success) {
      setResumenMovimientos(resultResumen.data)
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

  const totalIngresado = movimientos 
    ? movimientos.totalEfectivoPEN + (movimientos.totalEfectivoUSD * 3.8) // Conversión aprox
    : 0

  const tiempoActivo = formatDistanceToNow(new Date(turno.fecha_apertura), { 
    locale: es,
    addSuffix: false 
  })

  return (
    <>
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <CardTitle className="text-sm font-medium">Turno Activo</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
              <Lock className="h-3 w-3 mr-1" />
              Abierto
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {turno.caja.nombre}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Info del turno */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Tiempo activo:
              </span>
              <span className="font-medium">{tiempoActivo}</span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Apertura PEN:</span>
              <span className="font-medium">S/ {turno.monto_apertura.toFixed(2)}</span>
            </div>
            
            {turno.monto_apertura_usd && turno.monto_apertura_usd > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Apertura USD:</span>
                <span className="font-medium">$ {turno.monto_apertura_usd.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            {loadingMovimientos ? (
              <div className="text-center text-muted-foreground py-2">
                Calculando...
              </div>
            ) : movimientos && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Efectivo PEN:
                  </span>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    S/ {movimientos.totalEfectivoPEN.toFixed(2)}
                  </span>
                </div>
                
                {movimientos.totalEfectivoUSD > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Efectivo USD:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      $ {movimientos.totalEfectivoUSD.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tarjeta:</span>
                  <span>S/ {movimientos.totalTarjeta.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Yape:</span>
                  <span>S/ {movimientos.totalYape.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total General:</span>
                  <span className="font-bold text-base">
                    S/ {movimientos.totalGeneral.toFixed(2)}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground text-center pt-1">
                  {movimientos.pagos.length} transacción(es)
                </div>
              </>
            )}
          </div>

          {/* Mostrar resumen de movimientos si hay */}
          {resumenMovimientos && (resumenMovimientos.total_ingresos_pen > 0 || resumenMovimientos.total_egresos_pen > 0) && (
            <>
              <Separator />
              <div className="space-y-2 text-xs">
                <div className="font-medium text-muted-foreground">Movimientos de Caja:</div>
                {resumenMovimientos.total_ingresos_pen > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Ingresos:
                    </span>
                    <span className="font-semibold">+S/ {resumenMovimientos.total_ingresos_pen.toFixed(2)}</span>
                  </div>
                )}
                {resumenMovimientos.total_egresos_pen > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Egresos:
                    </span>
                    <span className="font-semibold">-S/ {resumenMovimientos.total_egresos_pen.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Botones de acción */}
          <div className="pt-2 space-y-2">
            {/* Botones de Ingreso/Egreso */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-green-200 hover:bg-green-50 text-green-700"
                onClick={() => setModalIngresoOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ingreso
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-red-200 hover:bg-red-50 text-red-700"
                onClick={() => setModalEgresoOpen(true)}
              >
                <Minus className="h-3 w-3 mr-1" />
                Egreso
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => cargarMovimientos()}
            >
              Actualizar
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full"
              onClick={() => setModalCierreOpen(true)}
            >
              <Lock className="h-3 w-3 mr-2" />
              Cerrar Turno
            </Button>
          </div>
        </CardContent>
      </Card>

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
