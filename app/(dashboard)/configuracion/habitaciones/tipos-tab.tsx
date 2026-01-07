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
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { 
  createTipoHabitacion, 
  updateTipoHabitacion, 
  deleteTipoHabitacion 
} from '@/lib/actions/configuracion-habitaciones'
import { toast } from 'sonner'

type Tipo = {
  id: string
  nombre: string
  capacidad_personas: number
}

type Props = {
  tipos: Tipo[]
}

export function TiposTab({ tipos }: Props) {
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
    if (!confirm('¿Estás seguro de eliminar este tipo? Solo si no está siendo usado.')) return
    
    try {
      await deleteTipoHabitacion(id)
      toast.success('Tipo eliminado correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar. Puede estar siendo usado por habitaciones.')
    }
  }

  const handleEdit = (tipo: Tipo) => {
    setEditingId(tipo.id)
    setOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tipos de Habitación ({tipos.length})</CardTitle>
            <CardDescription>
              Define los tipos según capacidad (Simple, Doble, Triple, etc.)
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) setEditingId(null)
          }}>
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
                      defaultValue={editingId ? tipos.find(t => t.id === editingId)?.nombre : ''}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="capacidad_personas">Capacidad de Personas *</Label>
                    <Input
                      id="capacidad_personas"
                      name="capacidad_personas"
                      type="number"
                      min="1"
                      placeholder="2"
                      defaultValue={editingId ? tipos.find(t => t.id === editingId)?.capacidad_personas : ''}
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
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay tipos registrados</p>
                    <p className="text-sm">Crea tu primer tipo de habitación</p>
                  </TableCell>
                </TableRow>
              ) : (
                tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {tipo.capacidad_personas} personas
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tipo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tipo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
