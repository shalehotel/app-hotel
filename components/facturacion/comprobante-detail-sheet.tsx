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
import { getDetalleComprobante, corregirComprobanteRechazado, reintentarEnvio } from '@/lib/actions/comprobantes'
import {
   Printer,
   XCircle,
   Loader2,
   RefreshCcw,
   Save,
   UploadCloud,
   MessageCircle
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
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'


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

   // Estado para Corrección
   const [corregirDialogOpen, setCorregirDialogOpen] = useState(false)
   const [nuevoCliente, setNuevoCliente] = useState({
      nombre: '',
      tipo_doc: '',
      numero_doc: '',
      direccion: ''
   })

   // Estado para WhatsApp
   const [whatsappOpen, setWhatsappOpen] = useState(false)
   const [whatsappData, setWhatsappData] = useState({ numero: '', mensaje: '' })

   useEffect(() => {
      if (open && comprobanteId) {
         cargarDatos()
      }
   }, [open, comprobanteId])

   // ... (cargarDatos stays same) ...

   // Función para preparar y abrir modal WhatsApp
   function abrirWhatsApp() {
      const numero = comprobante?.cliente_telefono || '' // Pre-llenar si existe

      const link = comprobante?.pdf_url || `${window.location.origin}/api/comprobantes/pdf/${comprobanteId}`
      const mensaje = `Hola *${comprobante.receptor_razon_social}*, te enviamos tu comprobante *${comprobante.serie}-${comprobante.numero}*.\n\nPuedes descargarlo aquí:\n${link}`

      setWhatsappData({ numero, mensaje })
      setWhatsappOpen(true)
   }

   function enviarWhatsApp() {
      // Limpiar número (solo dígitos)
      let num = whatsappData.numero.replace(/\D/g, '')
      if (!num) {
         toast.error('Ingresa un número válido')
         return
      }

      // Si no tiene código de país (51 para Perú), agregarlo si parece local (9 dígitos)
      if (num.length === 9 && !num.startsWith('51')) {
         num = '51' + num
      }

      const url = `https://wa.me/${num}?text=${encodeURIComponent(whatsappData.mensaje)}`
      window.open(url, '_blank')
      setWhatsappOpen(false)
      toast.success('Abriendo WhatsApp...')
   }


   async function cargarDatos() {
      try {
         setLoading(true)
         const { comprobante: comp, detalles: dets } = await getDetalleComprobante(comprobanteId)
         setComprobante(comp)
         setDetalles(dets)

         // Inicializar datos para posible corrección
         if (comp) {
            setNuevoCliente({
               nombre: comp.receptor_razon_social || '',
               tipo_doc: comp.receptor_tipo_doc || 'DNI',
               numero_doc: comp.receptor_nro_doc || '',
               direccion: comp.receptor_direccion || ''
            })
         }
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
      if (comprobante?.pdf_url) {
         window.open(comprobante.pdf_url, '_blank')
      } else {
         // Fallback local
         window.open(`/api/comprobantes/pdf/${comprobanteId}`, '_blank')
      }
   }

   async function handleAnular() {
      setActionLoading(true)
      try {
         toast.info('Para anular, usa la opción de Nota de Crédito en el menú principal (aún no implementado aquí)')
         // Nota: La anulación real requiere emitir Nota de Crédito, no es solo un update.
         setAnularDialogOpen(false)
      } catch (error: any) {
         toast.error(error.message || 'Error al anular el comprobante')
      } finally {
         setActionLoading(false)
      }
   }

   async function handleReintentar() {
      setActionLoading(true)
      try {
         const resultado = await reintentarEnvio(comprobanteId)

         if (resultado.success) {
            toast.success(`Reintento procesado: ${resultado.resultado?.mensaje}`)
            await cargarDatos()
         } else {
            toast.error(resultado.error || 'Error al reintentar envío')
         }
      } catch (error: any) {
         toast.error(error.message || 'Error desconocido')
      } finally {
         setActionLoading(false)
      }
   }

   async function handleCorregir() {
      setActionLoading(true)
      try {
         const resultado = await corregirComprobanteRechazado(comprobanteId, {
            tipo_doc: nuevoCliente.tipo_doc,
            numero_doc: nuevoCliente.numero_doc,
            nombre: nuevoCliente.nombre,
            direccion: nuevoCliente.direccion
         })

         if (resultado.success && resultado.nuevoComprobante) {
            toast.success(`Comprobante corregido y reemitido: ${resultado.nuevoComprobante.numero_completo}`)
            setCorregirDialogOpen(false)
            onOpenChange(false)
         } else {
            toast.error(resultado.error || 'Error al corregir el comprobante')
         }
      } catch (error: any) {
         toast.error(error.message || 'Error desconocido')
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
   const esRechazado = comprobante.estado_sunat === 'RECHAZADO'
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

                  {/* Trazabilidad */}
                  <div>
                     <h3 className="font-semibold text-lg mb-3">Trazabilidad</h3>
                     <div className="grid grid-cols-2 gap-3 text-sm">
                        {comprobante.metodo_pago && (
                           <div>
                              <p className="text-xs text-muted-foreground">Método de Pago</p>
                              <p className="font-medium">{comprobante.metodo_pago}</p>
                           </div>
                        )}
                        {comprobante.contexto && (
                           <div>
                              <p className="text-xs text-muted-foreground">Contexto</p>
                              <p className="font-medium capitalize">{comprobante.contexto.replace('_', ' ')}</p>
                           </div>
                        )}
                        {comprobante.serie && (
                           <div>
                              <p className="text-xs text-muted-foreground">Serie</p>
                              <p className="font-mono font-medium">{comprobante.serie}</p>
                           </div>
                        )}
                        {comprobante.caja_nombre && (
                           <div>
                              <p className="text-xs text-muted-foreground">Caja</p>
                              <p className="font-medium">{comprobante.caja_nombre}</p>
                           </div>
                        )}
                        {comprobante.emisor_nombre && (
                           <div>
                              <p className="text-xs text-muted-foreground">Emitido por</p>
                              <p className="font-medium">{comprobante.emisor_nombre}</p>
                           </div>
                        )}
                        {comprobante.reserva_id && comprobante.codigo_reserva && (
                           <div className="col-span-2">
                              <p className="text-xs text-muted-foreground mb-1">Vinculado a Reserva</p>
                              <Badge variant="outline" className="font-mono">
                                 {comprobante.codigo_reserva}
                              </Badge>
                           </div>
                        )}
                     </div>
                  </div>

                  <Separator />

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

                  {/* Emisor (Hotel) */}
                  {comprobante.emisor_razon_social && (
                     <div>
                        <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Emisor</h3>
                        <div className="text-xs space-y-1 text-muted-foreground">
                           <p className="font-medium text-foreground">{comprobante.emisor_razon_social}</p>
                           <p>RUC: {comprobante.emisor_nro_doc}</p>
                           {comprobante.emisor_direccion && <p>📍 {comprobante.emisor_direccion}</p>}
                        </div>
                     </div>
                  )}

                  {/* Datos Adicionales (Hash) */}
                  {comprobante.hash_cpe && (
                     <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Hash CPE</p>
                        <p className="font-mono text-[10px] text-muted-foreground break-all p-2 bg-muted rounded border">
                           {comprobante.hash_cpe}
                        </p>
                     </div>
                  )}

                  {/* Metadatos de auditoría */}
                  <div className="pt-2 border-t">
                     <div className="text-xs text-muted-foreground space-y-1">
                        <p>ID Interno: <span className="font-mono">{comprobante.id.substring(0, 8)}</span></p>
                        {comprobante.created_at && (
                           <p>Creado: {format(new Date(comprobante.created_at), "dd MMM yyyy HH:mm", { locale: es })}</p>
                        )}
                        {comprobante.observaciones && (
                           <div className="pt-2">
                              <p className="font-semibold text-destructive">Nota de Error/Observación:</p>
                              <p className="text-destructive bg-destructive/10 p-2 rounded text-sm mt-1">{comprobante.observaciones}</p>
                           </div>
                        )}
                     </div>
                  </div>

               </div>

               <SheetFooter className="p-6 pt-2 border-t mt-auto gap-3 sm:gap-0">
                  <div className="flex gap-3 w-full">
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

                     {esRechazado && (
                        <Button
                           className="flex-1 bg-amber-600 hover:bg-amber-700"
                           onClick={() => setCorregirDialogOpen(true)}
                        >
                           <RefreshCcw className="h-4 w-4 mr-2" />
                           Corregir
                        </Button>
                     )}

                     {comprobante.estado_sunat === 'PENDIENTE' && (
                        <Button
                           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                           onClick={handleReintentar}
                           disabled={actionLoading}
                        >
                           {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                           Reintentar
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

         {/* Dialog de Corrección */}
         <Dialog open={corregirDialogOpen} onOpenChange={setCorregirDialogOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Corregir y Reemitir</DialogTitle>
                  <DialogDescription>
                     Corrige los datos del cliente para generar un nuevo comprobante. El anterior ({numero_completo}) quedará como RECHAZADO.
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                     <Label>Tipo de Documento</Label>
                     <Input
                        value={nuevoCliente.tipo_doc}
                        onChange={e => setNuevoCliente({ ...nuevoCliente, tipo_doc: e.target.value })}
                        placeholder="DNI / RUC"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label>Número de Documento</Label>
                     <Input
                        value={nuevoCliente.numero_doc}
                        onChange={e => setNuevoCliente({ ...nuevoCliente, numero_doc: e.target.value })}
                        placeholder="Ej: 12345678"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label>Nombre / Razón Social</Label>
                     <Input
                        value={nuevoCliente.nombre}
                        onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                        placeholder="Nombre completo"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label>Dirección (Opcional)</Label>
                     <Input
                        value={nuevoCliente.direccion}
                        onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                        placeholder="Dirección fiscal"
                     />
                  </div>
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={() => setCorregirDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCorregir} disabled={actionLoading}>
                     {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                     Guardar y Reemitir
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Dialog de WhatsApp */}
         <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Enviar por WhatsApp</DialogTitle>
                  <DialogDescription>
                     Envía el enlace del comprobante directamente al cliente.
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                     <Label>Número (con código país, ej: 51)</Label>
                     <Input
                        value={whatsappData.numero}
                        onChange={e => setWhatsappData({ ...whatsappData, numero: e.target.value })}
                        placeholder="Ej: 51999888777"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label>Mensaje</Label>
                     <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={whatsappData.mensaje}
                        onChange={e => setWhatsappData({ ...whatsappData, mensaje: e.target.value })}
                        placeholder="Escribe un mensaje..."
                     />
                  </div>
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={() => setWhatsappOpen(false)}>Cancelar</Button>
                  <Button onClick={enviarWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                     <MessageCircle className="h-4 w-4 mr-2" />
                     Enviar
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   )
}