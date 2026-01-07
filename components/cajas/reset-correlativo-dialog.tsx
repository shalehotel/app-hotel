'use client'

import { useState } from 'react'
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
import { resetCorrelativo, type Serie } from '@/lib/actions/series'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serie: Serie | null
  onSuccess: () => void
}

type FormData = {
  nuevoCorrelativo: number
}

export function ResetCorrelativoDialog({ open, onOpenChange, serie, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      nuevoCorrelativo: 0
    }
  })

  const onSubmit = async (data: FormData) => {
    if (!serie) return

    setLoading(true)

    try {
      const result = await resetCorrelativo(serie.id, data.nuevoCorrelativo)

      if (result.success) {
        toast.success('Correlativo reseteado', {
          description: `El correlativo de "${serie.serie}" ahora es ${data.nuevoCorrelativo}`
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Resetear Correlativo
          </DialogTitle>
          <DialogDescription>
            Serie: <strong>{serie?.serie}</strong>
            <br />
            Correlativo actual: <strong>{serie?.correlativo_actual}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              ⚠️ <strong>Advertencia:</strong> Solo resetea el correlativo en casos excepcionales como:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Error en la configuración inicial</li>
                <li>Migración de sistema</li>
                <li>Autorización de SUNAT</li>
              </ul>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nuevoCorrelativo">
              Nuevo Correlativo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nuevoCorrelativo"
              type="number"
              min="0"
              step="1"
              placeholder="Ej: 0"
              {...register('nuevoCorrelativo', {
                required: 'El correlativo es obligatorio',
                min: {
                  value: 0,
                  message: 'Debe ser mayor o igual a 0'
                },
                valueAsNumber: true
              })}
              disabled={loading}
            />
            {errors.nuevoCorrelativo && (
              <p className="text-sm text-red-500">{errors.nuevoCorrelativo.message}</p>
            )}
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
            <Button type="submit" disabled={loading} variant="destructive">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resetear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
