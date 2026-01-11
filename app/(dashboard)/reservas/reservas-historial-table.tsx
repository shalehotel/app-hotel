'use client'

import { useState, useEffect } from 'react'
import { getReservasHistorial, type OcupacionReserva } from '@/lib/actions/ocupaciones'
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
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ReservationDetailSheet } from '@/components/reservas/reservation-detail-sheet'

export function ReservasHistorialTable() {
  const [reservas, setReservas] = useState<OcupacionReserva[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filtros
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('TODAS')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  
  // Sheet
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [page, estado, fechaInicio, fechaFin]) // Search se maneja con debounce o manual

  async function cargarDatos() {
    try {
      setLoading(true)
      const result = await getReservasHistorial({
        page,
        pageSize: 10,
        search: search || undefined,
        estado,
        dateStart: fechaInicio ? new Date(fechaInicio) : undefined,
        dateEnd: fechaFin ? new Date(fechaFin) : undefined
      })
      
      setReservas(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error('Error al cargar historial:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1) // Reset page on search
    cargarDatos()
  }

  function handleVerDetalle(reservaId: string) {
    setSelectedReservaId(reservaId)
    setSheetOpen(true)
  }

  function getEstadoBadge(estado: string) {
    const variants = {
      'RESERVADA': 'outline',
      'CHECKED_IN': 'default',
      'CHECKED_OUT': 'secondary',
      'CANCELADA': 'destructive',
      'NO_SHOW': 'destructive'
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'outline'}>
        {estado.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-5 items-end">
        <div className="md:col-span-2">
          <Label>Búsqueda</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Código, Nombre o DNI..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="RESERVADA">Reservadas</SelectItem>
              <SelectItem value="CHECKED_IN">Check-in</SelectItem>
              <SelectItem value="CHECKED_OUT">Check-out</SelectItem>
              <SelectItem value="CANCELADA">Canceladas</SelectItem>
              <SelectItem value="NO_SHOW">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Desde</Label>
          <Input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Hasta</Label>
            <Input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)} 
            />
          </div>
          <Button type="submit" className="mb-0.5">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Huésped</TableHead>
              <TableHead>Habitación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : reservas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron resultados
                </TableCell>
              </TableRow>
            ) : (
              reservas.map((reserva) => (
                <TableRow key={reserva.id}>
                  <TableCell className="font-mono text-sm">{reserva.codigo_reserva}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(reserva.fecha_entrada), 'dd/MM/yyyy')}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reserva.fecha_entrada), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{reserva.titular_nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {reserva.titular_tipo_doc} {reserva.titular_numero_doc}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reserva.habitacion_numero} <span className="text-muted-foreground text-xs">({reserva.tipo_habitacion})</span>
                  </TableCell>
                  <TableCell>{getEstadoBadge(reserva.estado)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalle(reserva.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Total: {total} reservas
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="text-sm font-medium">
            Página {page} de {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
            }
          }}
          readonly={true}
        />
      )}
    </div>
  )
}
