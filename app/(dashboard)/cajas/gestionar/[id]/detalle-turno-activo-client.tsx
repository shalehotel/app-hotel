'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    ArrowLeft,
    Flag,
    TrendingUp,
    TrendingDown,
    Wallet,
    Banknote,
    CreditCard,
    Smartphone,
    Building2,
    Receipt,
    DollarSign,
    RotateCcw,
    Plus,
    LogOut,
    ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { RegistrarMovimientoDialog } from '@/components/cajas/registrar-movimiento-dialog'
import { CerrarCajaDialog } from '@/components/cajas/cerrar-caja-dialog'

type TurnoActivo = {
    turno: {
        id: string
        caja_nombre: string
        usuario_nombre: string
        fecha_apertura: string
        monto_apertura: number
    }
    estadisticas: {
        total_esperado_pen: number
        total_esperado_usd: number
        total_ingresos_pen: number
        total_egresos_pen: number
        desglose_metodos_pago?: {
            efectivo: number
            tarjeta: number
            billetera: number
            transferencia: number
            otros: number
        }
    }
    movimientos: any[]
}

type Props = {
    turnoId: string
    turnoInicial: TurnoActivo
}

export function DetalleTurnoActivoClient({ turnoId, turnoInicial }: Props) {
    const [turno, setTurno] = useState<TurnoActivo>(turnoInicial)

    // Por método de pago - usar datos reales del servidor o fallback a 0
    const porMetodo = turno.estadisticas.desglose_metodos_pago || {
        efectivo: 0,
        tarjeta: 0,
        billetera: 0,
        transferencia: 0,
        otros: 0
    }

    const movimientosIngresos = turno.movimientos.filter(m => m.tipo === 'INGRESO')
    const cantidadVentas = movimientosIngresos.length
    const ticketPromedio = cantidadVentas > 0 ? turno.estadisticas.total_ingresos_pen / cantidadVentas : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/cajas">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {turno.turno.caja_nombre} - Detalle de Sesión
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Cajero: {turno.turno.usuario_nombre}
                        </p>
                    </div>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                    Sesión Activa
                </Badge>
            </div>

            {/* Hora de apertura */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                Esta sesión fue abierta el {format(new Date(turno.turno.fecha_apertura), "d 'de' MMMM, yyyy, h:mm a", { locale: es })}
            </div>

            {/* KPIs Fila 1 - SIN Monto Real Contado ni Diferencia */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Saldo Inicial */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                            <Flag className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-2">
                            S/ {turno.turno.monto_apertura.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                {/* Total Ingresos */}
                <Card className="border-green-200">
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-green-600 font-medium">Total Ingresos</p>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            S/ {turno.estadisticas.total_ingresos_pen.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                {/* Total Egresos */}
                <Card className="border-red-200">
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-red-600 font-medium">Total Egresos</p>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            S/ {turno.estadisticas.total_egresos_pen.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                {/* Saldo en Caja (Teórico) */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-blue-600 font-medium">Saldo en Caja (Teórico)</p>
                            <Wallet className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                            S/ {turno.estadisticas.total_esperado_pen.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Acciones rápidas */}
            <div className="flex gap-3">
                <RegistrarMovimientoDialog />
                <CerrarCajaDialog
                    turnoId={turnoId}
                    totalEsperadoPen={turno.estadisticas.total_esperado_pen}
                    totalEsperadoUsd={turno.estadisticas.total_esperado_usd}
                />
            </div>

            {/* Cards inferiores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Por Método de Pago */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Método de Pago</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <MetodoPagoItem
                            icon={<Banknote className="h-4 w-4" />}
                            nombre="Efectivo"
                            descripcion="Lo que debe haber en el cajón"
                            monto={porMetodo.efectivo}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<CreditCard className="h-4 w-4" />}
                            nombre="Tarjetas"
                            descripcion="Debe cuadrar con el cierre del POS"
                            monto={porMetodo.tarjeta}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<Smartphone className="h-4 w-4" />}
                            nombre="Billeteras (Yape/Plin)"
                            descripcion="Debe cuadrar con el celular"
                            monto={porMetodo.billetera}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<Building2 className="h-4 w-4" />}
                            nombre="Transferencias"
                            monto={porMetodo.transferencia}
                        />
                    </CardContent>
                </Card>

                {/* Resumen Operativo */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Resumen Operativo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Receipt className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Cantidad de Ventas</p>
                                <p className="font-semibold">{cantidadVentas} tickets</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                                <p className="font-semibold">S/ {ticketPromedio.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <RotateCcw className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Cantidad de Devoluciones</p>
                                <p className="font-semibold">0 <span className="text-muted-foreground font-normal">(S/ 0.00)</span></p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Línea de Tiempo */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Línea de Tiempo</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Todas las transacciones ordenadas cronológicamente
                    </p>
                </CardHeader>
                <CardContent>
                    {turno.movimientos.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No hay movimientos registrados
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Hora</TableHead>
                                    <TableHead className="w-28">Tipo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Referencia</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {turno.movimientos.map((mov: any) => (
                                    <TableRow key={mov.id}>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(mov.created_at), 'HH:mm', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={mov.tipo === 'INGRESO'
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-red-100 text-red-700 border-red-200'
                                                }
                                            >
                                                {mov.tipo === 'INGRESO' ? '→' : '←'} {mov.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <RenderMotivo motivo={mov.motivo} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {mov.referencia || 'N/A'}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                            {mov.tipo === 'INGRESO' ? '+' : '-'} S/ {mov.monto.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function MetodoPagoItem({
    icon,
    nombre,
    descripcion,
    monto
}: {
    icon: React.ReactNode
    nombre: string
    descripcion?: string
    monto: number
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{icon}</div>
                <div>
                    <p className="font-medium text-sm">{nombre}</p>
                    {descripcion && (
                        <p className="text-xs text-muted-foreground">{descripcion}</p>
                    )}
                </div>
            </div>
            <p className="font-semibold">S/ {monto.toFixed(2)}</p>
        </div>
    )
}

function RenderMotivo({ motivo }: { motivo: string }) {
    if (!motivo) return null

    // Detectar patrón "Reserva CODIGO"
    // Ejemplo: "Cobro Reserva RES-1234 - EFECTIVO"
    const match = motivo.match(/(Reserva\s+)([A-Za-z0-9-]+)/)

    if (match) {
        const [fullMatch, prefix, codigo] = match
        const parts = motivo.split(fullMatch)

        return (
            <span>
                {parts[0]}
                {prefix}
                <Link
                    href={`/reservas?search=${codigo}`}
                    className="font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    title={`Ir a reserva ${codigo}`}
                >
                    {codigo}
                    <ExternalLink className="h-3 w-3" />
                </Link>
                {/* Unir el resto de las partes por si el código apareciera múltiples veces (raro pero posible) */}
                {parts.slice(1).join(fullMatch)}
            </span>
        )
    }

    return <span>{motivo}</span>
}
