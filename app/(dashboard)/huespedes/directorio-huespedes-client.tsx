"use client"

import { useState } from "react"
import { DirectorioHuesped } from "@/lib/actions/huespedes"
import { DataTable } from '@/components/tables/data-table'
import { columns } from "./columns"
import { HuespedDetailSheet } from "@/components/huespedes/huesped-detail-sheet"
import { Button } from "@/components/ui/button"
import { Star, AlertCircle } from "lucide-react"

type Props = {
  huespedes: DirectorioHuesped[]
}

export function DirectorioHuespedesClient({ huespedes }: Props) {
  const [huespedSeleccionado, setHuespedSeleccionado] = useState<string | null>(null)
  const [filtroVIP, setFiltroVIP] = useState(false)
  const [filtroAlertas, setFiltroAlertas] = useState(false)

  // Filtrado
  const huespedesFiltrados = huespedes.filter(h => {
    if (filtroVIP && !h.es_frecuente) return false
    if (filtroAlertas && !h.notas_internas) return false
    return true
  })

  return (
    <>
      <div className="space-y-4">
        {/* Filtros rápidos */}
        <div className="flex items-center gap-2">
          <Button
            variant={filtroVIP ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroVIP(!filtroVIP)}
          >
            <Star className="mr-2 h-4 w-4" />
            Solo VIP
          </Button>
          <Button
            variant={filtroAlertas ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroAlertas(!filtroAlertas)}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Con Alertas
          </Button>
          {(filtroVIP || filtroAlertas) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroVIP(false)
                setFiltroAlertas(false)
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={huespedesFiltrados}
          searchKey="nombres"
          searchPlaceholder="Buscar por nombre o documento..."
          meta={{
            onVerDetalle: setHuespedSeleccionado,
          }}
        />
      </div>

      {huespedSeleccionado && (
        <HuespedDetailSheet
          huespedId={huespedSeleccionado}
          open={!!huespedSeleccionado}
          onClose={() => setHuespedSeleccionado(null)}
        />
      )}
    </>
  )
}
