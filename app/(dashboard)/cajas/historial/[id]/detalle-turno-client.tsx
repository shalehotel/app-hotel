'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDetalleTurno, getMovimientosTurno, type TurnoDetalle } from '@/lib/actions/turnos'
import { getMovimientosByTurno, type MovimientoConUsuario } from '@/lib/actions/movimientos'
import { format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Clock, User, DollarSign, CheckCircle2, AlertTriangle, XCircle, 
  TrendingUp, TrendingDown, FileText, Receipt, Printer 
} from 'lucide-react'

type Props = {
  turnoId: string
  turnoInicial: TurnoDetalle
}

export function DetalleTurnoClient({ turnoId, turnoInicial }: Props) {
  const [turno, setTurno] = useState<TurnoDetalle>(turnoInicial)
  const [movimientosPagos, setMovimientosPagos] = useState<any>(null)
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoConUsuario[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [turnoId])

  const cargarDatos = async () => {
    setLoading(true)
    const [resultTurno, resultPagos, resultMovimientos] = await Promise.all([
      getDetalleTurno(turnoId),
      getMovimientosTurno(turnoId),
      getMovimientosByTurno(turnoId)
    ])

    if (resultTurno.success) setTurno(resultTurno.data)
    if (resultPagos.success) setMovimientosPagos(resultPagos.data)
    if (resultMovimientos.success) setMovimientosCaja(resultMovimientos.data)
    
    setLoading(false)
  }

  const calcularDuracion = () => {
    if (!turno.fecha_cierre) return '-'
    const minutos = differenceInMinutes(
      new Date(turno.fecha_cierre),
      new Date(turno.fecha_apertura)
    )
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}min`
  }

  const calcularDiferencia = () => {
    if (!turno.monto_cierre_declarado || !turno.monto_cierre_sistema) return 0
    return turno.monto_cierre_declarado - turno.monto_cierre_sistema
  }

  const getEstadoCuadre = () => {
    const diferencia = calcularDiferencia()
    const tolerancia = 0.50

    if (Math.abs(diferencia) <= tolerancia) {
      return {
        label: 'Cuadre Exacto',
        variant: 'secondary' as const,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'bg-green-50 dark:bg-green-950 border-green-200 text-green-700'
      }
    } else if (diferencia > 0) {
      return {
        label: 'Sobrante Detectado',
        variant: 'default' as const,
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 text-yellow-700'
      }
    } else {
      return {
        label: 'Faltante Detectado',
        variant: 'destructive' as const,
        icon: <XCircle className="h-5 w-5" />,
        color: 'bg-red-50 dark:bg-red-950 border-red-200 text-red-700'
      }
    }
  }

  const estadoCuadre = getEstadoCuadre()

  return (
    <div className="space-y-6">
      {/* Header con información principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detalle de Turno</h1>
          <p className="text-muted-foreground">
            {turno.caja.nombre} - {turno.usuario.nombres} {turno.usuario.apellidos}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Estado del Cuadre */}
      <Card className={estadoCuadre.color}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {estadoCuadre.icon}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{estadoCuadre.label}</h3>
              <p className="text-sm opacity-80">
                Diferencia: {calcularDiferencia() > 0 ? '+' : ''}S/ {calcularDiferencia().toFixed(2)}
              </p>
            </div>
            <Badge variant={estadoCuadre.variant} className="text-base px-4 py-2">
              {turno.estado}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duración del Turno
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calcularDuracion()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(turno.fecha_apertura), 'HH:mm', { locale: es })} - {' '}
              {turno.fecha_cierre ? format(new Date(turno.fecha_cierre), 'HH:mm', { locale: es }) : 'Abierto'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Monto Apertura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {turno.monto_apertura.toFixed(2)}</div>
            {turno.monto_apertura_usd && turno.monto_apertura_usd > 0 && (
              <p className="text-sm text-muted-foreground">$ {turno.monto_apertura_usd.toFixed(2)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sistema Esperaba</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              S/ {(turno.monto_cierre_sistema || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuario Declaró</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              S/ {(turno.monto_cierre_declarado || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles */}
      <Tabs defaultValue="flujo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flujo">Flujo de Efectivo</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos de Caja</TabsTrigger>
          <TabsTrigger value="pagos">Pagos Recibidos</TabsTrigger>
        </TabsList>

        {/* Tab: Flujo de Efectivo */}
        <TabsContent value="flujo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Flujo de Efectivo</CardTitle>
              <CardDescription>Cálculo detallado del efectivo en caja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  Apertura
                </span>
                <span className="font-semibold">S/ {turno.monto_apertura.toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg text-green-600">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ventas (Efectivo)
                </span>
                <span className="font-semibold">
                  +S/ {movimientosPagos ? movimientosPagos.totalEfectivoPEN.toFixed(2) : '0.00'}
                </span>
              </div>

              {movimientosCaja.filter(m => m.tipo === 'INGRESO').length > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Ingresos Extras
                  </span>
                  <span className="font-semibold">
                    +S/ {movimientosCaja
                      .filter(m => m.tipo === 'INGRESO' && m.moneda === 'PEN')
                      .reduce((sum, m) => sum + m.monto, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              {movimientosCaja.filter(m => m.tipo === 'EGRESO').length > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    Egresos (Gastos)
                  </span>
                  <span className="font-semibold">
                    -S/ {movimientosCaja
                      .filter(m => m.tipo === 'EGRESO' && m.moneda === 'PEN')
                      .reduce((sum, m) => sum + m.monto, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex justify-between items-center text-xl font-bold">
                <span>= TEÓRICO (Sistema)</span>
                <span className="text-blue-600">S/ {(turno.monto_cierre_sistema || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-xl font-bold">
                <span>Usuario Declaró</span>
                <span className="text-purple-600">S/ {(turno.monto_cierre_declarado || 0).toFixed(2)}</span>
              </div>

              <Separator className="my-4 border-2" />

              <div className={`flex justify-between items-center text-2xl font-bold ${
                Math.abs(calcularDiferencia()) <= 0.50 ? 'text-green-600' : 
                calcularDiferencia() > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                <span>Diferencia</span>
                <span>{calcularDiferencia() > 0 ? '+' : ''}S/ {calcularDiferencia().toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Movimientos de Caja */}
        <TabsContent value="movimientos">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Caja</CardTitle>
              <CardDescription>Ingresos y egresos registrados durante el turno</CardDescription>
            </CardHeader>
            <CardContent>
              {movimientosCaja.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se registraron movimientos de caja
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosCaja.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="text-sm">
                            {format(new Date(mov.created_at), 'dd/MM HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={mov.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                              {mov.tipo === 'INGRESO' ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {mov.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{mov.motivo}</TableCell>
                          <TableCell className={`text-right font-semibold ${
                            mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mov.tipo === 'INGRESO' ? '+' : '-'}
                            {mov.moneda === 'PEN' ? 'S/' : '$'} {mov.monto.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {mov.usuario.nombres} {mov.usuario.apellidos}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagos Recibidos */}
        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Pagos Recibidos</CardTitle>
              <CardDescription>Resumen por método de pago</CardDescription>
            </CardHeader>
            <CardContent>
              {!movimientosPagos ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Efectivo</div>
                        <div className="text-xl font-bold text-green-600">
                          S/ {movimientosPagos.totalEfectivoPEN.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Tarjeta</div>
                        <div className="text-xl font-bold">
                          S/ {movimientosPagos.totalTarjeta.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Yape</div>
                        <div className="text-xl font-bold">
                          S/ {movimientosPagos.totalYape.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-xl font-bold text-blue-600">
                          S/ {movimientosPagos.totalGeneral.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {movimientosPagos.pagos.length} transacciones registradas
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
