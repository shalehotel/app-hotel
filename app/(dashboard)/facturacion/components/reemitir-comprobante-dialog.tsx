'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getComprobanteParaReemision, getSeriesDisponibles, emitirComprobante } from '@/lib/actions/comprobantes'
import { consultarDocumento } from '@/lib/actions/consulta-documento'

type ReemitirComprobanteDialogProps = {
  comprobanteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type ItemReemision = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  codigo_afectacion_igv: string
}

export function ReemitirComprobanteDialog({
  comprobanteId,
  open,
  onOpenChange,
  onSuccess
}: ReemitirComprobanteDialogProps) {
  const [loading, setLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)

  // Datos del comprobante original
  const [original, setOriginal] = useState<any>(null)

  // Datos editables para reemisión
  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA')
  const [serie, setSerie] = useState('')
  const [clienteTipoDoc, setClienteTipoDoc] = useState('DNI')
  const [clienteNumeroDoc, setClienteNumeroDoc] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDireccion, setClienteDireccion] = useState('')
  const [items, setItems] = useState<ItemReemision[]>([])
  const [reservaId, setReservaId] = useState<string | null>(null)

  // Estado de búsqueda API
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [advertenciaApi, setAdvertenciaApi] = useState('')
  const [docVerificado, setDocVerificado] = useState(false)

  // Series disponibles
  const [seriesBoleta, setSeriesBoleta] = useState<any[]>([])
  const [seriesFactura, setSeriesFactura] = useState<any[]>([])

  useEffect(() => {
    if (open && comprobanteId) {
      cargarDatos()
    }
  }, [open, comprobanteId])

  useEffect(() => {
    // Cuando cambia el tipo, seleccionar la primera serie disponible
    const series = tipoComprobante === 'BOLETA' ? seriesBoleta : seriesFactura
    if (series.length > 0 && !series.find(s => s.serie === serie)) {
      setSerie(series[0].serie)
    }
  }, [tipoComprobante, seriesBoleta, seriesFactura])

  async function cargarDatos() {
    try {
      setLoading(true)

      // Cargar comprobante original y series en paralelo
      const [compRes, boletaSeries, facturaSeries] = await Promise.all([
        getComprobanteParaReemision(comprobanteId!),
        getSeriesDisponibles('BOLETA'),
        getSeriesDisponibles('FACTURA')
      ])

      if (!compRes.success || !compRes.comprobante) {
        toast.error(compRes.error || 'Error al cargar comprobante')
        onOpenChange(false)
        return
      }

      const comp = compRes.comprobante
      setOriginal(comp)
      setReservaId(comp.reserva_id)

      // Pre-llenar datos editables
      const tipo = comp.tipo_comprobante === 'NOTA_CREDITO' ? 'BOLETA' : comp.tipo_comprobante as 'BOLETA' | 'FACTURA'
      setTipoComprobante(tipo)
      setSerie(comp.serie || '')
      setClienteTipoDoc(comp.receptor_tipo_doc || 'DNI')
      setClienteNumeroDoc(comp.receptor_nro_doc || '')
      setClienteNombre(comp.receptor_razon_social || '')
      setClienteDireccion(comp.receptor_direccion || '')

      // Pre-llenar items
      const itemsOriginales = (comp.comprobante_detalles || []).map((det: any) => ({
        descripcion: det.descripcion,
        cantidad: det.cantidad,
        precio_unitario: det.precio_unitario,
        subtotal: det.subtotal,
        codigo_afectacion_igv: det.codigo_afectacion_igv || '10'
      }))
      setItems(itemsOriginales.length > 0 ? itemsOriginales : [{
        descripcion: 'Servicio de hospedaje',
        cantidad: 1,
        precio_unitario: comp.total_venta || 0,
        subtotal: comp.total_venta || 0,
        codigo_afectacion_igv: '10'
      }])

      setSeriesBoleta(boletaSeries)
      setSeriesFactura(facturaSeries)

      // Seleccionar serie correcta
      const seriesDisponibles = tipo === 'BOLETA' ? boletaSeries : facturaSeries
      if (seriesDisponibles.length > 0) {
        const serieOriginal = seriesDisponibles.find((s: any) => s.serie === comp.serie)
        setSerie(serieOriginal ? comp.serie : seriesDisponibles[0].serie)
      }

    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar datos del comprobante')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // CONSULTA PeruAPI — DNI o RUC
  // =====================================================
  const buscarDocumentoAPI = useCallback(async (doc: string, tipoDoc: string) => {
    if (!doc) return

    const tipo = tipoDoc === 'RUC' ? 'RUC' : 'DNI'
    if (tipo === 'DNI' && doc.length !== 8) return
    if (tipo === 'RUC' && doc.length !== 11) return

    setBuscandoDoc(true)
    setErrorApi('')
    setAdvertenciaApi('')
    setDocVerificado(false)

    try {
      const result = await consultarDocumento(tipo, doc)

      if (result.success && result.data) {
        if (tipo === 'DNI' && result.data.nombres && result.data.apellidos) {
          setClienteNombre(`${result.data.nombres} ${result.data.apellidos}`)
        } else if (tipo === 'RUC') {
          if (result.data.razon_social) setClienteNombre(result.data.razon_social)
          if (result.data.direccion) setClienteDireccion(result.data.direccion)
        }
        setDocVerificado(true)
        if (result.advertencia) setAdvertenciaApi(result.advertencia)
      } else {
        setErrorApi(result.error || 'Documento no encontrado')
      }
    } catch {
      setErrorApi('Error de conexión con el servicio')
    } finally {
      setBuscandoDoc(false)
    }
  }, [])

  function calcularTotal() {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  function updateItem(index: number, field: keyof ItemReemision, value: any) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalcular subtotal si cambió cantidad o precio
    if (field === 'cantidad' || field === 'precio_unitario') {
      newItems[index].subtotal = Number((newItems[index].cantidad * newItems[index].precio_unitario).toFixed(2))
    }

    setItems(newItems)
  }

  function addItem() {
    setItems([...items, {
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
      codigo_afectacion_igv: '10'
    }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      toast.error('Debe haber al menos un ítem')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  async function handleReemitir() {
    // Validaciones
    if (!serie) {
      toast.error('Seleccione una serie')
      return
    }
    if (!clienteNumeroDoc) {
      toast.error('Ingrese el número de documento del cliente')
      return
    }
    if (!clienteNombre) {
      toast.error('Ingrese el nombre del cliente')
      return
    }
    if (items.length === 0 || items.some(i => !i.descripcion || i.subtotal <= 0)) {
      toast.error('Todos los ítems deben tener descripción y monto válido')
      return
    }
    if (!reservaId) {
      toast.error('Error: Este comprobante no tiene reserva asociada')
      return
    }

    // Validaciones por tipo
    if (tipoComprobante === 'FACTURA') {
      if (clienteTipoDoc !== 'RUC') {
        toast.error('Las facturas requieren RUC')
        return
      }
      if (clienteNumeroDoc.length !== 11) {
        toast.error('El RUC debe tener 11 dígitos')
        return
      }
    }

    setEmitting(true)
    try {
      const resultado = await emitirComprobante({
        reserva_id: reservaId,
        tipo_comprobante: tipoComprobante,
        serie: serie,
        cliente_tipo_doc: clienteTipoDoc as any,
        cliente_numero_doc: clienteNumeroDoc,
        cliente_nombre: clienteNombre,
        cliente_direccion: clienteDireccion || undefined,
        items: items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          codigo_afectacion_igv: item.codigo_afectacion_igv
        })),
        observaciones: `Reemisión del comprobante ${original?.serie}-${original?.numero}`
      })

      toast.success(`Comprobante emitido: ${resultado.numero_completo}`)
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error('Error al reemitir:', error)
      toast.error(error.message || 'Error al emitir el comprobante')
    } finally {
      setEmitting(false)
    }
  }

  const seriesActuales = tipoComprobante === 'BOLETA' ? seriesBoleta : seriesFactura
  const total = calcularTotal()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {original?.estado_sunat === 'RECHAZADO' ? 'Corregir y Reenviar' : 'Reemitir Comprobante'}
          </DialogTitle>
          <DialogDescription>
            {original && (
              <span className="flex items-center gap-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {original.estado_sunat === 'RECHAZADO' ? 'Corrigiendo' : 'Reemitiendo desde'}{' '}
                <Badge variant="outline" className="font-mono">
                  {original.serie}-{String(original.numero).padStart(8, '0')}
                </Badge>
                <Badge
                  variant={original.estado_sunat === 'RECHAZADO' ? 'destructive' : 'outline'}
                  className="text-[10px]"
                >
                  {original.estado_sunat}
                </Badge>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-2">

            {/* Tipo de comprobante y Serie */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comprobante</Label>
                <Select
                  value={tipoComprobante}
                  onValueChange={(v) => setTipoComprobante(v as 'BOLETA' | 'FACTURA')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETA">Boleta</SelectItem>
                    <SelectItem value="FACTURA">Factura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serie</Label>
                <Select value={serie} onValueChange={setSerie}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar serie" />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesActuales.map((s: any) => (
                      <SelectItem key={s.id} value={s.serie}>
                        {s.serie} (#{s.correlativo_actual + 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Datos del cliente */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Datos del Cliente</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo Documento</Label>
                  <Select value={clienteTipoDoc} onValueChange={setClienteTipoDoc}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="RUC">RUC</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      <SelectItem value="CE">Carnet Ext.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número</Label>
                  <div className="relative">
                    <Input
                      className="h-9 pr-9"
                      value={clienteNumeroDoc}
                      onChange={e => {
                        setClienteNumeroDoc(e.target.value)
                        setErrorApi('')
                        setAdvertenciaApi('')
                        setDocVerificado(false)
                      }}
                      onBlur={() => buscarDocumentoAPI(clienteNumeroDoc, clienteTipoDoc)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          buscarDocumentoAPI(clienteNumeroDoc, clienteTipoDoc)
                        }
                      }}
                      placeholder={clienteTipoDoc === 'RUC' ? '20XXXXXXXXX' : '12345678'}
                    />
                    {buscandoDoc && (
                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {!buscandoDoc && docVerificado && !advertenciaApi && (
                      <CheckCircle2 className="absolute right-2.5 top-2 h-4 w-4 text-green-500" />
                    )}
                    {!buscandoDoc && (errorApi || advertenciaApi) && (
                      <AlertTriangle className="absolute right-2.5 top-2 h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  {errorApi && (
                    <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {errorApi}
                    </p>
                  )}
                  {advertenciaApi && (
                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {advertenciaApi}
                    </p>
                  )}
                  {docVerificado && !errorApi && !advertenciaApi && (
                    <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verificado
                    </p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Nombre / Razón Social</Label>
                  <Input
                    className="h-9"
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Dirección {tipoComprobante === 'FACTURA' ? '' : '(Opcional)'}</Label>
                  <Input
                    className="h-9"
                    value={clienteDireccion}
                    onChange={e => setClienteDireccion(e.target.value)}
                    placeholder="Dirección fiscal"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Ítems del Comprobante</h4>
                <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          className="h-8 text-sm"
                          value={item.descripcion}
                          onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                          placeholder="Descripción del ítem"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={e => updateItem(idx, 'cantidad', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Precio Unit.</Label>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.precio_unitario}
                              onChange={e => updateItem(idx, 'precio_unitario', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Subtotal</Label>
                            <Input
                              className="h-8 text-sm font-mono bg-muted"
                              value={item.subtotal.toFixed(2)}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/80 shrink-0"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center text-lg font-bold px-1">
              <span>Total</span>
              <span className="font-mono">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={emitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleReemitir}
            disabled={loading || emitting || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {emitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Confirmar Reemisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
