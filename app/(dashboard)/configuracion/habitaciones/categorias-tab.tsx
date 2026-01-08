'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import {
  createCategoriaHabitacion,
  updateCategoriaHabitacion,
  deleteCategoriaHabitacion,
} from '@/lib/actions/configuracion-habitaciones'
import { toast } from 'sonner'
import { DataTable } from '@/components/tables/data-table'
import { categoriasColumns, type Categoria } from './categorias-columns'

type Props = {
  categorias: Categoria[]
}

export function CategoriasTabNew({ categorias }: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      if (editingId) {
        await updateCategoriaHabitacion(editingId, formData)
        toast.success('Categoría actualizada correctamente')
      } else {
        await createCategoriaHabitacion(formData)
        toast.success('Categoría creada correctamente')
      }

      setOpen(false)
      setEditingId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar categoría')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de eliminar esta categoría? Solo si no está siendo usada.'
      )
    )
      return

    try {
      await deleteCategoriaHabitacion(id)
      toast.success('Categoría eliminada correctamente')
    } catch (error: any) {
      toast.error(
        error.message ||
          'Error al eliminar. Puede estar siendo usada por habitaciones.'
      )
    }
  }

  const handleEdit = (categoria: Categoria) => {
    setEditingId(categoria.id)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Categorías de Habitación ({categorias.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Define la calidad o nivel de servicio (Estándar, Superior, Suite, etc.)
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
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar' : 'Nueva'} Categoría de Habitación
              </DialogTitle>
              <DialogDescription>
                Las categorías definen el nivel de calidad/precio
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    placeholder="Estándar, Superior, Suite..."
                    defaultValue={
                      editingId
                        ? categorias.find((c) => c.id === editingId)?.nombre
                        : ''
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    name="descripcion"
                    placeholder="Describe las características de esta categoría..."
                    rows={3}
                    defaultValue={
                      editingId
                        ? categorias.find((c) => c.id === editingId)
                            ?.descripcion || ''
                        : ''
                    }
                  />
                </div>
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
        columns={categoriasColumns}
        data={categorias}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        meta={{
          onEdit: handleEdit,
          onDelete: handleDelete,
        }}
      />
    </div>
  )
}
