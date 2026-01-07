'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Power, PowerOff, DollarSign } from 'lucide-react'
import { 
  createTarifa, 
  updateTarifa, 
  toggleTarifaActiva,
  deleteTarifa,
  type Tarifa
} from '@/lib/actions/tarifas'
import { toast } from 'sonner'

type Tipo = {
  id: string
  nombre: string
}

type Categoria = {
  id: string
  nombre: string
}

type Props = {
  tarifas: Tarifa[]
  tipos: Tipo[]
  categorias: Categoria[]
}

export function TarifasClient({ tarifas, tipos, categorias }: Props) {
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTarifaId, setSelectedTarifaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      if (editingId) {
        await updateTarifa(editingId, formData)
        toast.success('Tarifa actualizada correctamente')
      } else {
        await createTarifa(formData)
        toast.success('Tarifa creada correctamente')
      }
      
      setOpen(false)
      setEditingId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar tarifa')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (tarifa: Tarifa) => {
    setEditingId(tarifa.id)
    setOpen(true)
  }

  const handleToggleActiva = async (id: string, activa: boolean) => {
    try {
      await toggleTarifaActiva(id, !activa)
      toast.success(activa ? 'Tarifa desactivada' : 'Tarifa activada')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async () => {
    if (!selectedTarifaId) return
    
    try {
      await deleteTarifa(selectedTarifaId)
      toast.success('Tarifa eliminada')
      setDeleteDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const editingTarifa = editingId ? tarifas.find(t => t.id === editingId) : null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(price)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tarifas ({tarifas.length})</CardTitle>
              <CardDescription>Define precios base y mínimos negociables</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen)
              if (!isOpen) setEditingId(null)
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Nueva Tarifa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? 'Editar Tarifa' : 'Nueva Tarifa'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingId 
                        ? 'Modifica los precios de la tarifa'
                        : 'Define una nueva tarifa para tipo y categoría'
                      }
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {!editingId && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="tipo_habitacion_id">Tipo de Habitación</Label>
                          <Select name="tipo_habitacion_id" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tipos.map(tipo => (
                                <SelectItem key={tipo.id} value={tipo.id}>
                                  {tipo.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="categoria_habitacion_id">Categoría</Label>
                          <Select name="categoria_habitacion_id" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categorias.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="nombre_tarifa">Nombre de Tarifa</Label>
                      <Input
                        id="nombre_tarifa"
                        name="nombre_tarifa"
                        placeholder="Ej: Tarifa Base 2025"
                        defaultValue={editingTarifa?.nombre_tarifa}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="precio_base">
                          Precio Base
                          <span className="text-xs text-muted-foreground ml-1">(sugerido)</span>
                        </Label>
                        <Input
                          id="precio_base"
                          name="precio_base"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="70.00"
                          defaultValue={editingTarifa?.precio_base}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="precio_minimo">
                          Precio Mínimo
                          <span className="text-xs text-muted-foreground ml-1">(negociable)</span>
                        </Label>
                        <Input
                          id="precio_minimo"
                          name="precio_minimo"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="50.00"
                          defaultValue={editingTarifa?.precio_minimo}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fecha_inicio">Desde (opcional)</Label>
                        <Input
                          id="fecha_inicio"
                          name="fecha_inicio"
                          type="date"
                          defaultValue={editingTarifa?.fecha_inicio || ''}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="fecha_fin">Hasta (opcional)</Label>
                        <Input
                          id="fecha_fin"
                          name="fecha_fin"
                          type="date"
                          defaultValue={editingTarifa?.fecha_fin || ''}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo / Categoría</TableHead>
                <TableHead>Nombre Tarifa</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>Precio Mínimo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay tarifas registradas
                  </TableCell>
                </TableRow>
              ) : (
                tarifas.map((tarifa) => (
                  <TableRow key={tarifa.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tarifa.tipos_habitacion?.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {tarifa.categorias_habitacion?.nombre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{tarifa.nombre_tarifa}</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(tarifa.precio_base)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrice(tarifa.precio_minimo)}
                    </TableCell>
                    <TableCell>
                      {tarifa.fecha_inicio || tarifa.fecha_fin ? (
                        <div className="text-xs">
                          {tarifa.fecha_inicio && (
                            <div>Desde: {new Date(tarifa.fecha_inicio).toLocaleDateString('es-PE')}</div>
                          )}
                          {tarifa.fecha_fin && (
                            <div>Hasta: {new Date(tarifa.fecha_fin).toLocaleDateString('es-PE')}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Indefinida</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tarifa.activa ? (
                        <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
                          ACTIVA
                        </Badge>
                      ) : (
                        <Badge variant="outline">INACTIVA</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tarifa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActiva(tarifa.id, tarifa.activa)}
                        >
                          {tarifa.activa ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la tarifa. No se eliminará del sistema por seguridad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
