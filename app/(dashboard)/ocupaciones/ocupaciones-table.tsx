'use client'

import { useState, useEffect } from 'react'
import { getOcupacionesActuales, type OcupacionReserva } from '@/lib/actions/ocupaciones'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ReservationDetailSheet } from '@/components/reservas/reservation-detail-sheet'

export function OcupacionesTable() {
  const [ocupaciones, setOcupaciones] = useState<OcupacionReserva[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'RESERVADA' | 'CHECKED_IN' | 'CHECKED_OUT'>('TODAS')
  const [filtroSoloDeuda, setFiltroSoloDeuda] = useState(false)
  const [busquedaHabitacion, setBusquedaHabitacion] = useState('')
  const [busquedaHuesped, setBusquedaHuesped] = useState('')
  
  // Sheet
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    cargarOcupaciones()
  }, [filtroEstado, filtroSoloDeuda, busquedaHabitacion, busquedaHuesped])

  async function cargarOcupaciones() {
    try {
      setLoading(true)
      const data = await getOcupacionesActuales({
        estado: filtroEstado,
        solo_con_deuda: filtroSoloDeuda,
        habitacion: busquedaHabitacion || undefined,
        huesped: busquedaHuesped || undefined
      })
      setOcupaciones(data)
    } catch (error) {
      console.error('Error al cargar ocupaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleVerDetalle(reservaId: string) {
    setSelectedReservaId(reservaId)
    setSheetOpen(true)
  }

  function getEstadoBadge(estado: string) {
    const variants = {
      'RESERVADA': 'outline',
      'CHECKED_IN': 'default',
      'CHECKED_OUT': 'secondary'
    } as const

    const colors = {
      'RESERVADA': 'text-blue-600',
      'CHECKED_IN': 'text-green-600',
      'CHECKED_OUT': 'text-gray-600'
    }

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'default'} className={colors[estado as keyof typeof colors]}>
        {estado.replace('_', ' ')}
      </Badge>
    )
  }

  function getSaldoBadge(saldo: number) {
    if (saldo === 0) {
      return <Badge className="bg-green-500 text-white">PAGADO</Badge>
    }
    return <Badge variant="destructive" className="font-bold">DEBE S/ {saldo.toFixed(2)}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="filtro-estado">Estado</Label>
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
            <SelectTrigger id="filtro-estado">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="RESERVADA">Reservadas</SelectItem>
              <SelectItem value="CHECKED_IN">Check-in</SelectItem>
              <SelectItem value="CHECKED_OUT">Check-out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="filtro-deuda">Saldo Pendiente</Label>
          <Select value={filtroSoloDeuda ? 'SI' : 'TODAS'} onValueChange={(v) => setFiltroSoloDeuda(v === 'SI')}>
            <SelectTrigger id="filtro-deuda">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="SI">Solo con deuda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="busqueda-habitacion">Habitación</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="busqueda-habitacion"
              placeholder="Buscar por número..."
              className="pl-8"
              value={busquedaHabitacion}
              onChange={(e) => setBusquedaHabitacion(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="busqueda-huesped">Huésped</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="busqueda-huesped"
              placeholder="Buscar por nombre..."
              className="pl-8"
              value={busquedaHuesped}
              onChange={(e) => setBusquedaHuesped(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Habitación</TableHead>
              <TableHead>Huésped Titular</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Noches</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : ocupaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron ocupaciones
                </TableCell>
              </TableRow>
            ) : (
              ocupaciones.map((ocupacion) => (
                <TableRow key={ocupacion.id}>
                  <TableCell className="font-mono text-sm">{ocupacion.codigo_reserva}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{ocupacion.habitacion_numero}</span>
                      <span className="text-xs text-muted-foreground">
                        Piso {ocupacion.habitacion_piso} • {ocupacion.tipo_habitacion}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{ocupacion.titular_nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {ocupacion.titular_tipo_doc} {ocupacion.titular_numero_doc}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>
                        {format(new Date(ocupacion.fecha_entrada), 'dd MMM', { locale: es })} →{' '}
                        {format(new Date(ocupacion.fecha_salida), 'dd MMM', { locale: es })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ocupacion.fecha_entrada), 'yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{ocupacion.total_noches}</Badge>
                  </TableCell>
                  <TableCell>{getEstadoBadge(ocupacion.estado)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {getSaldoBadge(ocupacion.saldo_pendiente)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalle(ocupacion.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet de detalle */}
      {selectedReservaId && (
        <ReservationDetailSheet
          reservaId={selectedReservaId}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) {
              setSelectedReservaId(null)
              // Recargar después de cerrar por si hubo cambios
              cargarOcupaciones()
            }
          }}
        />
      )}
    </div>
  )
}
