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
import { Plus } from 'lucide-react'
import {
  createHabitacion,
  updateHabitacion,
  deleteHabitacion,
} from '@/lib/actions/configuracion-habitaciones'
import { toast } from 'sonner'
import { DataTable } from '@/components/tables/data-table'
import { habitacionesColumns, type Habitacion } from './habitaciones-columns'

type Tipo = {
  id: string
  nombre: string
  capacidad_personas: number
}

type Categoria = {
  id: string
  nombre: string
}

type Props = {
  habitaciones: Habitacion[]
  tipos: Tipo[]
  categorias: Categoria[]
}

export function HabitacionesTabNew({ habitaciones, tipos, categorias }: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      if (editingId) {
        await updateHabitacion(editingId, formData)
        toast.success('Habitación actualizada correctamente')
      } else {
        await createHabitacion(formData)
        toast.success('Habitación creada correctamente')
      }

      setOpen(false)
      setEditingId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar habitación')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta habitación?')) return

    try {
      await deleteHabitacion(id)
      toast.success('Habitación eliminada correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar habitación')
    }
  }

  const handleEdit = (habitacion: Habitacion) => {
    setEditingId(habitacion.id)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Habitaciones ({habitaciones.length})</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona el inventario físico de habitaciones
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
              Nueva Habitación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar' : 'Nueva'} Habitación
              </DialogTitle>
              <DialogDescription>
                Ingresa los datos de la habitación
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    name="numero"
                    placeholder="201"
                    defaultValue={
                      editingId
                        ? habitaciones.find((h) => h.id === editingId)?.numero
                        : ''
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="piso">Piso *</Label>
                  <Input
                    id="piso"
                    name="piso"
                    placeholder="2"
                    defaultValue={
                      editingId
                        ? habitaciones.find((h) => h.id === editingId)?.piso
                        : ''
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tipo_id">Tipo *</Label>
                  <Select
                    name="tipo_id"
                    defaultValue={
                      editingId
                        ? habitaciones.find((h) => h.id === editingId)?.tipo_id
                        : ''
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre} ({tipo.capacidad_personas} personas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Categoría *</Label>
                  <Select
                    name="categoria_id"
                    defaultValue={
                      editingId
                        ? habitaciones.find((h) => h.id === editingId)
                            ?.categoria_id
                        : ''
                    }
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
        columns={habitacionesColumns}
        data={habitaciones}
        searchKey="numero"
        searchPlaceholder="Buscar por número..."
        meta={{
          onEdit: handleEdit,
          onDelete: handleDelete,
        }}
      />
    </div>
  )
}
