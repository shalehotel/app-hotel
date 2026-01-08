'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Key, Power, PowerOff } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export type Usuario = {
  id: string
  nombres: string
  apellidos: string | null
  rol: 'ADMIN' | 'RECEPCION' | 'HOUSEKEEPING'
  estado: boolean
  created_at: string
  email: string | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCION: 'Recepción',
  HOUSEKEEPING: 'Housekeeping',
}

export const usuariosColumns: ColumnDef<Usuario>[] = [
  {
    id: 'nombre_completo',
    accessorFn: (row) => `${row.nombres} ${row.apellidos || ''}`,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      const usuario = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {usuario.nombres} {usuario.apellidos}
          </span>
          {usuario.email && (
            <span className="text-xs text-muted-foreground">{usuario.email}</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'rol',
    header: 'Rol',
    cell: ({ row }) => {
      const rol = row.getValue('rol') as string
      const variant =
        rol === 'ADMIN'
          ? 'default'
          : rol === 'RECEPCION'
            ? 'secondary'
            : 'outline'

      return <Badge variant={variant}>{ROLE_LABELS[rol] || rol}</Badge>
    },
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as boolean
      return (
        <Badge variant={estado ? 'default' : 'destructive'}>
          {estado ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado" />
    ),
    cell: ({ row }) => {
      const fecha = new Date(row.getValue('created_at'))
      return (
        <span className="text-sm text-muted-foreground">
          {format(fecha, 'dd MMM yyyy', { locale: es })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const usuario = row.original
      const meta = table.options.meta as any

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => meta?.onEdit?.(usuario)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meta?.onResetPassword?.(usuario.id)}>
              <Key className="mr-2 h-4 w-4" />
              Resetear Contraseña
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.onToggleEstado?.(usuario.id, usuario.estado)}
            >
              {usuario.estado ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Activar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => meta?.onDelete?.(usuario.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
