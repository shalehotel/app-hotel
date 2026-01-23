'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Hotel,
  Calendar as CalendarIcon,
  AlertCircle,
  FileText,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Loader2
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import type {
  DashboardMetrics,
  IngresosPorMetodoPago,
  TendenciaIngresos,
  ResumenFacturacion,
  DashboardFilters
} from '@/lib/actions/dashboard'
import {
  getDashboardMetrics,
  getIngresosPorMetodoPago,
  getTendenciaIngresos,
  getResumenFacturacion
} from '@/lib/actions/dashboard'
import { DevolucionesPendientesAlert } from '@/components/dashboard/devoluciones-pendientes-alert'

// Custom Tooltip para gráficos - Moderno y Minimalista
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-popover px-3 py-1.5 text-sm shadow-none">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">
              {entry.name}:
            </span>
            <span className="font-medium">
              {entry.name === 'Ocupación'
                ? `${entry.value}%`
                : `S/ ${new Intl.NumberFormat('es-PE').format(entry.value as number)}`
              }
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

type Props = {
  metrics: DashboardMetrics
  ingresosPorMetodoPago: IngresosPorMetodoPago[]
  tendencia: TendenciaIngresos[]
  facturacion: ResumenFacturacion
  devolucionesPendientes?: any[]
}

type FilterMode = 'mes' | 'anterior' | 'trimestre' | 'custom'

