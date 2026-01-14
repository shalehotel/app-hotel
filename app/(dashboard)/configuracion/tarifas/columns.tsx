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
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/tables/data-table-column-header'
import type { Tarifa } from '@/lib/actions/tarifas'

// Re-exportar para otros componentes
export type { Tarifa }

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(price)
}

export const tarifasColumns: ColumnDef<Tarifa>[] = [
  {
    id: 'tipo',
    accessorFn: (row) => row.tipos_habitacion?.nombre,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const tipo = row.original.tipos_habitacion?.nombre
      return <span className="font-medium">{tipo}</span>
    },
  },
  {
    id: 'categoria',
    accessorFn: (row) => row.categorias_habitacion?.nombre,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoría" />
    ),
    cell: ({ row }) => {
      const categoria = row.original.categorias_habitacion?.nombre
      return <span className="font-medium">{categoria}</span>
    },
  },
  {
    accessorKey: 'precio_base',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio Base" />
    ),
    cell: ({ row }) => {
      const precio = row.getValue('precio_base') as number
      return <span className="font-medium">{formatPrice(precio)}</span>
    },
  },
  {
    accessorKey: 'precio_minimo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio Mínimo" />
    ),
    cell: ({ row }) => {
      const precio = row.getValue('precio_minimo') as number
      return (
        <span className="text-sm text-muted-foreground">
          {formatPrice(precio)}
        </span>
      )
    },
  },
  {
    accessorKey: 'activa',
    header: 'Estado',
    cell: ({ row }) => {
      const activa = row.getValue('activa') as boolean
      return (
        <Badge variant={activa ? 'default' : 'secondary'}>
          {activa ? 'Activa' : 'Inactiva'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const tarifa = row.original
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
            <DropdownMenuItem onClick={() => meta?.onEdit?.(tarifa)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.onToggleActiva?.(tarifa.id, tarifa.activa)}
            >
              {tarifa.activa ? (
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
              onClick={() => meta?.onDelete?.(tarifa.id)}
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
