'use client'

import { useState, useEffect } from 'react'
import { getHistorialComprobantes } from '@/lib/actions/comprobantes'
import { DataTable } from '@/components/tables/data-table'
import { comprobantesColumns, type Comprobante } from './columns'
import { ComprobanteDetailSheet } from '@/components/facturacion/comprobante-detail-sheet'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function FacturacionClient() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<Date>()
  const [filtroTipo, setFiltroTipo] = useState<'TODAS' | 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO'>('TODAS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ANULADO'>('TODOS')
  const [selectedComprobanteId, setSelectedComprobanteId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    cargarComprobantes()
  }, [filtroTipo, filtroEstado])

  async function cargarComprobantes() {
    try {
      setLoading(true)
      const data = await getHistorialComprobantes({
        tipo_comprobante: filtroTipo,
        estado_sunat: filtroEstado
      })
      setComprobantes(data as Comprobante[])
    } catch (error) {
      console.error('Error al cargar comprobantes:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleVerDetalle(comprobanteId: string) {
    setSelectedComprobanteId(comprobanteId)
    setSheetOpen(true)
  }

  function handleDescargarPDF(comprobanteId: string) {
    // TODO: Implementar descarga de PDF
    console.log('Descargar PDF:', comprobanteId)
  }

  function handleAnular(comprobanteId: string) {
    // TODO: Implementar anulación
    console.log('Anular comprobante:', comprobanteId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">Cargando comprobantes...</div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={comprobantesColumns}
        data={comprobantes}
        searchKey="numero_completo"
        searchPlaceholder="Buscar por comprobante, cliente..."
        meta={{
          onVerDetalle: handleVerDetalle,
          onDescargarPDF: handleDescargarPDF,
          onAnular: handleAnular,
        }}
        toolbar={
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[180px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy', { locale: es }) : 'Fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todos</SelectItem>
                <SelectItem value="BOLETA">Boletas</SelectItem>
                <SelectItem value="FACTURA">Facturas</SelectItem>
                <SelectItem value="NOTA_CREDITO">Notas Crédito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                <SelectItem value="ACEPTADO">Aceptados</SelectItem>
                <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                <SelectItem value="ANULADO">Anulados</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={cargarComprobantes}
              size="icon"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {selectedComprobanteId && (
        <ComprobanteDetailSheet
          comprobanteId={selectedComprobanteId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}
