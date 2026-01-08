'use client'

import { useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Receipt, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { cobrarYFacturar } from '@/lib/actions/pagos'
import { getSeriesDisponibles } from '@/lib/actions/comprobantes'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reserva: {
    id: string
    saldo_pendiente: number
    titular_nombre: string
    titular_tipo_doc: string
    titular_numero_doc: string
    habitacion_numero: string
    precio_pactado: number
  }
  onSuccess: () => void
}

export function RegistrarPagoDialog({ open, onOpenChange, reserva, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [series, setSeries] = useState<any[]>([])
  
  // Estado del Formulario
  const [monto, setMonto] = useState(reserva.saldo_pendiente.toString())
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA')
  const [serieId, setSerieId] = useState('')
  
  // Datos Cliente
  const [clienteDoc, setClienteDoc] = useState(reserva.titular_numero_doc)
  const [clienteNombre, setClienteNombre] = useState(reserva.titular_nombre)
  const [clienteDireccion, setClienteDireccion] = useState('')

  // Efecto: Cargar series cuando cambia el tipo de comprobante
  useEffect(() => {
    if (open) {
      loadSeries(tipoComprobante)
      // Resetear monto al saldo pendiente si se abre de nuevo
      setMonto(reserva.saldo_pendiente.toString())
      setClienteDoc(reserva.titular_numero_doc)
      setClienteNombre(reserva.titular_nombre)
    }
  }, [open, tipoComprobante])

  async function loadSeries(tipo: 'BOLETA' | 'FACTURA') {
    try {
      const data = await getSeriesDisponibles(tipo)
      setSeries(data)
      if (data.length > 0) {
        setSerieId(data[0].serie)
      } else {
        setSerieId('')
      }
    } catch (error) {
      console.error('Error cargando series:', error)
      toast.error('No se pudieron cargar las series de comprobantes')
    }
  }

  async function handleSubmit() {
    if (!monto || parseFloat(monto) <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }
    if (!serieId) {
      toast.error('Seleccione una serie de comprobante')
      return
    }

    try {
      setLoading(true)
      
      const result = await cobrarYFacturar({
        reserva_id: reserva.id,
        metodo_pago: metodoPago as any,
        monto: parseFloat(monto),
        moneda: 'PEN', // MVP: Todo en Soles
        
        tipo_comprobante: tipoComprobante,
        serie: serieId,
        cliente_tipo_doc: tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI', // Simplificación MVP
        cliente_numero_doc: clienteDoc,
        cliente_nombre: clienteNombre,
        cliente_direccion: clienteDireccion,
        
        items: [
          {
            descripcion: `Pago a cuenta - Habitación ${reserva.habitacion_numero}`,
            cantidad: 1,
            precio_unitario: parseFloat(monto),
            subtotal: parseFloat(monto),
            codigo_afectacion_igv: '10' // Gravado por defecto
          }
        ]
      })

      if (result.success) {
        toast.success(`Cobro exitoso. Comprobante ${result.comprobante.serie}-${result.comprobante.numero} emitido.`)
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al procesar el cobro')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cobrar y Facturar</DialogTitle>
          <DialogDescription>
            Registra el ingreso de dinero y emite el comprobante fiscal.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detalles">Detalles de Pago</TabsTrigger>
            <TabsTrigger value="facturacion">Datos Facturación</TabsTrigger>
          </TabsList>

          <TabsContent value="detalles" className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium">Saldo Pendiente:</span>
              <span className="text-xl font-bold text-destructive">S/ {reserva.saldo_pendiente.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto a Cobrar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">S/</span>
                  <Input 
                    type="number" 
                    className="pl-8 font-bold" 
                    value={monto} 
                    onChange={(e) => setMonto(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta de Crédito/Débito</SelectItem>
                    <SelectItem value="YAPE">Yape</SelectItem>
                    <SelectItem value="PLIN">Plin</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="facturacion" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Comprobante</Label>
                <Select 
                  value={tipoComprobante} 
                  onValueChange={(v: any) => setTipoComprobante(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETA">Boleta de Venta</SelectItem>
                    <SelectItem value="FACTURA">Factura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serie</Label>
                <Select value={serieId} onValueChange={setSerieId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione serie" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map(s => (
                      <SelectItem key={s.id} value={s.serie}>
                        {s.serie} (Actual: {s.correlativo_actual})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input 
                value={clienteNombre} 
                onChange={(e) => setClienteNombre(e.target.value)} 
                placeholder="Razón Social / Nombre"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Documento</Label>
                <Input 
                  value={clienteDoc} 
                  onChange={(e) => setClienteDoc(e.target.value)} 
                  placeholder="RUC / DNI"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección (Opcional)</Label>
                <Input 
                  value={clienteDireccion} 
                  onChange={(e) => setClienteDireccion(e.target.value)} 
                  placeholder="Dirección fiscal"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
            Cobrar y Facturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
