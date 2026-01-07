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
import { Plus, Pencil, Trash2, Bed } from 'lucide-react'
import { 
  createHabitacion, 
  updateHabitacion, 
  deleteHabitacion,
  updateEstadoHabitacion
} from '@/lib/actions/configuracion-habitaciones'
import { toast } from 'sonner'

type Habitacion = {
  id: string
  numero: string
  piso: string
  tipo_id: string
  categoria_id: string
  estado_ocupacion: string
  estado_limpieza: string
  estado_servicio: string
  tipos_habitacion: { id: string; nombre: string; capacidad_personas: number } | null
  categorias_habitacion: { id: string; nombre: string } | null
}

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

export function HabitacionesTab({ habitaciones, tipos, categorias }: Props) {
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

  const getEstadoBadge = (estado: string, tipo: 'ocupacion' | 'limpieza' | 'servicio') => {
    if (tipo === 'ocupacion') {
      if (estado === 'LIBRE') return <Badge variant="outline">LIBRE</Badge>
      if (estado === 'OCUPADA') return <Badge variant="destructive">OCUPADA</Badge>
    }
    if (tipo === 'limpieza') {
      if (estado === 'LIMPIA') return (
        <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
          LIMPIA
        </Badge>
      )
      if (estado === 'SUCIA') return <Badge variant="destructive">SUCIA</Badge>
      if (estado === 'EN_LIMPIEZA') return <Badge variant="secondary">EN LIMPIEZA</Badge>
    }
    if (tipo === 'servicio') {
      if (estado === 'OPERATIVA') return <Badge variant="outline">OPERATIVA</Badge>
      if (estado === 'MANTENIMIENTO') return <Badge variant="secondary">MANTENIMIENTO</Badge>
      if (estado === 'FUERA_SERVICIO') return <Badge variant="destructive">FUERA DE SERVICIO</Badge>
    }
    return <Badge>{estado}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Habitaciones ({habitaciones.length})</CardTitle>
            <CardDescription>Gestiona el inventario físico de habitaciones</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) setEditingId(null)
          }}>
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
                      defaultValue={editingId ? habitaciones.find(h => h.id === editingId)?.numero : ''}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="piso">Piso *</Label>
                    <Input
                      id="piso"
                      name="piso"
                      placeholder="2"
                      defaultValue={editingId ? habitaciones.find(h => h.id === editingId)?.piso : ''}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tipo_id">Tipo *</Label>
                    <Select 
                      name="tipo_id" 
                      defaultValue={editingId ? habitaciones.find(h => h.id === editingId)?.tipo_id : ''}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map(tipo => (
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
                      defaultValue={editingId ? habitaciones.find(h => h.id === editingId)?.categoria_id : ''}
                      required
                    >
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
                <TableHead>Número</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ocupación</TableHead>
                <TableHead>Limpieza</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habitaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Bed className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay habitaciones registradas</p>
                    <p className="text-sm">Crea tu primera habitación</p>
                  </TableCell>
                </TableRow>
              ) : (
                habitaciones.map((hab) => (
                  <TableRow key={hab.id}>
                    <TableCell className="font-medium">{hab.numero}</TableCell>
                    <TableCell>{hab.piso}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{hab.tipos_habitacion?.nombre}</div>
                        <div className="text-muted-foreground text-xs">
                          {hab.tipos_habitacion?.capacidad_personas} personas
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{hab.categorias_habitacion?.nombre}</TableCell>
                    <TableCell>{getEstadoBadge(hab.estado_ocupacion, 'ocupacion')}</TableCell>
                    <TableCell>{getEstadoBadge(hab.estado_limpieza, 'limpieza')}</TableCell>
                    <TableCell>{getEstadoBadge(hab.estado_servicio, 'servicio')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(hab)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(hab.id)}
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
