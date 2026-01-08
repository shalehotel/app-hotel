'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SerieDialog } from '@/components/series/serie-dialog'
import { getSeries, type SerieWithCaja } from '@/lib/actions/series'

export function SeriesClient() {
  const [series, setSeries] = useState<SerieWithCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSerie, setSelectedSerie] = useState<SerieWithCaja | undefined>()

  const loadSeries = async () => {
    setLoading(true)
    const result = await getSeries()
    if (result.success && result.data) {
      setSeries(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSeries()
  }, [])

  const handleEdit = (serie: SerieWithCaja) => {
    setSelectedSerie(serie)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedSerie(undefined)
    loadSeries()
  }

  const tipoComprobanteLabels: Record<string, string> = {
    BOLETA: 'Boleta',
    FACTURA: 'Factura',
    NOTA_CREDITO: 'Nota de Crédito',
    NOTA_DEBITO: 'Nota de Débito',
  }

  if (loading) {
    return <div>Cargando series...</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {series.length} serie(s) registrada(s)
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Serie
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serie</TableHead>
              <TableHead>Tipo Comprobante</TableHead>
              <TableHead>Caja Asignada</TableHead>
              <TableHead>Correlativo Actual</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay series registradas. Crea una nueva para empezar.
                </TableCell>
              </TableRow>
            ) : (
              series.map((serie) => (
                <TableRow key={serie.id}>
                  <TableCell className="font-mono font-semibold">
                    {serie.serie}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoComprobanteLabels[serie.tipo_comprobante] || serie.tipo_comprobante}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {serie.cajas?.nombre || (
                      <span className="text-muted-foreground italic">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {(serie.correlativo_actual || 0).toString().padStart(8, '0')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(serie)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SerieDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serie={selectedSerie}
        onSuccess={handleDialogClose}
      />
    </>
  )
}
