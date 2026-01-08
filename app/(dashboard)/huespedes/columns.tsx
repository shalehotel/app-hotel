"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DirectorioHuesped } from "@/lib/actions/huespedes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { Star, AlertCircle, Eye, Mail, Phone } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const columns: ColumnDef<DirectorioHuesped>[] = [
  {
    accessorKey: "nombres",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre Completo" />
    ),
    cell: ({ row }) => {
      const huesped = row.original
      return (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {huesped.nombres} {huesped.apellidos}
            </span>
            {huesped.es_frecuente && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
            {huesped.notas_internas && (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {huesped.tipo_documento} {huesped.numero_documento}
          </div>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const huesped = row.original
      const searchLower = value.toLowerCase()
      return (
        huesped.nombres.toLowerCase().includes(searchLower) ||
        huesped.apellidos.toLowerCase().includes(searchLower) ||
        huesped.numero_documento.includes(value)
      )
    },
  },
  {
    accessorKey: "nacionalidad",
    header: "Nacionalidad",
    cell: ({ row }) => {
      return row.original.nacionalidad || (
        <span className="text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: "telefono",
    header: "Contacto",
    cell: ({ row }) => {
      const { telefono, correo } = row.original
      return (
        <div className="space-y-1">
          {telefono && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {telefono}
            </div>
          )}
          {correo && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {correo}
            </div>
          )}
          {!telefono && !correo && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "total_visitas",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Visitas" />
      </div>
    ),
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.total_visitas}
        </div>
      )
    },
  },
  {
    accessorKey: "ultima_visita",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Última Visita" />
    ),
    cell: ({ row }) => {
      const fecha = row.original.ultima_visita
      if (!fecha) return <span className="text-muted-foreground">Nunca</span>
      
      return (
        <div className="text-sm">
          {format(new Date(fecha), "dd MMM yyyy", { locale: es })}
        </div>
      )
    },
  },
  {
    accessorKey: "es_frecuente",
    header: "Estado",
    cell: ({ row }) => {
      const huesped = row.original
      return (
        <div className="flex flex-col gap-1">
          {huesped.es_frecuente && (
            <Badge variant="secondary" className="w-fit bg-blue-500 text-white dark:bg-blue-600">
              VIP
            </Badge>
          )}
          {huesped.notas_internas && (
            <Badge variant="destructive" className="w-fit">
              Alerta
            </Badge>
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      if (value === "vip") return row.original.es_frecuente
      if (value === "alert") return !!row.original.notas_internas
      return true
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const huesped = row.original
      const meta = table.options.meta as any

      return (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              meta?.onVerDetalle?.(huesped.id)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]
