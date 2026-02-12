'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus } from 'lucide-react'
import {
  createTarifa,
  updateTarifa,
  toggleTarifaActiva,
  deleteTarifa,
} from '@/lib/actions/tarifas'
import { toast } from 'sonner'
import { DataTable } from '@/components/tables/data-table'
import { tarifasColumns, type Tarifa } from './columns'

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

export function TarifasClientNew({ tarifas, tipos, categorias }: Props) {
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
      setSelectedTarifaId(null)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openDeleteDialog = (tarifaId: string) => {
    setSelectedTarifaId(tarifaId)
    setDeleteDialogOpen(true)
  }

  const editingTarifa = editingId ? tarifas.find((t) => t.id === editingId) : null

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Tarifas ({tarifas.length})</h3>
          <p className="text-sm text-muted-foreground">
            Define precios base y mínimos negociables
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) setEditingId(null)
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tarifa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar' : 'Nueva'} Tarifa
              </DialogTitle>
              <DialogDescription>
                Define el precio para un tipo y categoría de habitación
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tipo_habitacion_id">Tipo *</Label>
                  <Select
                    name="tipo_habitacion_id"
                    defaultValue={editingTarifa?.tipo_habitacion_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria_habitacion_id">Categoría *</Label>
                  <Select
                    name="categoria_habitacion_id"
                    defaultValue={editingTarifa?.categoria_habitacion_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nombre_tarifa">Nombre de Tarifa *</Label>
                  <Input
                    id="nombre_tarifa"
                    name="nombre_tarifa"
                    placeholder="Ej: Tarifa Base, Temporada Alta..."
                    defaultValue={editingTarifa?.nombre_tarifa}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="precio_base">Precio Base (S/) *</Label>
                  <Input
                    id="precio_base"
                    name="precio_base"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    defaultValue={editingTarifa?.precio_base}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Precio regular de venta
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="precio_minimo">Precio Mínimo (S/) *</Label>
                  <Input
                    id="precio_minimo"
                    name="precio_minimo"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="80.00"
                    defaultValue={editingTarifa?.precio_minimo}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Precio mínimo negociable
                  </p>
                </div>

                {editingId && (
                  <div className="grid gap-2">
                    <Label htmlFor="activa">Estado</Label>
                    <Select
                      name="activa"
                      defaultValue={editingTarifa?.activa ? 'true' : 'false'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activa</SelectItem>
                        <SelectItem value="false">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={tarifasColumns}
        data={tarifas}
        searchKey="tipo"
        searchPlaceholder="Buscar por tipo o categoría..."
        meta={{
          onEdit: handleEdit,
          onToggleActiva: handleToggleActiva,
          onDelete: openDeleteDialog,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarifa será eliminada
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
