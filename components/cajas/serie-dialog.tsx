'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSerie, updateSerie, type Serie, type TipoComprobante } from '@/lib/actions/series'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serie: Serie | null
  cajaId: string
  onSuccess: () => void
}

type FormData = {
  tipo_comprobante: TipoComprobante
  serie: string
}

const TIPOS: { value: TipoComprobante; label: string; ejemplo: string }[] = [
  { value: 'BOLETA', label: 'Boleta', ejemplo: 'B001' },
  { value: 'FACTURA', label: 'Factura', ejemplo: 'F001' },
  { value: 'NOTA_CREDITO', label: 'Nota de Crédito', ejemplo: 'NC01' },
  { value: 'TICKET_INTERNO', label: 'Ticket Interno', ejemplo: 'T001' }
]

export function SerieDialog({ open, onOpenChange, serie, cajaId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoComprobante>('BOLETA')
  const isEdit = !!serie

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    defaultValues: {
      tipo_comprobante: 'BOLETA',
      serie: ''
    }
  })

  useEffect(() => {
    if (serie) {
      reset({
        tipo_comprobante: serie.tipo_comprobante,
        serie: serie.serie
      })
      setTipoSeleccionado(serie.tipo_comprobante)
    } else {
      reset({
        tipo_comprobante: 'BOLETA',
        serie: ''
      })
      setTipoSeleccionado('BOLETA')
    }
  }, [serie, reset, open])

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      let result

      if (isEdit) {
        result = await updateSerie(serie.id, {
          serie: data.serie
        })
      } else {
        result = await createSerie({
          caja_id: cajaId,
          tipo_comprobante: data.tipo_comprobante,
          serie: data.serie,
          correlativo_actual: 0
        })
      }

      if (result.success) {
        toast.success(isEdit ? 'Serie actualizada' : 'Serie creada', {
          description: `La serie "${data.serie}" fue ${isEdit ? 'actualizada' : 'creada'} correctamente`
        })
        onSuccess()
      } else {
        toast.error('Error', {
          description: result.error
        })
      }
    } catch (error: any) {
      toast.error('Error inesperado', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const tipoActual = TIPOS.find(t => t.value === tipoSeleccionado)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Serie' : 'Nueva Serie'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Modifica el código de la serie'
              : 'Crea una nueva serie de comprobantes'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo_comprobante">
              Tipo de Comprobante <span className="text-red-500">*</span>
            </Label>
            <Select
              value={tipoSeleccionado}
              onValueChange={(value) => {
                setTipoSeleccionado(value as TipoComprobante)
                setValue('tipo_comprobante', value as TipoComprobante)
              }}
              disabled={loading || isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                No se puede cambiar el tipo de una serie existente
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serie">
              Código de Serie <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serie"
              placeholder={`Ej: ${tipoActual?.ejemplo}`}
              {...register('serie', {
                required: 'El código es obligatorio',
                minLength: {
                  value: 2,
                  message: 'Mínimo 2 caracteres'
                }
              })}
              disabled={loading}
              className="font-mono uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
              }}
            />
            {errors.serie && (
              <p className="text-sm text-red-500">{errors.serie.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Formato sugerido: {tipoActual?.ejemplo} (Boletas: B###, Facturas: F###, NC: NC##)
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
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
