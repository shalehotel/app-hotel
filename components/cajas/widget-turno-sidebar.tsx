'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { getReporteMetodosPago, type DetalleTurno } from '@/lib/actions/cajas'
import { getResumenMovimientos } from '@/lib/actions/movimientos'
import { CerrarCajaDialog } from '@/components/cajas/cerrar-caja-dialog'
import { ModalMovimiento } from './modal-movimiento'
import { Lock, Plus, Minus, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  turno: DetalleTurno
  onTurnoCerrado: () => void
}

export function WidgetTurnoSidebar({ turno, onTurnoCerrado }: Props) {
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false)
  const [modalEgresoOpen, setModalEgresoOpen] = useState(false)
  const [reportePagos, setReportePagos] = useState<any>(null)
  const [resumenMovimientos, setResumenMovimientos] = useState<any>(null)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)

  const t = turno.turno
  const stats = turno.estadisticas

  const cargarMovimientos = async () => {
    setLoadingMovimientos(true)
    const [resultPagos, resultResumen] = await Promise.all([
      getReporteMetodosPago(t.id),
      getResumenMovimientos(t.id)
    ])

    if (resultPagos.success) {
      setReportePagos(resultPagos.data)
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

    // Actualizar cada 60 segundos
    const interval = setInterval(cargarMovimientos, 60000)
    return () => clearInterval(interval)
  }, [t.id])

  const tiempoActivo = formatDistanceToNow(new Date(t.fecha_apertura), {
    locale: es,
    addSuffix: false
  })

  // Calcular Saldo Real en Caja (Efectivo)
  // Saldo Apertura + Ingresos Totales Efectivo (Pagos + Manuales) - Egresos Totales Efectivo
  // El reportePagos.totalEfectivoPEN ya incluye los ingresos manuales si aplicamos la lógica de getReporteMetodosPago
  // Faltaría restar los egresos en efectivo.

  // Asumimos que todos los egresos manuales son en efectivo (neto_pen no sirve porque mezcla ingresos)
  // Necesitamos "Total Egresos PEN" del resumenMovimientos
  const totalEgresosPEN = resumenMovimientos?.total_egresos_pen || 0

  const saldoEfectivoReal =
    t.monto_apertura_efectivo +
    (reportePagos?.totalEfectivoPEN || 0) -
    totalEgresosPEN

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
            {t.caja_nombre}
          </Badge>
        </div>

        {/* Montos principales */}
        {loadingMovimientos && !reportePagos ? (
          <div className="text-center text-[10px] text-muted-foreground py-4">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
            Actualizando...
          </div>
        ) : reportePagos && (
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Efectivo en Caja</span>
              <span className="text-xl font-bold tracking-tight">
                S/ {saldoEfectivoReal.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/50 rounded p-2">
                <span className="text-[10px] text-muted-foreground block">Ventas Hoy</span>
                <span className="text-sm font-semibold block text-blue-600">
                  S/ {reportePagos.totalGeneral.toFixed(2)}
                </span>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <span className="text-[10px] text-muted-foreground block">Transacciones</span>
                <span className="text-sm font-semibold block">{reportePagos.pagos.length}</span>
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

          <CerrarCajaDialog
            turnoId={t.id}
            totalEsperadoPen={saldoEfectivoReal}
            totalEsperadoUsd={t.monto_apertura_usd || 0}
            customTrigger={
              <Button
                variant="default"
                size="sm"
                className="w-full h-8 text-xs"
              >
                <Lock className="h-3 w-3 mr-1.5" />
                Cerrar Turno
              </Button>
            }
          />
        </div>
      </div>

      {/* Modales de movimientos */}
      <ModalMovimiento
        open={modalIngresoOpen}
        onOpenChange={setModalIngresoOpen}
        turnoId={t.id}
        tipo="INGRESO"
        onSuccess={handleMovimientoRegistrado}
      />

      <ModalMovimiento
        open={modalEgresoOpen}
        onOpenChange={setModalEgresoOpen}
        turnoId={t.id}
        tipo="EGRESO"
        onSuccess={handleMovimientoRegistrado}
      />
    </>
  )
}
