"use client"

import { ColumnDef } from "@tanstack/react-table"
import { OcupacionReserva } from "@/lib/actions/ocupaciones"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { Eye, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const estadoBadgeVariant = {
  RESERVADA: "secondary" as const,
  CHECKED_IN: "default" as const,
  CHECKED_OUT: "outline" as const,
  CANCELADA: "destructive" as const,
  NO_SHOW: "destructive" as const,
}

const estadoLabel = {
  RESERVADA: "Reservada",
  CHECKED_IN: "Check-in",
  CHECKED_OUT: "Check-out",
  CANCELADA: "Cancelada",
  NO_SHOW: "No Show",
}

export const columns: ColumnDef<OcupacionReserva>[] = [
  {
    accessorKey: "habitacion_numero",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Habitación" />
    ),
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.original.habitacion_numero}
        </div>
      )
    },
  },
  {
    accessorKey: "titular_nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Huésped" />
    ),
    cell: ({ row }) => {
      return (
        <div>
          <div className="font-medium">{row.original.titular_nombre}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.titular_tipo_doc} {row.original.titular_numero_doc}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.original.estado
      return (
        <Badge variant={estadoBadgeVariant[estado]}>
          {estadoLabel[estado]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "fecha_entrada",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Entrada" />
    ),
    cell: ({ row }) => {
      return format(new Date(row.original.fecha_entrada), "dd MMM yyyy", {
        locale: es,
      })
    },
  },
  {
    accessorKey: "fecha_salida",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Salida" />
    ),
    cell: ({ row }) => {
      return format(new Date(row.original.fecha_salida), "dd MMM yyyy", {
        locale: es,
      })
    },
  },
  {
    accessorKey: "total_estimado",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const amount = row.original.total_estimado
      const formatted = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "saldo_pendiente",
    header: () => <div className="text-right">Saldo</div>,
    cell: ({ row }) => {
      const amount = row.original.saldo_pendiente
      const formatted = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
      }).format(amount)
      const isDebt = amount > 0
      return (
        <div
          className={`text-right font-semibold ${isDebt ? "text-destructive" : "text-muted-foreground"
            }`}
        >
          {formatted}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const ocupacion = row.original
      // Access custom meta from table
      const meta = table.options.meta as any

      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              meta?.onVerDetalle?.(ocupacion.id)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {ocupacion.saldo_pendiente > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                meta?.onCobrar?.(ocupacion)
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Cobrar
            </Button>
          )}
        </div>
      )
    },
  },
]
