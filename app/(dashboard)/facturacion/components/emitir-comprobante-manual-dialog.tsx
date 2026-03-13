'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
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
import {
    Loader2,
    Send,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Trash2,
    ChevronRight,
    ChevronLeft,
    FileText,
    User,
    ShoppingCart,
    Info,
    Receipt,
    Building2,
    Leaf,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSeriesDisponibles } from '@/lib/actions/comprobantes'
import { emitirComprobanteManual } from '@/lib/actions/comprobantes'
import { consultarDocumento } from '@/lib/actions/consulta-documento'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type TipoDoc = 'DNI' | 'RUC' | 'PASAPORTE' | 'CE' | 'DOC_EXTRANJERO' | 'SIN_RUC'

interface ItemManual {
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    codigo_afectacion_igv: '10' | '20' // '10' Gravado, '20' Exonerado (Selva)
}

interface EmitirComprobanteManualDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

// Helper: obtener longitud esperada por tipo de doc
function getLongitudDoc(tipo: TipoDoc) {
    if (tipo === 'DNI') return { min: 8, max: 8, label: 'DNI (8 dígitos)' }
    if (tipo === 'RUC') return { min: 11, max: 11, label: 'RUC (11 dígitos)' }
    return null // Otros docs: libre
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function EmitirComprobanteManualDialog({
    open,
    onOpenChange,
    onSuccess,
}: EmitirComprobanteManualDialogProps) {
    // ── Paso actual (1, 2 ó 3) ─────────────────────────────────────────────────
    const [paso, setPaso] = useState(1)

    // ── Carga de config y series ───────────────────────────────────────────────
    const [loadingInit, setLoadingInit] = useState(true)
    const [configError, setConfigError] = useState('')
    const [hotelConfig, setHotelConfig] = useState<any>(null)
    const [seriesBoleta, setSeriesBoleta] = useState<any[]>([])
    const [seriesFactura, setSeriesFactura] = useState<any[]>([])

    // ── Paso 1: tipo y serie ───────────────────────────────────────────────────
    const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA')
    const [serie, setSerie] = useState('')

    // ── Paso 2: datos del cliente ──────────────────────────────────────────────
    const [tipoDoc, setTipoDoc] = useState<TipoDoc>('DNI')
    const [numeroDoc, setNumeroDoc] = useState('')
    const [nombreCliente, setNombreCliente] = useState('')
    const [direccionCliente, setDireccionCliente] = useState('')
    const [buscandoDoc, setBuscandoDoc] = useState(false)
    const [docVerificado, setDocVerificado] = useState(false)
    const [errorApi, setErrorApi] = useState('')
    const [advertenciaApi, setAdvertenciaApi] = useState('')
    const [erroresPaso2, setErroresPaso2] = useState<Record<string, string>>({})

    // ── Paso 3: ítems ──────────────────────────────────────────────────────────
    const [items, setItems] = useState<ItemManual[]>([
        { descripcion: 'Servicio de Hospedaje - Habitación', cantidad: 1, precio_unitario: 0, subtotal: 0, codigo_afectacion_igv: '10' },
    ])
    const [erroresPaso3, setErroresPaso3] = useState<Record<string, string>>({})

    // ── Envío ──────────────────────────────────────────────────────────────────
    const [isPending, startTransition] = useTransition()

    // ─────────────────────────────────────────────────────────────────────────
    // Cargar config y series al abrir el dialog
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return

            ; (async () => {
                setLoadingInit(true)
                setConfigError('')
                resetForm()

                try {
                    const [config, boletaSeries, facturaSeries] = await Promise.all([
                        getHotelConfig(),
                        getSeriesDisponibles('BOLETA'),
                        getSeriesDisponibles('FACTURA'),
                    ])

                    if (!config) {
                        setConfigError('No hay configuración del hotel. Ve a Configuración > General.')
                        return
                    }
                    if (!config.facturacion_activa) {
                        setConfigError('La facturación electrónica no está activada en Configuración.')
                        return
                    }

                    setHotelConfig(config)
                    setSeriesBoleta(boletaSeries)
                    setSeriesFactura(facturaSeries)

                    // Seleccionar primera serie disponible según tipo
                    if (boletaSeries.length > 0) setSerie(boletaSeries[0].serie)

                    // Si el hotel es Selva, los ítems se ponen Exonerados por defecto
                    if (config.es_exonerado_igv) {
                        setItems([{ descripcion: 'Servicio de Hospedaje - Habitación', cantidad: 1, precio_unitario: 0, subtotal: 0, codigo_afectacion_igv: '20' }])
                    }
                } catch (e: any) {
                    setConfigError(e.message || 'Error inesperado al cargar configuración')
                } finally {
                    setLoadingInit(false)
                }
            })()
    }, [open])

    // Cuando cambia el tipo de comprobante → actualizar serie y tipo de doc
    useEffect(() => {
        const seriesActuales = tipoComprobante === 'BOLETA' ? seriesBoleta : seriesFactura
        if (seriesActuales.length > 0) {
            setSerie(seriesActuales[0].serie)
        } else {
            setSerie('')
        }
        // Factura fuerza RUC si estaba en DNI (pero permite dejar pasaporte if needed)
        if (tipoComprobante === 'FACTURA' && tipoDoc === 'DNI') {
            setTipoDoc('RUC')
        }
    }, [tipoComprobante, seriesBoleta, seriesFactura])

    // Cuando cambia tipo de doc, limpiar validación anterior
    useEffect(() => {
        setDocVerificado(false)
        setErrorApi('')
        setAdvertenciaApi('')
        setNumeroDoc('')
        setNombreCliente('')
        setDireccionCliente('')
    }, [tipoDoc])

    // ─────────────────────────────────────────────────────────────────────────
    // Reset
    // ─────────────────────────────────────────────────────────────────────────
    function resetForm() {
        setPaso(1)
        setTipoComprobante('BOLETA')
        setSerie('')
        setTipoDoc('DNI')
        setNumeroDoc('')
        setNombreCliente('')
        setDireccionCliente('')
        setDocVerificado(false)
        setErrorApi('')
        setAdvertenciaApi('')
        setErroresPaso2({})
        setErroresPaso3({})
        setItems([{ descripcion: 'Servicio de Hospedaje - Habitación', cantidad: 1, precio_unitario: 0, subtotal: 0, codigo_afectacion_igv: '10' }])
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Búsqueda de documento (PeruAPI)
    // ─────────────────────────────────────────────────────────────────────────
    const buscarDocumento = useCallback(async (doc: string, tipo: TipoDoc) => {
        if (!doc) return
        if (tipo === 'DNI' && doc.length !== 8) return
        if (tipo === 'RUC' && doc.length !== 11) return
        if (tipo !== 'DNI' && tipo !== 'RUC') return // Solo consultamos DNI y RUC

        setBuscandoDoc(true)
        setErrorApi('')
        setAdvertenciaApi('')
        setDocVerificado(false)

        try {
            const result = await consultarDocumento(tipo as 'DNI' | 'RUC', doc)

            if (result.success && result.data) {
                if (tipo === 'DNI' && result.data.nombres && result.data.apellidos) {
                    setNombreCliente(`${result.data.nombres} ${result.data.apellidos}`)
                } else if (tipo === 'RUC') {
                    if (result.data.razon_social) setNombreCliente(result.data.razon_social)
                    if (result.data.direccion) setDireccionCliente(result.data.direccion)
                }
                setDocVerificado(true)
                if (result.advertencia) setAdvertenciaApi(result.advertencia)
            } else {
                setErrorApi(result.error || 'Documento no encontrado en RENIEC/SUNAT')
            }
        } catch {
            setErrorApi('Error de conexión con el servicio de consulta')
        } finally {
            setBuscandoDoc(false)
        }
    }, [])

    // ─────────────────────────────────────────────────────────────────────────
    // Items helpers
    // ─────────────────────────────────────────────────────────────────────────
    function updateItem(idx: number, field: keyof ItemManual, value: any) {
        setItems(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], [field]: value }

            if (field === 'cantidad' || field === 'precio_unitario') {
                next[idx].subtotal = Number(
                    (next[idx].cantidad * next[idx].precio_unitario).toFixed(2)
                )
            }
            return next
        })
        // Limpiar error del ítem al editarlo
        if (erroresPaso3[`item_${idx}`]) {
            setErroresPaso3(prev => { const n = { ...prev }; delete n[`item_${idx}`]; return n })
        }
    }

    function addItem() {
        const defaultAfectacion = hotelConfig?.es_exonerado_igv ? '20' : '10'
        setItems(prev => [
            ...prev,
            { descripcion: 'Servicio de Hospedaje - Habitación', cantidad: 1, precio_unitario: 0, subtotal: 0, codigo_afectacion_igv: defaultAfectacion as '10' | '20' },
        ])
    }

    function removeItem(idx: number) {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cálculo de totales (usando config del hotel)
    // ─────────────────────────────────────────────────────────────────────────
    const TASA_IGV = hotelConfig?.es_exonerado_igv
        ? 0
        : (hotelConfig?.tasa_igv || 18) / 100

    const totales = items.reduce(
        (acc, item) => {
            const esExonerado = hotelConfig?.es_exonerado_igv || item.codigo_afectacion_igv === '20'
            if (esExonerado) {
                acc.exonerado += item.subtotal
            } else {
                const base = item.subtotal / (1 + TASA_IGV)
                acc.gravado += base
                acc.igv += item.subtotal - base
            }
            acc.total += item.subtotal
            return acc
        },
        { gravado: 0, exonerado: 0, igv: 0, total: 0 }
    )

    // ─────────────────────────────────────────────────────────────────────────
    // Validaciones por paso
    // ─────────────────────────────────────────────────────────────────────────
    function validarPaso1(): boolean {
        if (!serie) {
            toast.error('Seleccione una serie para el comprobante')
            return false
        }
        return true
    }

    function validarPaso2(): boolean {
        const errs: Record<string, string> = {}

        if (!numeroDoc.trim()) {
            errs.numeroDoc = 'Ingrese el número de documento'
        } else if (tipoDoc === 'DNI' && numeroDoc.length !== 8) {
            errs.numeroDoc = 'El DNI debe tener exactamente 8 dígitos'
        } else if (tipoDoc === 'RUC' && numeroDoc.length !== 11) {
            errs.numeroDoc = 'El RUC debe tener exactamente 11 dígitos'
        }

        if (!nombreCliente.trim()) {
            errs.nombre = 'Ingrese el nombre o razón social del cliente'
        }

        if (tipoComprobante === 'FACTURA' && !direccionCliente.trim()) {
            errs.direccion = 'La dirección es obligatoria para facturas'
        }

        const esExportacion = ['PASAPORTE', 'CE', 'DOC_EXTRANJERO', 'SIN_RUC'].includes(tipoDoc)
        if (!esExportacion && tipoDoc !== 'RUC' && tipoComprobante === 'FACTURA') {
            errs.tipoDoc = 'Las facturas requieren RUC'
        }

        setErroresPaso2(errs)
        return Object.keys(errs).length === 0
    }

    function validarPaso3(): boolean {
        const errs: Record<string, string> = {}

        items.forEach((item, idx) => {
            if (!item.descripcion.trim()) {
                errs[`item_${idx}`] = 'Ingrese la descripción'
            } else if (item.precio_unitario <= 0) {
                errs[`item_${idx}`] = 'El precio debe ser mayor a 0'
            } else if (item.cantidad <= 0) {
                errs[`item_${idx}`] = 'La cantidad debe ser mayor a 0'
            }
        })

        setErroresPaso3(errs)
        return Object.keys(errs).length === 0
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Navegación entre pasos
    // ─────────────────────────────────────────────────────────────────────────
    function handleSiguiente() {
        if (paso === 1 && validarPaso1()) setPaso(2)
        else if (paso === 2 && validarPaso2()) setPaso(3)
    }

    function handleAnterior() {
        if (paso > 1) setPaso(p => p - 1)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Enviar
    // ─────────────────────────────────────────────────────────────────────────
    function handleEmitir() {
        if (!validarPaso3()) return

        startTransition(async () => {
            try {
                const resultado = await emitirComprobanteManual({
                    tipo_comprobante: tipoComprobante,
                    serie,
                    cliente_tipo_doc: tipoDoc,
                    cliente_numero_doc: numeroDoc.trim(),
                    cliente_nombre: nombreCliente.trim(),
                    cliente_direccion: direccionCliente.trim() || undefined,
                    items: items.map(i => ({
                        descripcion: i.descripcion.trim(),
                        cantidad: i.cantidad,
                        precio_unitario: i.precio_unitario,
                        subtotal: i.subtotal,
                        codigo_afectacion_igv: hotelConfig?.es_exonerado_igv ? '20' : i.codigo_afectacion_igv,
                    })),
                })

                toast.success(`✅ ${resultado.numero_completo} emitido correctamente`)
                onOpenChange(false)
                onSuccess()
            } catch (err: any) {
                toast.error(err.message || 'Error al emitir el comprobante')
            }
        })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Series para el tipo actual
    // ─────────────────────────────────────────────────────────────────────────
    const seriesActuales = tipoComprobante === 'BOLETA' ? seriesBoleta : seriesFactura
    const esCliente_Extranjero = ['PASAPORTE', 'CE', 'DOC_EXTRANJERO', 'SIN_RUC'].includes(tipoDoc)
    const porcentajeIgvDisplay = hotelConfig?.tasa_igv ?? 18

    // ─────────────────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v) }}>
            <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4" />
                        Nuevo Comprobante Manual
                    </DialogTitle>

                    {/* Breadcrumb de pasos */}
                    <div className="flex items-center gap-1 text-xs mt-2">
                        {[
                            { n: 1, label: 'Tipo', icon: FileText },
                            { n: 2, label: 'Cliente', icon: User },
                            { n: 3, label: 'Ítems', icon: ShoppingCart },
                        ].map(({ n, label, icon: Icon }, i) => (
                            <div key={n} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <div
                                    className={cn(
                                        'flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition-colors',
                                        paso === n
                                            ? 'bg-primary text-primary-foreground'
                                            : paso > n
                                                ? 'bg-primary/20 text-primary'
                                                : 'text-muted-foreground'
                                    )}
                                >
                                    <Icon className="h-3 w-3" />
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogHeader>

                {/* ── Loading inicial ─────────────────────────────────────────────── */}
                {loadingInit ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Cargando configuración...</span>
                    </div>
                ) : configError ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{configError}</p>
                        <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    </div>
                ) : (
                    <div className="space-y-5 py-1">

                        {/* ══════════════════════════════════════════════════════════════
                PASO 1 — Tipo de Comprobante y Serie
            ══════════════════════════════════════════════════════════════ */}
                        {paso === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Comprobante</Label>
                                        <Select
                                            value={tipoComprobante}
                                            onValueChange={v => setTipoComprobante(v as 'BOLETA' | 'FACTURA')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BOLETA">
                                                    <div className="flex items-center gap-2">
                                                        <Receipt className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium">Boleta de Venta</div>
                                                            <div className="text-xs text-muted-foreground">Para personas naturales</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="FACTURA">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium">Factura</div>
                                                            <div className="text-xs text-muted-foreground">Requiere RUC del cliente</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Serie</Label>
                                        {seriesActuales.length === 0 ? (
                                            <div className="flex h-10 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
                                                Sin series — ir a Configuración › Cajas
                                            </div>
                                        ) : (
                                            <Select value={serie} onValueChange={setSerie}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar serie" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {seriesActuales.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.serie}>
                                                            <span className="font-mono font-medium">{s.serie}</span>
                                                            <span className="ml-2 text-muted-foreground text-xs">
                                                                (próximo #{String(s.correlativo_actual + 1).padStart(8, '0')})
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                {/* Aviso fiscal según config */}
                                {hotelConfig?.es_exonerado_igv ? (
                                    <div className="flex gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                                        <Leaf className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold">Régimen de Selva/Amazonía activo.</span> Todos los ítems se
                                            emitirán como <strong>Exonerados de IGV</strong> según la configuración del hotel.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
                                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            Tasa de IGV configurada: <strong>{porcentajeIgvDisplay}%</strong>.
                                            Los precios ingresados deben ser <strong>con IGV incluido</strong>.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════
                PASO 2 — Datos del Cliente
            ══════════════════════════════════════════════════════════════ */}
                        {paso === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Tipo de doc */}
                                    <div className="space-y-2">
                                        <Label className="text-xs">Tipo de Documento</Label>
                                        <Select
                                            value={tipoDoc}
                                            onValueChange={v => {
                                                const esExport = ['PASAPORTE', 'CE', 'DOC_EXTRANJERO', 'SIN_RUC'].includes(v)
                                                // Factura no permite DNI
                                                if (tipoComprobante === 'FACTURA' && v === 'DNI') return
                                                setTipoDoc(v as TipoDoc)
                                            }}
                                        >
                                            <SelectTrigger className={cn(erroresPaso2.tipoDoc && 'border-destructive')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DNI" disabled={tipoComprobante === 'FACTURA'}>DNI</SelectItem>
                                                <SelectItem value="RUC">RUC</SelectItem>
                                                <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                                <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                                                <SelectItem value="DOC_EXTRANJERO">Doc. Extranjero (sin RUC)</SelectItem>
                                                <SelectItem value="SIN_RUC">Sin doc. (ventas &lt; S/700)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {erroresPaso2.tipoDoc && (
                                            <p className="text-[10px] text-destructive">{erroresPaso2.tipoDoc}</p>
                                        )}
                                    </div>

                                    {/* Número de documento con búsqueda */}
                                    <div className="space-y-2">
                                        <Label className="text-xs">
                                            {getLongitudDoc(tipoDoc)?.label ?? 'Número de Documento'}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                className={cn('h-9 pr-9', erroresPaso2.numeroDoc && 'border-destructive')}
                                                value={numeroDoc}
                                                maxLength={tipoDoc === 'DNI' ? 8 : tipoDoc === 'RUC' ? 11 : undefined}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '') // Solo dígitos
                                                    setNumeroDoc(val)
                                                    setDocVerificado(false)
                                                    setErrorApi('')
                                                    setAdvertenciaApi('')
                                                    if (erroresPaso2.numeroDoc) setErroresPaso2(p => ({ ...p, numeroDoc: '' }))
                                                }}
                                                onBlur={() => buscarDocumento(numeroDoc, tipoDoc)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarDocumento(numeroDoc, tipoDoc) } }}
                                                placeholder={tipoDoc === 'RUC' ? '20XXXXXXXXX' : tipoDoc === 'DNI' ? '12345678' : 'Número'}
                                            />
                                            {buscandoDoc && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
                                            {!buscandoDoc && docVerificado && !advertenciaApi && (
                                                <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-green-500" />
                                            )}
                                            {!buscandoDoc && (errorApi || advertenciaApi) && (
                                                <AlertTriangle className="absolute right-2.5 top-2.5 h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                        {erroresPaso2.numeroDoc && <p className="text-[10px] text-destructive">{erroresPaso2.numeroDoc}</p>}
                                        {errorApi && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errorApi}</p>}
                                        {advertenciaApi && <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{advertenciaApi}</p>}
                                        {docVerificado && !errorApi && !advertenciaApi && (
                                            <p className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Verificado en RENIEC/SUNAT</p>
                                        )}
                                    </div>

                                    {/* Nombre / Razón Social */}
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-xs">Nombre / Razón Social</Label>
                                        <Input
                                            className={cn('h-9', erroresPaso2.nombre && 'border-destructive')}
                                            value={nombreCliente}
                                            onChange={e => { setNombreCliente(e.target.value); if (erroresPaso2.nombre) setErroresPaso2(p => ({ ...p, nombre: '' })) }}
                                            placeholder="Nombre completo o razón social"
                                        />
                                        {erroresPaso2.nombre && <p className="text-[10px] text-destructive">{erroresPaso2.nombre}</p>}
                                    </div>

                                    {/* Dirección */}
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-xs">
                                            Dirección Fiscal
                                            {tipoComprobante !== 'FACTURA' && (
                                                <span className="ml-1 text-muted-foreground">(opcional para boleta)</span>
                                            )}
                                        </Label>
                                        <Input
                                            className={cn('h-9', erroresPaso2.direccion && 'border-destructive')}
                                            value={direccionCliente}
                                            onChange={e => { setDireccionCliente(e.target.value); if (erroresPaso2.direccion) setErroresPaso2(p => ({ ...p, direccion: '' })) }}
                                            placeholder="Ej: Av. Los Álamos 123, Lima"
                                        />
                                        {erroresPaso2.direccion && <p className="text-[10px] text-destructive">{erroresPaso2.direccion}</p>}
                                    </div>
                                </div>

                                {/* Aviso cliente extranjero */}
                                {esCliente_Extranjero && (
                                    <div className="flex gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            Cliente extranjero sin RUC. SUNAT categoriza esto como <strong>Exportación de Servicios</strong> (IGV = 0).
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════
                PASO 3 — Ítems del Comprobante
            ══════════════════════════════════════════════════════════════ */}
                        {paso === 3 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">Ítems del Comprobante</h4>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={addItem}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Agregar ítem
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'border rounded-lg p-3 space-y-2 bg-muted/20',
                                                erroresPaso3[`item_${idx}`] && 'border-destructive'
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        className="h-8 text-sm"
                                                        value={item.descripcion}
                                                        onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                                                        placeholder="Descripción del ítem o servicio"
                                                    />
                                                    <div className={cn('grid gap-2', hotelConfig?.es_exonerado_igv ? 'grid-cols-3' : 'grid-cols-4')}>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                                                            <Input
                                                                className="h-8 text-sm"
                                                                type="number"
                                                                min="0.01"
                                                                step="0.01"
                                                                value={item.cantidad}
                                                                onChange={e => updateItem(idx, 'cantidad', Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">Precio c/IGV</Label>
                                                            <Input
                                                                className="h-8 text-sm"
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.precio_unitario}
                                                                onChange={e => updateItem(idx, 'precio_unitario', Number(e.target.value))}
                                                            />
                                                        </div>
                                                        {/* Solo mostrar selector de afectación si el hotel NO es Selva */}
                                                        {!hotelConfig?.es_exonerado_igv && (
                                                            <div>
                                                                <Label className="text-[10px] text-muted-foreground">IGV</Label>
                                                                <Select
                                                                    value={item.codigo_afectacion_igv}
                                                                    onValueChange={v => updateItem(idx, 'codigo_afectacion_igv', v)}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="10">Gravado ({porcentajeIgvDisplay}%)</SelectItem>
                                                                        <SelectItem value="20">Exonerado</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                        {hotelConfig?.es_exonerado_igv && (
                                                            <div>
                                                                <Label className="text-[10px] text-muted-foreground">IGV</Label>
                                                                <div className="flex h-8 items-center rounded-md border bg-muted px-2 text-[11px] text-muted-foreground gap-1">
                                                                    <Leaf className="h-3 w-3 text-emerald-600" />
                                                                    Exonerado
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <Label className="text-[10px] text-muted-foreground">Subtotal</Label>
                                                            <Input
                                                                className="h-8 text-sm font-mono bg-muted"
                                                                value={`S/ ${item.subtotal.toFixed(2)}`}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive/80 shrink-0 mt-0.5"
                                                        onClick={() => removeItem(idx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                            {erroresPaso3[`item_${idx}`] && (
                                                <p className="text-[10px] text-destructive flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {erroresPaso3[`item_${idx}`]}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Desglose de totales — lee config */}
                                <Separator />
                                <div className="space-y-1 text-sm">
                                    {totales.gravado > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Op. Gravadas (base)</span>
                                            <span className="font-mono">S/ {totales.gravado.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {totales.igv > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>IGV ({porcentajeIgvDisplay}%)</span>
                                            <span className="font-mono">S/ {totales.igv.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {totales.exonerado > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Op. Exoneradas</span>
                                            <span className="font-mono">S/ {totales.exonerado.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base pt-1">
                                        <span>Total</span>
                                        <span className="font-mono">S/ {totales.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Resumen del comprobante */}
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                                    <Badge variant="outline" className="font-mono">{serie}</Badge>
                                    <Badge variant="secondary">{tipoComprobante}</Badge>
                                    <span className="flex items-center gap-1">{tipoDoc} {numeroDoc}</span>
                                    {nombreCliente && <span className="truncate max-w-[180px]">{nombreCliente}</span>}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* ── Footer con navegación ─────────────────────────────────────── */}
                {!loadingInit && !configError && (
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={paso === 1 ? () => onOpenChange(false) : handleAnterior}
                            disabled={isPending}
                        >
                            {paso === 1 ? 'Cancelar' : (
                                <>
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Anterior
                                </>
                            )}
                        </Button>

                        {paso < 3 ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSiguiente}
                                disabled={!serie || isPending}
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
                                onClick={handleEmitir}
                                disabled={isPending || totales.total <= 0}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Emitiendo...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Emitir Comprobante
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
