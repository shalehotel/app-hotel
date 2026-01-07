'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getHistorialTurnos, type TurnoHistorial } from '@/lib/actions/turnos'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, AlertTriangle, XCircle, Search, Calendar, User, DollarSign, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export function HistorialCierresClient() {
  const [turnos, setTurnos] = useState<TurnoHistorial[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    usuario_id: '',
    caja_id: '',
    solo_descuadres: false
  })

  const cargarHistorial = async () => {
    setLoading(true)
    const result = await getHistorialTurnos(filtros)
    if (result.success) {
      setTurnos(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarHistorial()
  }, [])

  const getEstadoCuadreInfo = (turno: TurnoHistorial) => {
    const diferencia = (turno.monto_cierre_declarado || 0) - (turno.monto_cierre_sistema || 0)
    const tolerancia = 0.50

    if (Math.abs(diferencia) <= tolerancia) {
      return {
        label: 'Exacto',
        variant: 'secondary' as const,
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600'
      }
    } else if (diferencia > 0) {
      return {
        label: 'Sobrante',
        variant: 'default' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-yellow-600'
      }
    } else {
      return {
        label: 'Faltante',
        variant: 'destructive' as const,
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-red-600'
      }
    }
  }

  const calcularDiferencia = (turno: TurnoHistorial) => {
    if (!turno.monto_cierre_declarado || !turno.monto_cierre_sistema) return 0
    return turno.monto_cierre_declarado - turno.monto_cierre_sistema
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Desde</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Hasta</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estado de Cuadre</Label>
              <Select
                value={filtros.solo_descuadres ? 'descuadres' : 'todos'}
                onValueChange={(value) => setFiltros({ ...filtros, solo_descuadres: value === 'descuadres' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="descuadres">Solo Descuadres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={cargarHistorial} className="w-full" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando historial...
            </div>
          ) : turnos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron turnos cerrados
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Cierre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead className="text-right">Apertura</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Declarado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turnos.map((turno) => {
                    const estadoInfo = getEstadoCuadreInfo(turno)
                    const diferencia = calcularDiferencia(turno)

                    return (
                      <TableRow key={turno.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {turno.fecha_cierre 
                                ? format(new Date(turno.fecha_cierre), 'dd/MM/yyyy', { locale: es })
                                : '-'
                              }
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {turno.fecha_cierre 
                                ? format(new Date(turno.fecha_cierre), 'HH:mm', { locale: es })
                                : '-'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{turno.usuario.nombres} {turno.usuario.apellidos}</span>
                          </div>
                        </TableCell>
                        <TableCell>{turno.caja.nombre}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>S/ {turno.monto_apertura.toFixed(2)}</span>
                            {turno.monto_apertura_usd && turno.monto_apertura_usd > 0 && (
                              <span className="text-xs text-muted-foreground">
                                $ {turno.monto_apertura_usd.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {(turno.monto_cierre_sistema || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {(turno.monto_cierre_declarado || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${estadoInfo.color}`}>
                          {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={estadoInfo.variant} className="flex items-center gap-1 w-fit">
                            {estadoInfo.icon}
                            {estadoInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/cajas/historial/${turno.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Stats rápidas */}
          {!loading && turnos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-950">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Cuadres Exactos</div>
                  <div className="text-2xl font-bold text-green-600">
                    {turnos.filter(t => Math.abs(calcularDiferencia(t)) <= 0.50).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Con Sobrante</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {turnos.filter(t => calcularDiferencia(t) > 0.50).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 dark:bg-red-950">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Con Faltante</div>
                  <div className="text-2xl font-bold text-red-600">
                    {turnos.filter(t => calcularDiferencia(t) < -0.50).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
