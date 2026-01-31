'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Wallet, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { marcarDevolucionProcesada } from '@/lib/actions/cajas'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

type Devolucion = {
    id: string
    monto: number
    fecha_pago: string
    nota: string | null
    reserva: {
        codigo_reserva: string
        huesped: {
            nombre_completo: string
        } | null
    } | null
}

// Calcular días pendiente y nivel de urgencia
function calcularUrgencia(fechaPago: string) {
    const dias = Math.floor((Date.now() - new Date(fechaPago).getTime()) / (1000 * 60 * 60 * 24))
    let nivel: 'normal' | 'urgente' | 'critico' = 'normal'
    let color = 'bg-green-100 text-green-800'

    if (dias >= 7) {
        nivel = 'critico'
        color = 'bg-red-100 text-red-800'
    } else if (dias >= 3) {
        nivel = 'urgente'
        color = 'bg-amber-100 text-amber-800'
    }

    return { dias, nivel, color }
}

export function DevolucionesPendientesAlert({ devoluciones }: { devoluciones: Devolucion[] }) {
    const router = useRouter()

    if (!devoluciones || devoluciones.length === 0) return null

    // Ordenar por urgencia (más antiguas primero)
    const devolucionesOrdenadas = [...devoluciones].sort(
        (a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()
    )

    return (
        <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    Devoluciones Pendientes ({devoluciones.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {devolucionesOrdenadas.map((dev) => {
                        const urgencia = calcularUrgencia(dev.fecha_pago)
                        return (
                            <div key={dev.id} className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-amber-900">
                                            Reserva: {dev.reserva?.codigo_reserva} - {dev.reserva?.huesped?.nombre_completo || 'Huésped'}
                                        </p>
                                        <Badge className={urgencia.color}>
                                            <Clock className="h-3 w-3 mr-1" />
                                            {urgencia.dias}d
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-amber-700">
                                        Monto a devolver: <span className="font-bold">S/ {Math.abs(dev.monto).toFixed(2)}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Registrado: {new Date(dev.fecha_pago).toLocaleString()}
                                    </p>
                                </div>

                                <ProcesarDevolucionDialog
                                    devolucion={dev}
                                    onProcesado={() => {
                                        toast.success('Devolución marcada como procesada')
                                        router.refresh()
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

function ProcesarDevolucionDialog({ devolucion, onProcesado }: { devolucion: Devolucion, onProcesado: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [metodo, setMetodo] = useState('YAPE')

    const handleProcesar = async () => {
        setLoading(true)
        try {
            const res = await marcarDevolucionProcesada(devolucion.id, metodo)
            if (res.success) {
                setOpen(false)
                onProcesado()
            } else {
                toast.error('Error al procesar: ' + res.error)
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    Procesar Pago
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Procesar Devolución</DialogTitle>
                    <DialogDescription>
                        Confirma que has realizado el pago de <strong>S/ {Math.abs(devolucion.monto).toFixed(2)}</strong> al cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>¿Con qué método pagaste?</Label>
                        <Select value={metodo} onValueChange={setMetodo}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="YAPE">Yape / Plin</SelectItem>
                                <SelectItem value="TRANSFERENCIA">Transferencia Bancaria</SelectItem>
                                <SelectItem value="TARJETA">Extorno a Tarjeta</SelectItem>
                                <SelectItem value="EFECTIVO">Efectivo (Caja Chica)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleProcesar} disabled={loading}>
                        {loading ? 'Procesando...' : 'Confirmar Pago'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
