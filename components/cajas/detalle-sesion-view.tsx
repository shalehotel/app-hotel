'use client'

import { useEffect, useState } from 'react'
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
import {
    ArrowLeft,
    Flag,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calculator,
    CheckCircle,
    Banknote,
    CreditCard,
    Smartphone,
    Building2,
    Receipt,
    DollarSign,
    RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

type Movimiento = {
    id: string
    tipo: 'INGRESO' | 'EGRESO'
    monto: number
    moneda: 'PEN' | 'USD'
    motivo: string
    categoria: string | null
    metodo_pago: string | null
    referencia: string | null
    created_at: string
    usuario_nombre?: string
}

type DetalleSesion = {
    id: string
    caja_nombre: string
    usuario_nombre: string
    fecha_apertura: string
    fecha_cierre: string | null
    monto_apertura: number
    monto_cierre_sistema: number | null
    monto_cierre_declarado: number | null
    estado: 'ABIERTO' | 'CERRADO'
    estadisticas: {
        total_ingresos_pen: number
        total_egresos_pen: number
        total_esperado_pen: number
        por_metodo: {
            efectivo: number
            tarjeta: number
            billetera: number
            transferencia: number
        }
        cantidad_ventas: number
        ticket_promedio: number
        cantidad_devoluciones: number
        monto_devoluciones: number
    }
    movimientos: Movimiento[]
}

type Props = {
    detalle: DetalleSesion
}

export function DetalleSesionView({ detalle }: Props) {
    const esCerrada = detalle.estado === 'CERRADO'
    const diferencia = esCerrada && detalle.monto_cierre_declarado && detalle.monto_cierre_sistema
        ? detalle.monto_cierre_declarado - detalle.monto_cierre_sistema
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/cajas">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">
                        {detalle.caja_nombre} - Detalle de Sesión
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Cajero: {detalle.usuario_nombre}
                    </p>
                </div>
            </div>

            {/* Fecha de cierre (solo si está cerrada) */}
            {esCerrada && detalle.fecha_cierre && (
                <div className="bg-muted/50 border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                    Esta sesión fue cerrada el {format(new Date(detalle.fecha_cierre), "d 'de' MMMM, yyyy, h:mm a", { locale: es })}
                </div>
            )}

            {/* KPIs Fila 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Saldo Inicial */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                            <Flag className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-2">
                            S/ {detalle.monto_apertura.toFixed(2)}
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
                            S/ {detalle.estadisticas.total_ingresos_pen.toFixed(2)}
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
                            S/ {detalle.estadisticas.total_egresos_pen.toFixed(2)}
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
                            S/ {detalle.estadisticas.total_esperado_pen.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* KPIs Fila 2 - Solo cajas cerradas */}
            {esCerrada && (
                <div className="grid grid-cols-2 gap-4">
                    {/* Monto Real Contado */}
                    <Card className="border-pink-200 bg-pink-50/50">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <p className="text-sm text-pink-600 font-medium">Monto Real Contado</p>
                                <Calculator className="h-4 w-4 text-pink-600" />
                            </div>
                            <p className="text-2xl font-bold text-pink-600 mt-2">
                                S/ {(detalle.monto_cierre_declarado || 0).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Diferencia */}
                    <Card className={`${Math.abs(diferencia) < 0.5 ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <p className={`text-sm font-medium ${Math.abs(diferencia) < 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                                    Diferencia
                                </p>
                                <CheckCircle className={`h-4 w-4 ${Math.abs(diferencia) < 0.5 ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                            <p className={`text-2xl font-bold mt-2 ${Math.abs(diferencia) < 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                                S/ {diferencia.toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                            monto={detalle.estadisticas.por_metodo.efectivo}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<CreditCard className="h-4 w-4" />}
                            nombre="Tarjetas"
                            descripcion="Debe cuadrar con el cierre del POS"
                            monto={detalle.estadisticas.por_metodo.tarjeta}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<Smartphone className="h-4 w-4" />}
                            nombre="Billeteras (Yape/Plin)"
                            descripcion="Debe cuadrar con el celular"
                            monto={detalle.estadisticas.por_metodo.billetera}
                        />
                        <Separator />
                        <MetodoPagoItem
                            icon={<Building2 className="h-4 w-4" />}
                            nombre="Transferencias"
                            monto={detalle.estadisticas.por_metodo.transferencia}
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
                                <p className="font-semibold">{detalle.estadisticas.cantidad_ventas} tickets</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                                <p className="font-semibold">S/ {detalle.estadisticas.ticket_promedio.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <RotateCcw className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Cantidad de Devoluciones</p>
                                <p className="font-semibold">
                                    {detalle.estadisticas.cantidad_devoluciones}{' '}
                                    <span className="text-muted-foreground font-normal">
                                        (S/ {detalle.estadisticas.monto_devoluciones.toFixed(2)})
                                    </span>
                                </p>
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
                    {detalle.movimientos.length === 0 ? (
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
                                {detalle.movimientos.map((mov) => (
                                    <TableRow key={mov.id}>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(mov.created_at), 'HH:mm', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={mov.tipo === 'INGRESO' ? 'default' : 'destructive'}
                                                className={mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                                            >
                                                {mov.tipo === 'INGRESO' ? '→' : '←'} {mov.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{mov.motivo}</TableCell>
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