export function DashboardClient({
  metrics: initialMetrics,
  ingresosPorMetodoPago: initialMetodosPago,
  tendencia: initialTendencia,
  facturacion: initialFacturacion,
  devolucionesPendientes
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [filterMode, setFilterMode] = useState<FilterMode>('mes')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [showCalendar, setShowCalendar] = useState(false)

  // Datos actuales
  const [metrics, setMetrics] = useState(initialMetrics)
  const [ingresosPorMetodoPago, setIngresosPorMetodoPago] = useState(initialMetodosPago)
  const [tendencia, setTendencia] = useState(initialTendencia)
  const [facturacion, setFacturacion] = useState(initialFacturacion)

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value)
  }

  // Obtener filtros según el modo seleccionado
  const getFiltersFromMode = (mode: FilterMode): DashboardFilters | undefined => {
    const hoy = new Date()

    switch (mode) {
      case 'mes':
        return undefined // Sin filtros = mes actual por defecto
      case 'anterior':
        return {
          fechaInicio: startOfMonth(subMonths(hoy, 1)).toISOString(),
          fechaFin: endOfMonth(subMonths(hoy, 1)).toISOString()
        }
      case 'trimestre':
        return {
          fechaInicio: startOfMonth(subMonths(hoy, 2)).toISOString(),
          fechaFin: endOfMonth(hoy).toISOString()
        }
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return {
            fechaInicio: dateRange.from.toISOString(),
            fechaFin: dateRange.to.toISOString()
          }
        }
        return undefined
      default:
        return undefined
    }
  }

  // Cargar datos con filtros
  const loadData = (mode: FilterMode) => {
    startTransition(async () => {
      const filters = getFiltersFromMode(mode)

      const [newMetrics, newMetodosPago, newTendencia, newFacturacion] = await Promise.all([
        getDashboardMetrics(filters),
        getIngresosPorMetodoPago(filters),
        getTendenciaIngresos(filters),
        getResumenFacturacion(filters)
      ])

      setMetrics(newMetrics)
      setIngresosPorMetodoPago(newMetodosPago)
      setTendencia(newTendencia)
      setFacturacion(newFacturacion)
    })
  }

  // Manejar cambio de modo de filtro
  const handleModeChange = (value: string) => {
    if (!value) return
    const mode = value as FilterMode
    setFilterMode(mode)
    if (mode === 'custom') {
      setShowCalendar(true)
    } else {
      setShowCalendar(false)
      loadData(mode)
    }
  }

  // Manejar selección de rango personalizado - NO cerrar hasta que haya ambas fechas
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    // Solo cerrar y cargar cuando ambas fechas estén seleccionadas
  }

  // Aplicar rango manualmente
  const handleApplyRange = () => {
    if (dateRange?.from && dateRange?.to) {
      setShowCalendar(false)
      loadData('custom')
    }
  }

  // Label del rango personalizado
  const customLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`
    : 'Rango'

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* Alerta de Devoluciones Pendientes */}
        {devolucionesPendientes && devolucionesPendientes.length > 0 && (
          <DevolucionesPendientesAlert devoluciones={devolucionesPendientes} />
        )}

        {/* Header: Título + Filtro en la misma fila */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dashboard Ejecutivo
            </h1>
            <p className="text-sm text-muted-foreground">
              {metrics.periodo_label}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={filterMode}
              onValueChange={handleModeChange}
              className="bg-muted p-0.5 rounded-lg"
            >
              <ToggleGroupItem
                value="mes"
                className="text-xs px-3 h-7 data-[state=on]:bg-background data-[state=on]:shadow-none rounded-md"
              >
                Este mes
              </ToggleGroupItem>
              <ToggleGroupItem
                value="anterior"
                className="text-xs px-3 h-7 data-[state=on]:bg-background data-[state=on]:shadow-none rounded-md"
              >
                Anterior
              </ToggleGroupItem>
              <ToggleGroupItem
                value="trimestre"
                className="text-xs px-3 h-7 data-[state=on]:bg-background data-[state=on]:shadow-none rounded-md"
              >
                3 meses
              </ToggleGroupItem>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <ToggleGroupItem
                    value="custom"
                    className="text-xs px-3 h-7 data-[state=on]:bg-background data-[state=on]:shadow-none rounded-md"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {filterMode === 'custom' ? customLabel : 'Rango'}
                  </ToggleGroupItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateRangeSelect}
                    locale={es}
                    numberOfMonths={2}
                  />
                  <div className="p-3 border-t flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCalendar(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyRange}
                      disabled={!dateRange?.from || !dateRange?.to}
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </ToggleGroup>

            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ingresos del Período */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Período</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatMoney(metrics.ingresos_periodo)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {metrics.crecimiento_ingresos >= 0 ? (
                  <>
                    <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">
                      +{metrics.crecimiento_ingresos}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="mr-1 h-3 w-3 text-rose-600" />
                    <span className="text-rose-600 font-medium">
                      {metrics.crecimiento_ingresos}%
                    </span>
                  </>
                )}
                <span className="ml-1">vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Ocupación */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
              <Hotel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{metrics.tasa_ocupacion}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.habitaciones_ocupadas} de {metrics.habitaciones_totales} habitaciones
              </p>
            </CardContent>
          </Card>

          {/* ADR */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">ADR</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs rounded-sm border shadow-none">
                    <p className="text-xs font-semibold mb-1">Average Daily Rate</p>
                    <p className="text-xs">Tarifa promedio por noche vendida.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatMoney(metrics.adr)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Por noche vendida
              </p>
            </CardContent>
          </Card>

          {/* RevPAR */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs rounded-sm border shadow-none">
                    <p className="text-xs font-semibold mb-1">Revenue Per Available Room</p>
                    <p className="text-xs">Ingreso por habitación disponible.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatMoney(metrics.revpar)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingreso por hab. disponible
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Segunda Fila de KPIs */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ingresos del Día */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatMoney(metrics.ingresos_hoy)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagos recibidos hoy
              </p>
            </CardContent>
          </Card>

          {/* Por Cobrar */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 tracking-tight">
                {formatMoney(metrics.total_por_cobrar)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.reservas_con_deuda} reservas con saldo
              </p>
            </CardContent>
          </Card>

          {/* Actividad del Día */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividad Hoy</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600 tracking-tight">{metrics.checkins_hoy}</span>
                <span className="text-sm text-muted-foreground">Check-ins</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-blue-600 tracking-tight">{metrics.checkouts_hoy}</span>
                <span className="text-xs text-muted-foreground">Check-outs</span>
              </div>
            </CardContent>
          </Card>

          {/* Reservas Futuras */}
          <Card className="rounded-md border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{metrics.reservas_futuras}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Reservas confirmadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficas */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Tendencia de Ingresos */}
          <Card className="col-span-1 lg:col-span-2 rounded-md border shadow-none">
            <CardHeader>
              <CardTitle>Tendencia de Ingresos</CardTitle>
              <CardDescription>Ingresos diarios y ocupación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {tendencia.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No hay datos para el período seleccionado</p>
                  </div>
                ) : (() => {
                  // Transformar datos: forzar ingresos >= 0 para visualización correcta
                  const tendenciaVisual = tendencia.map(d => ({
                    ...d,
                    ingresosVisual: Math.max(0, d.ingresos),
                    ingresosReal: d.ingresos // Mantener valor real para tooltip
                  }))
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tendenciaVisual} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="fecha"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickMargin={8}
                          interval={tendencia.length > 15 ? Math.floor(tendencia.length / 10) : 0}
                          minTickGap={30}
                        />
                        <YAxis
                          yAxisId="left"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          tickFormatter={(value) => `S/ ${value.toLocaleString()}`}
                          width={70}
                          domain={[0, 'dataMax']}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#3b82f6', fontSize: 11 }}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                          width={45}
                        />
                        <RechartsTooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="ingresosVisual"
                          name="Ingresos"
                          stroke="#0f172a"
                          fill="#e2e8f0"
                          strokeWidth={2}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          baseValue={0}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="ocupacion"
                          name="Ocupación"
                          stroke="#3b82f6"
                          fill="rgba(59, 130, 246, 0.1)"
                          strokeWidth={2}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          baseValue={0}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Ingresos por Método de Pago */}
          <Card className="rounded-md border shadow-none">
            <CardHeader>
              <CardTitle>Ingresos por Método de Pago</CardTitle>
              <CardDescription>Distribución de pagos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {ingresosPorMetodoPago.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No hay pagos en el período seleccionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ingresosPorMetodoPago}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      layout="horizontal"
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="metodo"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickMargin={8}
                        interval={0}
                        tickFormatter={(value) => {
                          // Acortar nombres largos
                          const nameMap: Record<string, string> = {
                            'DEVOLUCION_EFECTIVO': 'Dev. Efect.',
                            'DEVOLUCION_PENDIENTE': 'Dev. Pend.',
                            'TRANSFERENCIA': 'Transfer.',
                            'EFECTIVO': 'Efectivo',
                            'TARJETA': 'Tarjeta',
                            'YAPE': 'Yape',
                            'PLIN': 'Plin'
                          }
                          return nameMap[value] || value
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(value) => `S/ ${value.toLocaleString()}`}
                        width={70}
                      />
                      <RechartsTooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      />
                      <Bar
                        dataKey="monto"
                        name="Ingresos"
                        radius={[4, 4, 0, 0]}
                      >
                        {/* Colorear barras según valor positivo/negativo */}
                        {ingresosPorMetodoPago.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.monto < 0 ? '#ef4444' : '#0f172a'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen Facturación SUNAT */}
          <Card className="rounded-md border shadow-none">
            <CardHeader>
              <CardTitle>Resumen de Facturación</CardTitle>
              <CardDescription>Comprobantes emitidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Facturado</span>
                  </div>
                  <span className="text-lg font-bold">
                    {formatMoney(facturacion.total_facturado)}
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Boletas</span>
                    <span className="text-sm font-medium">
                      {formatMoney(facturacion.total_boletas)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Facturas</span>
                    <span className="text-sm font-medium">
                      {formatMoney(facturacion.total_facturas)}
                    </span>
                  </div>

                  {facturacion.pendientes_sunat > 0 && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Pendientes SUNAT
                        </span>
                        <span className="text-sm font-medium text-orange-500">
                          {facturacion.pendientes_sunat}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Ocupación del período</span>
                      <span className="font-semibold">{metrics.tasa_ocupacion_periodo}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
