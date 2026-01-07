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
import { Plus, Pencil, Trash2, Users, Key, Power, PowerOff } from 'lucide-react'
import { 
  createUsuario, 
  updateUsuario, 
  deleteUsuario,
  resetPasswordUsuario,
  toggleEstadoUsuario
} from '@/lib/actions/usuarios'
import { ROLES_DISPONIBLES } from '@/lib/constants/roles'
import { toast } from 'sonner'

type Usuario = {
  id: string
  nombres: string
  apellidos: string | null
  rol: 'ADMIN' | 'RECEPCION' | 'HOUSEKEEPING'
  estado: boolean
  created_at: string
  email: string | null
}

type Props = {
  usuarios: Usuario[]
}

export function UsuariosClient({ usuarios }: Props) {
  const [open, setOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      if (editingId) {
        await updateUsuario(editingId, formData)
        toast.success('Usuario actualizado correctamente')
      } else {
        await createUsuario(formData)
        toast.success('Usuario creado correctamente')
      }
      
      setOpen(false)
      setEditingId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedUserId) return
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const password = formData.get('password') as string
      
      await resetPasswordUsuario(selectedUserId, password)
      toast.success('Contraseña reseteada correctamente')
      setPasswordDialogOpen(false)
      setSelectedUserId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al resetear contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUserId) return
    setLoading(true)
    
    try {
      await deleteUsuario(selectedUserId)
      toast.success('Usuario eliminado correctamente')
      setDeleteDialogOpen(false)
      setSelectedUserId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEstado = async (id: string, estadoActual: boolean) => {
    try {
      await toggleEstadoUsuario(id, !estadoActual)
      toast.success(`Usuario ${!estadoActual ? 'activado' : 'desactivado'} correctamente`)
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id)
    setOpen(true)
  }

  const getRolBadge = (rol: string) => {
    if (rol === 'ADMIN') return <Badge>ADMIN</Badge>
    if (rol === 'RECEPCION') return (
      <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
        RECEPCIÓN
      </Badge>
    )
    if (rol === 'HOUSEKEEPING') return <Badge variant="secondary">LIMPIEZA</Badge>
    return <Badge variant="secondary">{rol}</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios ({usuarios.length})</CardTitle>
              <CardDescription>Gestiona los usuarios y sus roles de acceso</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen)
              if (!isOpen) setEditingId(null)
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Editar' : 'Nuevo'} Usuario
                  </DialogTitle>
                  <DialogDescription>
                    {editingId 
                      ? 'Modifica los datos del usuario'
                      : 'Crea un nuevo usuario para el sistema'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    {!editingId && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="usuario@hotel.com"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="password">Contraseña *</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                            required
                          />
                        </div>
                      </>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="nombres">Nombres *</Label>
                      <Input
                        id="nombres"
                        name="nombres"
                        placeholder="Juan Carlos"
                        defaultValue={editingId ? usuarios.find(u => u.id === editingId)?.nombres : ''}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="apellidos">Apellidos</Label>
                      <Input
                        id="apellidos"
                        name="apellidos"
                        placeholder="Pérez López"
                        defaultValue={editingId ? usuarios.find(u => u.id === editingId)?.apellidos || '' : ''}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="rol">Rol *</Label>
                      <Select 
                        name="rol" 
                        defaultValue={editingId ? usuarios.find(u => u.id === editingId)?.rol : ''}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES_DISPONIBLES.map(rol => (
                            <SelectItem key={rol.value} value={rol.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{rol.label}</span>
                                <span className="text-xs text-muted-foreground">{rol.descripcion}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {editingId && (
                      <div className="grid gap-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Select 
                          name="estado" 
                          defaultValue={usuarios.find(u => u.id === editingId)?.estado ? 'true' : 'false'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Activo</SelectItem>
                            <SelectItem value="false">Inactivo</SelectItem>
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
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay usuarios registrados</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {usuario.nombres} {usuario.apellidos}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-mono">
                          {usuario.email || 'Sin email'}
                        </span>
                      </TableCell>
                      <TableCell>{getRolBadge(usuario.rol)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleEstado(usuario.id, usuario.estado)}
                          className="gap-2"
                        >
                          {usuario.estado ? (
                            <>
                              <Power className="h-4 w-4 text-green-500" />
                              <span className="text-green-500">Activo</span>
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-4 w-4 text-red-500" />
                              <span className="text-red-500">Inactivo</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(usuario.created_at).toLocaleDateString('es-PE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(usuario)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUserId(usuario.id)
                              setPasswordDialogOpen(true)
                            }}
                            title="Resetear contraseña"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUserId(usuario.id)
                              setDeleteDialogOpen(true)
                            }}
                            title="Eliminar"
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

      {/* Dialog para resetear contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa la nueva contraseña para el usuario
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nueva Contraseña *</Label>
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Resetear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente
              del sistema y de la autenticación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
