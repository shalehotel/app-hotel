'use client'

import { useState } from 'react'
import { Comprobante } from './columns'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
    MoreHorizontal,
    Eye,
    Download,
    FileMinus,
    MessageCircle,
    Printer
} from 'lucide-react'
import { toast } from 'sonner'

interface ComprobanteActionsProps {
    comprobante: Comprobante
    meta: any
}

export function ComprobanteActions({ comprobante, meta }: ComprobanteActionsProps) {
    const [whatsappOpen, setWhatsappOpen] = useState(false)
    const [whatsappData, setWhatsappData] = useState({ numero: '', mensaje: '' })

    function handleImprimir() {
        if (comprobante.pdf_url) {
            window.open(comprobante.pdf_url, '_blank')
        } else {
            window.open(`/api/comprobantes/pdf/${comprobante.id}`, '_blank')
        }
    }

    function abrirWhatsApp() {
        // Intenta obtener número del cliente si está disponible en la data de la fila (a veces no está todo)
        // Nota: 'columns.tsx' type Comprobante no tiene 'cliente_telefono'.
        // Si queremos que funcione automágico aquí, necesitamos que el endpoint de la tabla devuelva el teléfono.
        // Por ahora, empezaremos vacío o con lo que tengamos, y el usuario puede escribir.
        // OJO: La vista 'vw_historial_comprobantes' (usada en la tabla) podría no tener el teléfono.
        // Si es crítico, habría que actualizar la vista o la query.
        // Asumiremos vacío por defecto si no está en row.original.

        const numero = ''
        const link = comprobante.pdf_url || `${window.location.origin}/api/comprobantes/pdf/${comprobante.id}`
        const mensaje = `Hola *${comprobante.cliente_nombre}*, te enviamos tu comprobante *${comprobante.numero_completo}*.\n\nPuedes descargarlo aquí:\n${link}`

        setWhatsappData({ numero, mensaje })
        setWhatsappOpen(true)
    }

    function enviarWhatsApp() {
        let num = whatsappData.numero.replace(/\D/g, '')
        if (!num) {
            toast.error('Ingresa un número válido')
            return
        }
        if (num.length === 9 && !num.startsWith('51')) {
            num = '51' + num
        }
        const url = `https://wa.me/${num}?text=${encodeURIComponent(whatsappData.mensaje)}`
        window.open(url, '_blank')
        setWhatsappOpen(false)
        toast.success('Abriendo WhatsApp...')
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => meta?.onVerDetalle?.(comprobante.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalle
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleImprimir}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={abrirWhatsApp}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Enviar WhatsApp
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => meta?.onDescargarPDF?.(comprobante.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar PDF
                    </DropdownMenuItem>

                    {(comprobante.estado_sunat === 'ACEPTADO' || comprobante.estado_sunat === 'PENDIENTE') && comprobante.tipo_comprobante !== 'NOTA_CREDITO' && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => meta?.onAnular?.(comprobante.id)}
                                className="text-orange-600"
                            >
                                <FileMinus className="mr-2 h-4 w-4" />
                                Emitir Nota de Crédito
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

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
