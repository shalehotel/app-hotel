'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { getTurnosAbiertos, cerrarTurnoEmergencia } from '@/lib/actions/cajas'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type TurnoAbierto = {
  id: string
  caja_id: string
  usuario_id: string
  fecha_apertura: string
  caja_nombre: string
  usuario_nombre: string
}

export function TurnosAdminClient() {
  const [turnos, setTurnos] = useState<TurnoAbierto[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)

  async function cargarTurnos() {
    setLoading(true)
    try {
      const result = await getTurnosAbiertos()
      if (result.success) {
        setTurnos(result.data)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error al cargar turnos:', error)
      toast.error('Error al cargar turnos abiertos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTurnos()
  }, [])

  async function handleCerrarEmergencia(turnoId: string) {
    setClosing(turnoId)
    try {
      const result = await cerrarTurnoEmergencia(turnoId)
      if (result.success) {
        toast.success('Turno cerrado exitosamente')
        await cargarTurnos() // Recargar lista
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error al cerrar turno:', error)
      toast.error('Error al cerrar turno')
    } finally {
      setClosing(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Turnos Abiertos
            </CardTitle>
            <CardDescription>
              {turnos.length === 0
                ? 'No hay turnos abiertos en el sistema'
                : `${turnos.length} turno(s) actualmente abierto(s)`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={cargarTurnos} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {turnos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Todo en orden</p>
            <p className="text-sm">No hay turnos huérfanos o problemáticos</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caja</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha Apertura</TableHead>
                  <TableHead>Tiempo Abierto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((turno) => {
                  const fechaApertura = new Date(turno.fecha_apertura)
                  const tiempoAbierto = formatDistanceToNow(fechaApertura, {
                    addSuffix: true,
                    locale: es
                  })
                  const esAntiguo = Date.now() - fechaApertura.getTime() > 24 * 60 * 60 * 1000 // Más de 24h

                  return (
                    <TableRow key={turno.id}>
                      <TableCell className="font-medium">{turno.caja_nombre}</TableCell>
                      <TableCell>{turno.usuario_nombre}</TableCell>
                      <TableCell>
                        {fechaApertura.toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={esAntiguo ? 'destructive' : 'secondary'}>
                          {tiempoAbierto}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={closing === turno.id}
                            >
                              {closing === turno.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2">Cerrar</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cerrar turno de emergencia?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto cerrará el turno de <strong>{turno.usuario_nombre}</strong> en{' '}
                                <strong>{turno.caja_nombre}</strong> sin procesar movimientos.
                                <br />
                                <br />
                                Los montos de cierre se establecerán iguales a los de apertura.
                                <br />
                                <strong className="text-red-600">Esta acción no se puede deshacer.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCerrarEmergencia(turno.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Cerrar Turno
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
