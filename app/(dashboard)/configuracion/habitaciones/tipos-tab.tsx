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
import { Plus } from 'lucide-react'
import {
  createTipoHabitacion,
  updateTipoHabitacion,
  deleteTipoHabitacion,
} from '@/lib/actions/configuracion-habitaciones'
import { toast } from 'sonner'
import { DataTable } from '@/components/tables/data-table'
import { tiposColumns, type Tipo } from './tipos-columns'

type Props = {
  tipos: Tipo[]
}

export function TiposTabNew({ tipos }: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      if (editingId) {
        await updateTipoHabitacion(editingId, formData)
        toast.success('Tipo actualizado correctamente')
      } else {
        await createTipoHabitacion(formData)
        toast.success('Tipo creado correctamente')
      }

      setOpen(false)
      setEditingId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar tipo')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de eliminar este tipo? Solo si no está siendo usado.'
      )
    )
      return

    try {
      await deleteTipoHabitacion(id)
      toast.success('Tipo eliminado correctamente')
    } catch (error: any) {
      toast.error(
        error.message ||
          'Error al eliminar. Puede estar siendo usado por habitaciones.'
      )
    }
  }

  const handleEdit = (tipo: Tipo) => {
    setEditingId(tipo.id)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Tipos de Habitación ({tipos.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Define los tipos según capacidad (Simple, Doble, Triple, etc.)
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
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar' : 'Nuevo'} Tipo de Habitación
              </DialogTitle>
              <DialogDescription>
                Los tipos definen la capacidad de personas
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    placeholder="Simple, Doble, Matrimonial..."
                    defaultValue={
                      editingId
                        ? tipos.find((t) => t.id === editingId)?.nombre
                        : ''
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="capacidad_personas">
                    Capacidad de Personas *
                  </Label>
                  <Input
                    id="capacidad_personas"
                    name="capacidad_personas"
                    type="number"
                    min="1"
                    placeholder="2"
                    defaultValue={
                      editingId
                        ? tipos.find((t) => t.id === editingId)
                            ?.capacidad_personas
                        : ''
                    }
                    required
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
        columns={tiposColumns}
        data={tipos}
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
