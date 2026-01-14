'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { getDetalleTurnoCerrado, type DetalleTurno } from '@/lib/actions/cajas'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Receipt } from 'lucide-react'

interface Props {
  turnoId: string | null
  open: boolean
  onClose: () => void
}

export function TurnoDetailSheet({ turnoId, open, onClose }: Props) {
  const [detalle, setDetalle] = useState<DetalleTurno | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && turnoId) {
      loadDetalle()
    }
  }, [open, turnoId])

  const loadDetalle = async () => {
    if (!turnoId) return
    setLoading(true)
    try {
      const data = await getDetalleTurnoCerrado(turnoId)
      setDetalle(data)
    } catch (error) {
      console.error('Error al cargar detalle:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDiferenciaBadge = () => {
    if (!detalle?.estadisticas.diferencia_pen) return null
    const dif = detalle.estadisticas.diferencia_pen

    if (Math.abs(dif) < 0.01) {
      return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white border-0">CUADRADA</Badge>
    } else if (dif < 0) {
      return <Badge variant="destructive">FALTANTE</Badge>
    } else {
      return <Badge variant="outline">SOBRANTE</Badge>
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-[600px] flex flex-col p-0 gap-0">
        {loading ? (
           <div className="p-6 space-y-6">
             <div className="space-y-2">
               <Skeleton className="h-8 w-48" />
               <Skeleton className="h-4 w-64" />
             </div>
             <Skeleton className="h-32 w-full" />
             <Skeleton className="h-64 w-full" />
           </div>
        ) : detalle ? (
          <>
            <SheetHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl">{detalle.turno.caja_nombre}</SheetTitle>
                {getDiferenciaBadge()}
              </div>
              <SheetDescription>
                Cerrado por {detalle.turno.usuario_nombre}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                    <p className="text-muted-foreground">Apertura</p>
                    <p className="font-medium">
                      {format(new Date(detalle.turno.fecha_apertura), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                 </div>
                 <div>
                    <p className="text-muted-foreground">Cierre</p>
                    <p className="font-medium">
                      {format(new Date(detalle.turno.fecha_cierre!), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                 </div>
              </div>

              <Separator />

              {/* Resumen Financiero */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Resumen Financiero</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                    <p className="text-xl font-semibold">S/ {detalle.turno.monto_apertura_efectivo.toFixed(2)}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Flujo Neto</p>
                    <div className="flex items-baseline gap-2">
                       <p className={`text-xl font-semibold ${detalle.estadisticas.flujo_neto_pen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         {detalle.estadisticas.flujo_neto_pen >= 0 ? '+' : ''}S/ {detalle.estadisticas.flujo_neto_pen.toFixed(2)}
                       </p>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
                    <p className="text-xs text-muted-foreground mb-1">Total Esperado</p>
                    <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                      S/ {detalle.estadisticas.total_esperado_pen.toFixed(2)}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                      Math.abs(detalle.estadisticas.diferencia_pen || 0) < 0.01 
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900'
                        : (detalle.estadisticas.diferencia_pen || 0) < 0
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900'
                          : 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900'
                  }`}>
                    <p className="text-xs text-muted-foreground mb-1">Diferencia (vs Real)</p>
                    <p className={`text-xl font-semibold ${
                        Math.abs(detalle.estadisticas.diferencia_pen || 0) < 0.01 
                          ? 'text-blue-700 dark:text-blue-400' 
                          : (detalle.estadisticas.diferencia_pen || 0) < 0 
                            ? 'text-red-700 dark:text-red-400' 
                            : 'text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {(detalle.estadisticas.diferencia_pen || 0) >= 0 ? '+' : ''}S/ {(detalle.estadisticas.diferencia_pen || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                   <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>Ingresos: S/ {detalle.estadisticas.total_ingresos_pen.toFixed(2)}</span>
                   </div>
                   <div className="flex items-center gap-2 text-sm text-red-600">
                      <TrendingDown className="h-4 w-4" />
                      <span>Egresos: S/ {detalle.estadisticas.total_egresos_pen.toFixed(2)}</span>
                   </div>
                </div>
              </div>

              <Separator />

              {/* Movimientos */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Movimientos ({detalle.movimientos.length})</h3>
                {detalle.movimientos.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic">No hay movimientos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {detalle.movimientos.map((mov) => (
                      <div key={mov.id} className="flex justify-between items-start p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={mov.tipo === 'INGRESO' ? 'default' : 'destructive'} className="text-[10px] h-5">
                               {mov.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(mov.created_at), 'HH:mm', { locale: es })}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{mov.motivo}</p>
                          {mov.comprobante_referencia && (
                            <p className="text-xs text-blue-600">Ref: {mov.comprobante_referencia}</p>
                          )}
                        </div>
                        <div className={`font-semibold text-sm ${
                           mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                        }`}>
                           {mov.tipo === 'INGRESO' ? '+' : '-'}{mov.moneda === 'PEN' ? 'S/' : '$'} {mov.monto.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se pudo cargar el detalle
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}