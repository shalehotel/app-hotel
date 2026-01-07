'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSeriesByCaja, type Serie } from '@/lib/actions/series'
import { SerieDialog } from '@/components/cajas/serie-dialog'
import { SerieDeleteAlert } from '@/components/cajas/serie-delete-alert'
import { ResetCorrelativoDialog } from '@/components/cajas/reset-correlativo-dialog'
import { toast } from 'sonner'

type Props = {
  cajaId: string
  cajaNombre: string
}

const TIPO_ICONS: Record<string, string> = {
  BOLETA: '📄',
  FACTURA: '🧾',
  NOTA_CREDITO: '❌',
  TICKET_INTERNO: '🎫'
}

const TIPO_LABELS: Record<string, string> = {
  BOLETA: 'Boletas',
  FACTURA: 'Facturas',
  NOTA_CREDITO: 'Notas de Crédito',
  TICKET_INTERNO: 'Tickets Internos'
}

export function SeriesClient({ cajaId, cajaNombre }: Props) {
  const [series, setSeries] = useState<Serie[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedSerie, setSelectedSerie] = useState<Serie | null>(null)

  const loadSeries = async () => {
    setLoading(true)
    const result = await getSeriesByCaja(cajaId)
    if (result.success) {
      setSeries(result.data)
    } else {
      toast.error('Error al cargar series', {
        description: result.error
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSeries()
  }, [cajaId])

  const handleNuevaSerie = () => {
    setSelectedSerie(null)
    setDialogOpen(true)
  }

  const handleEditarSerie = (serie: Serie) => {
    setSelectedSerie(serie)
    setDialogOpen(true)
  }

  const handleEliminarSerie = (serie: Serie) => {
    setSelectedSerie(serie)
    setDeleteAlertOpen(true)
  }

  const handleResetCorrelativo = (serie: Serie) => {
    setSelectedSerie(serie)
    setResetDialogOpen(true)
  }

  const handleSuccess = () => {
    loadSeries()
    setDialogOpen(false)
    setDeleteAlertOpen(false)
    setResetDialogOpen(false)
    setSelectedSerie(null)
  }

  // Agrupar series por tipo
  const seriesPorTipo = series.reduce((acc, serie) => {
    if (!acc[serie.tipo_comprobante]) {
      acc[serie.tipo_comprobante] = []
    }
    acc[serie.tipo_comprobante].push(serie)
    return acc
  }, {} as Record<string, Serie[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando series...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configura las series de comprobantes para esta caja
        </p>
        <Button onClick={handleNuevaSerie}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Serie
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(TIPO_LABELS).map(([tipo, label]) => {
          const seriesDelTipo = seriesPorTipo[tipo] || []

          return (
            <Card key={tipo}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{TIPO_ICONS[tipo]}</span>
                  {label}
                </CardTitle>
                <CardDescription>
                  {seriesDelTipo.length} serie(s) configurada(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {seriesDelTipo.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin series configuradas
                  </p>
                ) : (
                  seriesDelTipo.map((serie) => (
                    <div
                      key={serie.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-mono font-semibold">{serie.serie}</p>
                        <p className="text-xs text-muted-foreground">
                          Correlativo: <span className="font-medium">{serie.correlativo_actual}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarSerie(serie)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetCorrelativo(serie)}
                          title="Resetear correlativo"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarSerie(serie)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialogs */}
      <SerieDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serie={selectedSerie}
        cajaId={cajaId}
        onSuccess={handleSuccess}
      />

      <SerieDeleteAlert
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        serie={selectedSerie}
        onSuccess={handleSuccess}
      />

      <ResetCorrelativoDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        serie={selectedSerie}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
