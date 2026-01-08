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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header'

export type Habitacion = {
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

export const habitacionesColumns: ColumnDef<Habitacion>[] = [
  {
    accessorKey: 'numero',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue('numero')}</div>,
  },
  {
    accessorKey: 'piso',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Piso" />
    ),
  },
  {
    id: 'tipo',
    accessorFn: (row) => row.tipos_habitacion?.nombre,
    header: 'Tipo',
    cell: ({ row }) => {
      const tipo = row.original.tipos_habitacion
      return (
        <div className="flex flex-col">
          <span className="font-medium">{tipo?.nombre}</span>
          <span className="text-xs text-muted-foreground">
            Cap: {tipo?.capacidad_personas} personas
          </span>
        </div>
      )
    },
  },
  {
    id: 'categoria',
    accessorFn: (row) => row.categorias_habitacion?.nombre,
    header: 'Categoría',
  },
  {
    accessorKey: 'estado_ocupacion',
    header: 'Ocupación',
    cell: ({ row }) => {
      const estado = row.getValue('estado_ocupacion') as string
      const variant =
        estado === 'DISPONIBLE'
          ? 'default'
          : estado === 'OCUPADA'
            ? 'destructive'
            : 'secondary'

      return <Badge variant={variant}>{estado}</Badge>
    },
  },
  {
    accessorKey: 'estado_limpieza',
    header: 'Limpieza',
    cell: ({ row }) => {
      const estado = row.getValue('estado_limpieza') as string
      const variant = estado === 'LIMPIA' ? 'default' : 'secondary'

      return <Badge variant={variant}>{estado}</Badge>
    },
  },
  {
    accessorKey: 'estado_servicio',
    header: 'Servicio',
    cell: ({ row }) => {
      const estado = row.getValue('estado_servicio') as string
      const variant = estado === 'OPERATIVA' ? 'default' : 'destructive'

      return <Badge variant={variant}>{estado}</Badge>
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const habitacion = row.original
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
            <DropdownMenuItem onClick={() => meta?.onEdit?.(habitacion)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => meta?.onDelete?.(habitacion.id)}
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
