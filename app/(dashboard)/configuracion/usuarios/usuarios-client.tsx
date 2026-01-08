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
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPasswordUsuario,
  toggleEstadoUsuario,
} from '@/lib/actions/usuarios'
import { ROLES_DISPONIBLES } from '@/lib/constants/roles'
import { toast } from 'sonner'
import { DataTable } from '@/components/tables/data-table'
import { usuariosColumns, type Usuario } from './columns'

type Props = {
  usuarios: Usuario[]
}

export function UsuariosClientNew({ usuarios }: Props) {
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
      toast.success(
        `Usuario ${!estadoActual ? 'activado' : 'desactivado'} correctamente`
      )
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id)
    setOpen(true)
  }

  const openPasswordDialog = (userId: string) => {
    setSelectedUserId(userId)
    setPasswordDialogOpen(true)
  }

  const openDeleteDialog = (userId: string) => {
    setSelectedUserId(userId)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Usuarios ({usuarios.length})</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los usuarios y sus roles de acceso
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
                  : 'Crea un nuevo usuario para el sistema'}
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
                    defaultValue={
                      editingId
                        ? usuarios.find((u) => u.id === editingId)?.nombres
                        : ''
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    name="apellidos"
                    placeholder="Pérez López"
                    defaultValue={
                      editingId
                        ? usuarios.find((u) => u.id === editingId)?.apellidos ||
                          ''
                        : ''
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select
                    name="rol"
                    defaultValue={
                      editingId
                        ? usuarios.find((u) => u.id === editingId)?.rol
                        : ''
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES_DISPONIBLES.map((rol) => (
                        <SelectItem key={rol.value} value={rol.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{rol.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {rol.descripcion}
                            </span>
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
                      defaultValue={
                        usuarios.find((u) => u.id === editingId)?.estado
                          ? 'true'
                          : 'false'
                      }
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

      <DataTable
        columns={usuariosColumns}
        data={usuarios}
        searchKey="nombre_completo"
        searchPlaceholder="Buscar por nombre..."
        meta={{
          onEdit: handleEdit,
          onResetPassword: openPasswordDialog,
          onToggleEstado: handleToggleEstado,
          onDelete: openDeleteDialog,
        }}
      />

      {/* Reset Password Dialog */}
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
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Reseteando...' : 'Resetear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado
              permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
