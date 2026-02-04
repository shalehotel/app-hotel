'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, FileMinus, Info } from 'lucide-react'
import { emitirNotaCreditoManual } from '@/lib/actions/comprobantes'
import { differenceInDays, parseISO } from 'date-fns'

/**
 * Tipos de Nota de Crédito según SUNAT (Nubefact Doc API V1)
 * Solo mostramos los relevantes para hotelería
 */
const TIPOS_NOTA_CREDITO = [
    { value: '1', label: 'Anulación de la operación', description: 'Anula 100% del comprobante' },
    { value: '6', label: 'Devolución total', description: 'Devolver todo el dinero' },
    { value: '9', label: 'Disminución en el valor', description: 'Reducir monto parcialmente' },
    { value: '10', label: 'Otros conceptos', description: 'Otros ajustes' },
]

/**
 * Configuración de comportamiento por tipo de NC según SUNAT
 */
const CONFIGURACION_TIPO_NC: Record<string, {
    devolucion_obligatoria: boolean
    liberar_habitacion_default: boolean
    cancelar_reserva_default: boolean
    mostrar_pregunta_devolucion: boolean
    advertencia: string
    advertencia_tipo: 'info' | 'warning'
}> = {
    '1': {
        devolucion_obligatoria: true,
        liberar_habitacion_default: true,
        cancelar_reserva_default: true,
        mostrar_pregunta_devolucion: false,
        advertencia: '⏰ BOLETAS: Solo 7 días desde emisión. FACTURAS: Solo mes actual. Implica devolución total del dinero.',
        advertencia_tipo: 'warning'
    },
    '6': {
        devolucion_obligatoria: true,
        liberar_habitacion_default: true,
        cancelar_reserva_default: true,
        mostrar_pregunta_devolucion: false,
        advertencia: 'El servicio SÍ se prestó pero el cliente lo devuelve. Implica devolución total del dinero.',
        advertencia_tipo: 'info'
    },
    '9': {
        devolucion_obligatoria: false,
        liberar_habitacion_default: false,
        cancelar_reserva_default: false,
        mostrar_pregunta_devolucion: true,
        advertencia: 'Para descuentos, ajustes o acortamientos. Indicar si el cliente recibirá dinero en efectivo.',
        advertencia_tipo: 'info'
    },
    '10': {
        devolucion_obligatoria: false,
        liberar_habitacion_default: false,
        cancelar_reserva_default: false,
        mostrar_pregunta_devolucion: true,
        advertencia: 'Requiere documentación detallada. Especifique muy bien el motivo y si hay devolución de dinero.',
        advertencia_tipo: 'warning'
    }
}

