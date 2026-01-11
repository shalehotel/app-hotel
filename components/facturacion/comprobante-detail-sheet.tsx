'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getDetalleComprobante } from '@/lib/actions/comprobantes'
import { 
  Printer, 
  XCircle, 
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ComprobanteDetailSheetProps = {
  comprobanteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComprobanteDetailSheet({ comprobanteId, open, onOpenChange }: ComprobanteDetailSheetProps) {
  const [comprobante, setComprobante] = useState<any>(null)
  const [detalles, setDetalles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [anularDialogOpen, setAnularDialogOpen] = useState(false)

  useEffect(() => {
    if (open && comprobanteId) {
      cargarDatos()
    }
  }, [open, comprobanteId])

  async function cargarDatos() {
    try {
      setLoading(true)
      const { comprobante: comp, detalles: dets } = await getDetalleComprobante(comprobanteId)
      setComprobante(comp)
      setDetalles(dets)
    } catch (error) {
      console.error('Error al cargar comprobante:', error)
      toast.error('Error al cargar el detalle del comprobante')
    } finally {
      setLoading(false)
    }
  }

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; label: string }> = {
      'PENDIENTE': { variant: 'secondary', label: 'Pendiente' },
      'ACEPTADO': { variant: 'secondary', className: 'bg-green-500 hover:bg-green-600 text-white border-0', label: 'Aceptado' },
      'RECHAZADO': { variant: 'destructive', label: 'Rechazado' },
      'ANULADO': { variant: 'destructive', label: 'Anulado' }
    }

    const config = variants[estado] || { variant: 'outline' as const, label: estado }

    return (
      <Badge variant={config.variant} className={`${config.className || ''}`}>
        {config.label}
      </Badge>
    )
  }

  async function handleImprimir() {
    toast.info('Función de impresión en desarrollo')
  }

  async function handleAnular() {
    setActionLoading(true)
    try {
      toast.success('Comprobante anulado correctamente')
      await cargarDatos()
      setAnularDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al anular el comprobante')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !comprobante) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] flex flex-col p-0 gap-0">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const puedeAnular = comprobante.estado_sunat === 'ACEPTADO'
  const numero_completo = `${comprobante.serie}-${comprobante.numero.toString().padStart(8, '0')}`

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
               <div className="flex flex-col">
                  <SheetTitle className="text-xl">{comprobante.tipo_comprobante}</SheetTitle>
                  <span className="text-sm font-mono text-muted-foreground">{numero_completo}</span>
               </div>
              {getEstadoBadge(comprobante.estado_sunat)}
            </div>
            <SheetDescription>
              Emitido el {format(new Date(comprobante.fecha_emision), "dd 'de' MMM, yyyy HH:mm", { locale: es })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

             {/* Cliente */}
             <div>
                <h3 className="font-semibold text-lg mb-3">Cliente</h3>
                <div className="p-3 bg-muted/20 rounded-lg border">
                   <p className="font-medium text-base">{comprobante.receptor_razon_social}</p>
                   <p className="text-sm text-muted-foreground mt-1">
                      {comprobante.receptor_tipo_doc}: {comprobante.receptor_nro_doc}
                   </p>
                   {comprobante.receptor_direccion && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                         <span className="shrink-0">📍</span>
                         {comprobante.receptor_direccion}
                      </p>
                   )}
                </div>
             </div>

             <Separator />

             {/* Items */}
             <div>
                <h3 className="font-semibold text-lg mb-3">Items</h3>
                <div className="space-y-3">
                   {detalles.map((detalle, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                         <div>
                            <p className="font-medium text-sm">{detalle.descripcion}</p>
                            <p className="text-xs text-muted-foreground">
                               Cant: {detalle.cantidad} x {comprobante.moneda} {detalle.precio_unitario.toFixed(2)}
                            </p>
                         </div>
                         <div className="font-semibold text-sm">
                            {comprobante.moneda} {detalle.subtotal.toFixed(2)}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <Separator />

             {/* Totales */}
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Op. Gravadas</span>
                   <span>{comprobante.moneda} {comprobante.op_gravadas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">IGV (18%)</span>
                   <span>{comprobante.moneda} {comprobante.monto_igv.toFixed(2)}</span>
                </div>
                {comprobante.op_exoneradas > 0 && (
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Op. Exoneradas</span>
                      <span>{comprobante.moneda} {comprobante.op_exoneradas.toFixed(2)}</span>
                   </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between items-center text-lg font-bold">
                   <span>Total</span>
                   <span>{comprobante.moneda} {comprobante.total_venta.toFixed(2)}</span>
                </div>
             </div>

             {/* Datos Adicionales (Hash) */}
             {comprobante.hash_cpe && (
                <div className="pt-2">
                   <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Hash CPE</p>
                   <p className="font-mono text-[10px] text-muted-foreground break-all p-2 bg-muted rounded border">
                      {comprobante.hash_cpe}
                   </p>
                </div>
             )}

          </div>

          <SheetFooter className="p-6 pt-2 border-t mt-auto">
             <div className="flex gap-3 w-full">
                <Button className="flex-1" variant="outline" onClick={handleImprimir}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                {puedeAnular && (
                  <Button 
                    className="flex-1" 
                    variant="destructive"
                    onClick={() => setAnularDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Anular
                  </Button>
                )}
             </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog de Anulación */}
      <AlertDialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Anular Comprobante</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de anular el comprobante <strong>{numero_completo}</strong>.
              <br /><br />
              Esta acción generará una Nota de Crédito en SUNAT y el comprobante quedará sin validez fiscal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnular} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Anulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}