'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Loader2, Receipt, CreditCard, Banknote, ArrowRightLeft, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cobrarYFacturar } from '@/lib/actions/pagos'
import { getSeriesDisponibles } from '@/lib/actions/comprobantes'
import { consultarDocumento } from '@/lib/actions/consulta-documento'
import { differenceInCalendarDays } from 'date-fns'
import { getDocumentError, isValidDNI, isValidRUC } from '@/lib/utils/validation'

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
    fecha_entrada: string
    fecha_salida: string
  }
  onSuccess: () => void
}

export function RegistrarPagoDialog({ open, onOpenChange, reserva, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const idempotencyKeyRef = useRef<string>('')

  // Resetear clave de idempotencia al abrir/cerrar
  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = crypto.randomUUID()
    }
  }, [open])
  const [series, setSeries] = useState<any[]>([])

  // Estado del Formulario
  const [monto, setMonto] = useState(reserva.saldo_pendiente.toString())
  const [montoRecibido, setMontoRecibido] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [numeroOperacion, setNumeroOperacion] = useState('')
  const [nota, setNota] = useState('')

  // =====================================================
  // HELPERS DE TIPO DE DOCUMENTO
  // =====================================================
  const ES_EXPORTACION = ['PASAPORTE', 'DOC_EXTRANJERO', 'CEDULA_DIPLOMATICA', 'SIN_RUC']

  function getTipoComprobanteParaDoc(tipoDoc: string): 'BOLETA' | 'FACTURA' {
    if (ES_EXPORTACION.includes(tipoDoc) || tipoDoc === 'RUC') return 'FACTURA'
    return 'BOLETA'
  }

  // Facturación
  const tipoComprobanteInicial = getTipoComprobanteParaDoc(reserva.titular_tipo_doc || 'DNI')
  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>(tipoComprobanteInicial)
  const [serieId, setSerieId] = useState('')

  // Datos Cliente
  const [clienteTipoDoc, setClienteTipoDoc] = useState(reserva.titular_tipo_doc || 'DNI')
  const [clienteDoc, setClienteDoc] = useState(reserva.titular_numero_doc)
  const [clienteNombre, setClienteNombre] = useState(reserva.titular_nombre)
  const [clienteDireccion, setClienteDireccion] = useState('')

  // Estado de búsqueda API
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [advertenciaApi, setAdvertenciaApi] = useState('')
  const [docVerificado, setDocVerificado] = useState(false)

  // Cálculos
  const montoNum = parseFloat(monto) || 0
  const recibidoNum = parseFloat(montoRecibido) || 0
  const vuelto = Math.max(0, recibidoNum - montoNum)
  const falta = Math.max(0, montoNum - recibidoNum)

  // Efecto: Cargar series y resetear al abrir
  useEffect(() => {
    if (open) {
      // 1. Calcular el tipo de comprobante correcto según el doc del titular
      const tipoDocTitular = reserva.titular_tipo_doc || 'DNI'
      const tipoCorrectoAlAbrir = getTipoComprobanteParaDoc(tipoDocTitular)

      // 2. Inicializar doc + nombre del titular
      setClienteTipoDoc(tipoDocTitular)
      setClienteDoc(reserva.titular_numero_doc)
      setClienteNombre(reserva.titular_nombre)
      setClienteDireccion('')

      // 3. Si necesitamos cambiar el tipo de comprobante, forzarlo
      setTipoComprobante(tipoCorrectoAlAbrir)
      loadSeries(tipoCorrectoAlAbrir)

      // Resetear pagos
      setMonto(reserva.saldo_pendiente.toString())
      setMontoRecibido('')
      setNumeroOperacion('')
      setNota('')
      setErrorApi('')
      setAdvertenciaApi('')
      setDocVerificado(false)
    }
  }, [open]) // Solo dep de `open` para no recargar al cambiar tipoComprobante interactivamente

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

  // Auto-ajustar documento al cambiar tipo
  const handleTipoChange = (tipo: 'BOLETA' | 'FACTURA') => {
    setTipoComprobante(tipo)
    setErrorApi('')
    setAdvertenciaApi('')
    setDocVerificado(false)

    if (tipo === 'FACTURA') {
      // Limpiar campos para factura
      setClienteDoc('')
      setClienteNombre('')
      setClienteDireccion('')
    } else {
      // Restaurar datos del huésped para boleta
      setClienteDoc(reserva.titular_numero_doc)
      setClienteNombre(reserva.titular_nombre)
      setClienteDireccion('')
    }
  }

  // =====================================================
  // CONSULTA APISPerú — DNI o RUC
  // =====================================================
  const buscarDocumentoAPI = useCallback(async (doc: string) => {
    if (!doc) return

    // Solo buscamos en API si es peruano
    if (clienteTipoDoc !== 'DNI' && clienteTipoDoc !== 'RUC') return

    const tipo = clienteTipoDoc // Ya viene como 'DNI' o 'RUC'

    // Validar longitudes mínimas
    if (tipo === 'DNI' && doc.length !== 8) return
    if (tipo === 'RUC' && doc.length !== 11) return

    setBuscandoDoc(true)
    setErrorApi('')
    setAdvertenciaApi('')
    setDocVerificado(false)

    try {
      const result = await consultarDocumento(tipo, doc)

      if (result.success && result.data) {
        if (tipo === 'DNI') {
          // Auto-llenar nombre con datos de RENIEC
          if (result.data.nombres && result.data.apellidos) {
            setClienteNombre(`${result.data.nombres} ${result.data.apellidos}`)
          }
        } else if (tipo === 'RUC') {
          // Auto-llenar razón social y dirección con datos de SUNAT
          if (result.data.razon_social) setClienteNombre(result.data.razon_social)
          if (result.data.direccion) setClienteDireccion(result.data.direccion)
        }

        setDocVerificado(true)

        if (result.advertencia) {
          setAdvertenciaApi(result.advertencia)
        }
      } else {
        setErrorApi(result.error || 'Documento no encontrado')
      }
    } catch (error) {
      setErrorApi('Error de conexión con el servicio')
    } finally {
      setBuscandoDoc(false)
    }
  }, [tipoComprobante])

  async function handleSubmit() {
    if (montoNum <= 0) {
      toast.error('El monto a cobrar debe ser mayor a 0')
      return
    }

    if (metodoPago === 'EFECTIVO' && recibidoNum < montoNum) {
      toast.error(`Faltan S/ ${falta.toFixed(2)} para cubrir el monto`)
      return
    }

    if (!serieId) {
      toast.error('Seleccione una serie de comprobante')
      return
    }

    if (tipoComprobante === 'FACTURA') {
      if (clienteDoc.length !== 11) {
        toast.error('Para factura, el RUC debe tener 11 dígitos')
        return
      }
      if (!clienteNombre) {
        toast.error('La Razón Social es obligatoria para factura')
        return
      }
      if (!isValidRUC(clienteDoc)) {
        toast.error('El RUC ingresado no es válido')
        return
      }
    } else {
      // Validación DNI si aplica (longitud 8)
      if (clienteDoc.length === 8 && !isValidDNI(clienteDoc)) {
        toast.error('El DNI ingresado no es válido')
        return
      }
    }

    try {
      setLoading(true)

      // Cálculo de noches y desglose profesional
      const noches = Math.max(1, differenceInCalendarDays(
        new Date(reserva.fecha_salida.split('T')[0] + 'T12:00:00'),
        new Date(reserva.fecha_entrada.split('T')[0] + 'T12:00:00')
      ))

      const totalEstadiaReal = noches * reserva.precio_pactado
      const esPagoTotal = Math.abs(montoNum - totalEstadiaReal) < 0.01

      // Definir item del comprobante
      const itemComprobante = esPagoTotal
        ? {
          descripcion: `Servicio de Hospedaje - Habitación ${reserva.habitacion_numero} (${noches} noches)`,
          cantidad: noches,
          precio_unitario: reserva.precio_pactado,
          subtotal: montoNum,
          codigo_afectacion_igv: '10'
        }
        : {
          descripcion: `Regularización Alojamiento - Habitación ${reserva.habitacion_numero}`,
          cantidad: 1,
          precio_unitario: montoNum,
          subtotal: montoNum,
          codigo_afectacion_igv: '10'
        }

      // IDEMPOTENCIA: Usar la clave persistente de este intento
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID()
      }

      const result = await cobrarYFacturar({
        idempotencyKey: idempotencyKeyRef.current,
        reserva_id: reserva.id,
        metodo_pago: metodoPago as any,
        monto: montoNum,
        moneda: 'PEN', // MVP: Todo en Soles
        referencia_pago: numeroOperacion,
        nota: nota,

        tipo_comprobante: tipoComprobante,
        serie: serieId,
        cliente_tipo_doc: clienteTipoDoc,
        cliente_numero_doc: clienteDoc,
        cliente_nombre: clienteNombre,
        cliente_direccion: clienteDireccion,

        items: [itemComprobante]
      })

      if (result.success && result.comprobante) {
        toast.success(`Pago registrado: ${result.comprobante.serie}-${result.comprobante.numero}`)
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Cobrar y Facturar
          </DialogTitle>
          <DialogDescription>
            Registra el pago y genera el comprobante electrónico.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          {/* COLUMNA IZQUIERDA: PAGO */}
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Monto a Cobrar</Label>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm font-medium text-muted-foreground">S/</span>
                <Input
                  type="number"
                  step="0.01"
                  className="text-2xl font-bold h-10 border-0 bg-transparent p-0 focus-visible:ring-0 w-full"
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
                  <SelectItem value="TARJETA">Tarjeta (POS)</SelectItem>
                  <SelectItem value="YAPE">Yape</SelectItem>
                  <SelectItem value="PLIN">Plin</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculadora de Vuelto (Solo Efectivo) */}
            {metodoPago === 'EFECTIVO' && (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-3">
                <div>
                  <Label htmlFor="recibido" className="text-xs text-blue-600">Dinero Recibido</Label>
                  <div className="relative mt-1">
                    <Banknote className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-400" />
                    <Input
                      id="recibido"
                      type="number"
                      placeholder="0.00"
                      className="pl-9 bg-white"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-2 border-blue-200">
                  <span className="text-sm font-medium text-blue-700">Vuelto:</span>
                  <span className={`text-lg font-bold ${vuelto > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    S/ {vuelto.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Referencia (No Efectivo) */}
            {metodoPago !== 'EFECTIVO' && (
              <div className="space-y-2">
                <Label htmlFor="ref">Nro. Operación / Ref</Label>
                <div className="relative">
                  <ArrowRightLeft className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ref"
                    placeholder="Últimos 4 dígitos"
                    className="pl-9"
                    value={numeroOperacion}
                    onChange={(e) => setNumeroOperacion(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: FACTURACIÓN */}
          <div className="space-y-4 border-l pl-6">
            <div className="space-y-2">
              <Label>Comprobante</Label>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <Button
                    type="button"
                    variant={tipoComprobante === 'BOLETA' ? 'default' : 'outline'}
                    size="sm"
                    disabled={['RUC', 'PASAPORTE', 'DOC_EXTRANJERO', 'CEDULA_DIPLOMATICA', 'SIN_RUC'].includes(clienteTipoDoc)}
                    onClick={() => {
                      if (clienteTipoDoc === 'RUC') {
                        setClienteTipoDoc('DNI')
                      }
                      handleTipoChange('BOLETA')
                    }}
                  >
                    Boleta
                  </Button>
                  <Button
                    type="button"
                    variant={tipoComprobante === 'FACTURA' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (clienteTipoDoc === 'DNI') {
                        setClienteTipoDoc('RUC')
                      }
                      handleTipoChange('FACTURA')
                    }}
                  >
                    Factura
                  </Button>
                </div>
              </div>
              {serieId ? (
                <p className="text-xs text-muted-foreground text-right px-1">
                  Serie asignada: <span className="font-mono font-medium">{serieId}</span>
                </p>
              ) : (
                <p className="text-xs text-destructive text-right px-1">
                  ⚠️ Sin serie configurada
                </p>
              )}
            </div>

            {/* DOCUMENTO — con búsqueda APISPerú y Select de Tipo */}
            <div className="space-y-2">
              <Label>Documento del Comprobante</Label>
              <div className="flex gap-2">
                <Select
                  value={clienteTipoDoc}
                  onValueChange={(val) => {
                    setClienteTipoDoc(val)
                    setErrorApi('')
                    setAdvertenciaApi('')
                    setDocVerificado(false)
                    setClienteNombre('')
                    setClienteDoc('')

                    // LÓGICA DE NEGOCIO NUBEFACT: Si es Extranjero, FORZAR FACTURA
                    const esExtranjeroParaExportacion = ['PASAPORTE', 'DOC_EXTRANJERO', 'CEDULA_DIPLOMATICA', 'SIN_RUC'].includes(val)
                    if (esExtranjeroParaExportacion || val === 'RUC') {
                      handleTipoChange('FACTURA')
                    }
                    if (val === 'DNI' && tipoComprobante === 'FACTURA') {
                      handleTipoChange('BOLETA')
                    }
                  }}
                >
                  <SelectTrigger className="w-[110px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="RUC">RUC</SelectItem>
                    <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                    <SelectItem value="CE">C.E.</SelectItem>
                    <SelectItem value="DOC_EXTRANJERO">Doc. Ext.</SelectItem>
                    <SelectItem value="SIN_RUC">Sin RUC</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Input
                    value={clienteDoc}
                    onChange={(e) => {
                      setClienteDoc(e.target.value)
                      setErrorApi('')
                      setAdvertenciaApi('')
                      setDocVerificado(false)
                    }}
                    onBlur={() => buscarDocumentoAPI(clienteDoc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        buscarDocumentoAPI(clienteDoc)
                      }
                    }}
                    placeholder={clienteTipoDoc === 'RUC' ? '20...' : 'Número'}
                    maxLength={clienteTipoDoc === 'RUC' ? 11 : 20}
                    className={`pr-10 ${errorApi || getDocumentError(clienteTipoDoc, clienteDoc) ? 'border-red-500' : ''}`}
                  />
                  {buscandoDoc && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {!buscandoDoc && docVerificado && !advertenciaApi && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                  )}
                  {!buscandoDoc && advertenciaApi && (
                    <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-amber-500" />
                  )}
                  {!buscandoDoc && errorApi && (
                    <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {getDocumentError(clienteTipoDoc, clienteDoc) && (
                <p className="text-[10px] text-red-500 font-medium mt-1">
                  {getDocumentError(clienteTipoDoc, clienteDoc)}
                </p>
              )}
              {errorApi && (
                <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {errorApi}
                </p>
              )}
              {advertenciaApi && (
                <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {advertenciaApi}
                </p>
              )}
              {docVerificado && !errorApi && !advertenciaApi && (
                <p className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Documento verificado
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{clienteTipoDoc === 'RUC' ? 'Razón Social *' : 'Nombre Cliente *'}</Label>
              <Input
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre o Razón Social"
              />
            </div>

            <div className="space-y-2">
              <Label>Dirección {clienteTipoDoc === 'RUC' ? '(Fiscal)' : '(Opcional)'}</Label>
              <Input
                value={clienteDireccion}
                onChange={(e) => setClienteDireccion(e.target.value)}
                placeholder="Dirección fiscal"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between items-center">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {tipoComprobante} {serieId ? `${serieId}-###` : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="px-8">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Cobrar S/ {montoNum.toFixed(2)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}