const METODOS_DEVOLUCION = [
    { value: 'EFECTIVO', label: 'Efectivo (Egreso de caja)' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
    { value: 'PENDIENTE', label: 'Pendiente (Procesar después)' },
]

interface ComprobanteOriginal {
    id: string
    tipo_comprobante: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_INTERNO'
    numero_completo: string
    total_venta: number
    moneda: string
    cliente_nombre: string
    cliente_doc: string
    fecha_emision: string
    reserva_id?: string
}

interface EmitirNotaCreditoDialogProps {
    comprobante: ComprobanteOriginal | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EmitirNotaCreditoDialog({
    comprobante,
    open,
    onOpenChange,
    onSuccess
}: EmitirNotaCreditoDialogProps) {
    const [tipoNC, setTipoNC] = useState<string>('9')
    const [monto, setMonto] = useState<string>('')
    const [motivo, setMotivo] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // Nuevos estados para configuración de NC
    const [incluyeDevolucion, setIncluyeDevolucion] = useState(false)
    const [metodoDevolucion, setMetodoDevolucion] = useState<string>('EFECTIVO')
    const [liberarHabitacion, setLiberarHabitacion] = useState(false)
    const [cancelarReserva, setCancelarReserva] = useState(false)

    // Configuración del tipo de NC seleccionado
    const configTipo = CONFIGURACION_TIPO_NC[tipoNC]
    
    // Determinar si es anulación total (tipos 1 y 6 usan el monto completo)
    const esAnulacionTotal = tipoNC === '1' || tipoNC === '6'
    const montoEfectivo = esAnulacionTotal
        ? comprobante?.total_venta || 0
        : parseFloat(monto) || 0
    
    // Si el tipo obliga devolución, incluyeDevolucion debe ser true
    const devolucionEfectiva = configTipo?.devolucion_obligatoria || incluyeDevolucion

    // Reset al abrir
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setTipoNC('9')
            setMonto('')
            setMotivo('')
            setIncluyeDevolucion(false)
            setMetodoDevolucion('EFECTIVO')
            setLiberarHabitacion(false)
            setCancelarReserva(false)
            setError(null)
        }
        onOpenChange(newOpen)
    }
    
    // Actualizar defaults cuando cambia tipo de NC
    const handleTipoNCChange = (nuevoTipo: string) => {
        setTipoNC(nuevoTipo)
        const config = CONFIGURACION_TIPO_NC[nuevoTipo]
        if (config) {
            setLiberarHabitacion(config.liberar_habitacion_default)
            setCancelarReserva(config.cancelar_reserva_default)
            if (config.devolucion_obligatoria) {
                setIncluyeDevolucion(true)
            }
        }
    }

    const handleSubmit = async () => {
        if (!comprobante) return

        // Validaciones
        if (!motivo.trim()) {
            setError('Debe ingresar un motivo para la Nota de Crédito')
            return
        }

        if (!esAnulacionTotal && montoEfectivo <= 0) {
            setError('Debe ingresar un monto válido')
            return
        }

        if (!esAnulacionTotal && montoEfectivo > comprobante.total_venta) {
            setError(`El monto no puede superar el total del comprobante (${formatCurrency(comprobante.total_venta, comprobante.moneda)})`)
            return
        }
        
        // Validar que si hay devolución, se seleccione método
        if (devolucionEfectiva && !metodoDevolucion) {
            setError('Debe seleccionar el método de devolución')
            return
        }
        
        // Validación SUNAT: Tipo 1 tiene plazos estrictos
        if (tipoNC === '1' && comprobante.fecha_emision) {
            try {
                const diasTranscurridos = differenceInDays(new Date(), parseISO(comprobante.fecha_emision))
                
                if (comprobante.tipo_comprobante === 'BOLETA' && diasTranscurridos > 7) {
                    setError(`⏰ Plazo SUNAT excedido: Esta boleta fue emitida hace ${diasTranscurridos} días. SUNAT solo permite anular boletas dentro de 7 días.`)
                    return
                }
                
                if (comprobante.tipo_comprobante === 'FACTURA') {
                    const fechaEmision = parseISO(comprobante.fecha_emision)
                    const mesEmision = fechaEmision.getFullYear() * 12 + fechaEmision.getMonth()
                    const mesActual = new Date().getFullYear() * 12 + new Date().getMonth()
                    
                    if (mesEmision !== mesActual) {
                        setError(`⏰ Plazo SUNAT excedido: Esta factura fue emitida en un mes anterior. SUNAT solo permite anular facturas del mes actual.`)
                        return
                    }
                }
            } catch (err) {
                console.error('Error validando plazo SUNAT:', err)
            }
        }

        setLoading(true)
        setError(null)

        try {
            const resultado = await emitirNotaCreditoManual({
                comprobante_original_id: comprobante.id,
                tipo_nota_credito: parseInt(tipoNC),
                monto_devolucion: montoEfectivo,
                motivo: motivo.trim(),
                incluye_devolucion_dinero: devolucionEfectiva,
                metodo_devolucion: devolucionEfectiva ? metodoDevolucion : undefined,
                liberar_habitacion: liberarHabitacion,
                cancelar_reserva: cancelarReserva
            })

            if (resultado.success) {
                onOpenChange(false)
                onSuccess?.()
            } else {
                setError((resultado as any).error || 'Error al emitir la Nota de Crédito')
            }
        } catch (err) {
            setError('Error inesperado al procesar la solicitud')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number, currency: string = 'PEN') => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    if (!comprobante) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileMinus className="h-5 w-5 text-orange-500" />
                        Emitir Nota de Crédito
                    </DialogTitle>
                    <DialogDescription>
                        Emite una Nota de Crédito electrónica que modifica el comprobante seleccionado.
                        Esta acción es irreversible y será enviada a SUNAT.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Información del comprobante original */}
                    <div className="rounded-lg border bg-muted/50 p-3">
                        <p className="text-sm font-medium">Comprobante a modificar</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className="font-mono text-sm">{comprobante.numero_completo}</span>
                            <span className="font-semibold">
                                {formatCurrency(comprobante.total_venta, comprobante.moneda)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {comprobante.cliente_nombre} - {comprobante.cliente_doc}
                        </p>
                    </div>

                    {/* Tipo de NC */}
                    <div className="grid gap-2">
                        <Label htmlFor="tipo_nc">Tipo de Nota de Crédito *</Label>
                        <Select value={tipoNC} onValueChange={handleTipoNCChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIPOS_NOTA_CREDITO.map((tipo) => (
                                    <SelectItem key={tipo.value} value={tipo.value}>
                                        <div className="flex flex-col">
                                            <span>{tipo.label}</span>
                                            <span className="text-xs text-muted-foreground">{tipo.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {/* Advertencia específica por tipo */}
                        {configTipo && (
                            <Alert variant={configTipo.advertencia_tipo === 'warning' ? 'destructive' : 'default'}>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    {configTipo.advertencia}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Monto (solo si no es anulación total) */}
                    {!esAnulacionTotal && (
                        <div className="grid gap-2">
                            <Label htmlFor="monto">Monto a devolver *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {comprobante.moneda === 'USD' ? '$' : 'S/'}
                                </span>
                                <Input
                                    id="monto"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={comprobante.total_venta}
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Máximo: {formatCurrency(comprobante.total_venta, comprobante.moneda)}
                            </p>
                        </div>
                    )}

                    {/* Alerta para anulación total */}
                    {esAnulacionTotal && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Se emitirá NC por el monto total: {formatCurrency(comprobante.total_venta, comprobante.moneda)}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Motivo */}
                    <div className="grid gap-2">
                        <Label htmlFor="motivo">Motivo *</Label>
                        <Textarea
                            id="motivo"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Describa el motivo de la Nota de Crédito..."
                            rows={3}
                            maxLength={200}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {motivo.length}/200 caracteres
                        </p>
                    </div>
                    
                    {/* Separador */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Configuración de Devolución</h4>
                        
                        {/* Pregunta de devolución (solo para tipos 9 y 10) */}
                        {configTipo?.mostrar_pregunta_devolucion && (
                            <div className="flex items-center space-x-2 mb-3">
                                <Checkbox
                                    id="incluye_devolucion"
                                    checked={incluyeDevolucion}
                                    onCheckedChange={(checked) => setIncluyeDevolucion(checked === true)}
                                />
                                <Label htmlFor="incluye_devolucion" className="text-sm font-normal cursor-pointer">
                                    ¿El cliente recibirá devolución de dinero?
                                </Label>
                            </div>
                        )}
                        
                        {/* Selector de método de devolución */}
                        {devolucionEfectiva && (
                            <div className="grid gap-2 mb-3">
                                <Label htmlFor="metodo_devolucion">Método de devolución *</Label>
                                <Select value={metodoDevolucion} onValueChange={setMetodoDevolucion}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {METODOS_DEVOLUCION.map((metodo) => (
                                            <SelectItem key={metodo.value} value={metodo.value}>
                                                {metodo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {metodoDevolucion === 'EFECTIVO' && (
                                    <p className="text-xs text-orange-600">
                                        ⚠️ Se registrará un EGRESO de caja por {formatCurrency(montoEfectivo, comprobante?.moneda)}
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {/* Opciones operativas */}
                        {comprobante?.reserva_id && (
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="liberar_habitacion"
                                        checked={liberarHabitacion}
                                        onCheckedChange={(checked) => setLiberarHabitacion(checked === true)}
                                    />
                                    <Label htmlFor="liberar_habitacion" className="text-sm font-normal cursor-pointer">
                                        Liberar habitación (cambiar estado a LIBRE)
                                    </Label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="cancelar_reserva"
                                        checked={cancelarReserva}
                                        onCheckedChange={(checked) => setCancelarReserva(checked === true)}
                                    />
                                    <Label htmlFor="cancelar_reserva" className="text-sm font-normal cursor-pointer">
                                        Cancelar reserva (cambiar estado a CANCELADA)
                                    </Label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} variant="destructive">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <FileMinus className="mr-2 h-4 w-4" />
                                Emitir Nota de Crédito
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
