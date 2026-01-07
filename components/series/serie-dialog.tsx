'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSerie, updateSerie } from '@/lib/actions/series'
import { getCajas } from '@/lib/actions/cajas'
import type { Database } from '@/types/database.types'

type Serie = Database['public']['Tables']['series_comprobante']['Row']
type Caja = Database['public']['Tables']['cajas']['Row']

interface SerieDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serie?: Serie
  onSuccess: () => void
}

interface FormData {
  serie: string
  tipo_comprobante: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'TICKET_INTERNO'
  caja_id?: string
  correlativo_actual: number
}

export function SerieDialog({ open, onOpenChange, serie, onSuccess }: SerieDialogProps) {
  const [loading, setLoading] = useState(false)
  const [cajas, setCajas] = useState<Caja[]>([])
  const isEdit = !!serie

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      serie: '',
      tipo_comprobante: 'BOLETA',
      correlativo_actual: 0,
    },
  })

  const selectedTipo = watch('tipo_comprobante')

  useEffect(() => {
    const loadCajas = async () => {
      const result = await getCajas()
      if (result.success && result.data) {
        setCajas(result.data)
      }
    }
    loadCajas()
  }, [])

  useEffect(() => {
    if (serie) {
      reset({
        serie: serie.serie,
        tipo_comprobante: serie.tipo_comprobante as FormData['tipo_comprobante'],
        caja_id: serie.caja_id || undefined,
        correlativo_actual: Number(serie.correlativo_actual),
      })
    } else {
      reset({
        serie: '',
        tipo_comprobante: 'BOLETA',
        correlativo_actual: 0,
      })
    }
  }, [serie, reset])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const result = isEdit
        ? await updateSerie(serie!.id, data)
        : await createSerie(data)

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Error al guardar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar' : 'Nueva'} Serie</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la serie de comprobantes.'
              : 'Crea una nueva serie para emitir comprobantes.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serie">
              Serie <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serie"
              placeholder="B001, F001, etc."
              {...register('serie', {
                required: 'La serie es obligatoria',
                pattern: {
                  value: /^[A-Z0-9]{4}$/,
                  message: 'Debe tener 4 caracteres alfanuméricos',
                },
              })}
              disabled={isEdit}
            />
            {errors.serie && (
              <p className="text-sm text-red-500">{errors.serie.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ejemplo: B001 (Boleta), F001 (Factura)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo de Comprobante <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedTipo}
              onValueChange={(value) =>
                setValue('tipo_comprobante', value as FormData['tipo_comprobante'])
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOLETA">Boleta</SelectItem>
                <SelectItem value="FACTURA">Factura</SelectItem>
                <SelectItem value="NOTA_CREDITO">Nota de Crédito</SelectItem>
                <SelectItem value="TICKET_INTERNO">Ticket Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caja">Caja Asignada (Opcional)</Label>
            <Select
              value={watch('caja_id') || 'none'}
              onValueChange={(value) => setValue('caja_id', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {cajas
                  .filter((c) => c.estado)
                  .map((caja) => (
                    <SelectItem key={caja.id} value={caja.id}>
                      {caja.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correlativo">Correlativo Actual</Label>
            <Input
              id="correlativo"
              type="number"
              min="0"
              {...register('correlativo_actual', {
                valueAsNumber: true,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Solo modificar si necesitas ajustar el número actual.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
