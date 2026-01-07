'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCajasWithStats, type CajaWithStats } from '@/lib/actions/cajas'
import { CajaDialog } from '@/components/cajas/caja-dialog'
import { CajaDeleteAlert } from '@/components/cajas/caja-delete-alert'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export function CajasClient() {
  const [cajas, setCajas] = useState<CajaWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [selectedCaja, setSelectedCaja] = useState<CajaWithStats | null>(null)

  const loadCajas = async () => {
    setLoading(true)
    const result = await getCajasWithStats()
    if (result.success) {
      setCajas(result.data)
    } else {
      toast.error('Error al cargar cajas', {
        description: result.error
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCajas()
  }, [])

  const handleNuevaCaja = () => {
    setSelectedCaja(null)
    setDialogOpen(true)
  }

  const handleEditarCaja = (caja: CajaWithStats) => {
    setSelectedCaja(caja)
    setDialogOpen(true)
  }

  const handleEliminarCaja = (caja: CajaWithStats) => {
    setSelectedCaja(caja)
    setDeleteAlertOpen(true)
  }

  const handleSuccess = () => {
    loadCajas()
    setDialogOpen(false)
    setDeleteAlertOpen(false)
    setSelectedCaja(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando cajas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gestiona las cajas registradoras del hotel
        </p>
        <Button onClick={handleNuevaCaja}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caja
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Turno Activo</TableHead>
              <TableHead>Último Cierre</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cajas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay cajas registradas
                </TableCell>
              </TableRow>
            ) : (
              cajas.map((caja) => (
                <TableRow key={caja.id}>
                  <TableCell className="font-medium">{caja.nombre}</TableCell>
                  <TableCell>
                    {caja.estado ? (
                      <Badge variant="secondary" className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-500 text-white">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/configuracion/cajas/${caja.id}/series`}
                      className="text-blue-600 hover:underline"
                    >
                      {caja.total_series} serie(s)
                    </Link>
                  </TableCell>
                  <TableCell>
                    {caja.turno_activo ? (
                      <Badge variant="secondary" className="bg-orange-500 text-white">
                        Sí
                      </Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {caja.ultimo_cierre 
                      ? format(new Date(caja.ultimo_cierre), "dd MMM yyyy HH:mm", { locale: es })
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(caja.created_at), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditarCaja(caja)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/configuracion/cajas/${caja.id}/series`}>
                            Gestionar Series
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleEliminarCaja(caja)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <CajaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caja={selectedCaja}
        onSuccess={handleSuccess}
      />

      <CajaDeleteAlert
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        caja={selectedCaja}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
