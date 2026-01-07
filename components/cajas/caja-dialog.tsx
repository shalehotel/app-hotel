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
import { Toggle } from '@/components/ui/toggle'
import { createCaja, updateCaja, type Caja } from '@/lib/actions/cajas'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja: Caja | null
  onSuccess: () => void
}

type FormData = {
  nombre: string
  estado: boolean
}

export function CajaDialog({ open, onOpenChange, caja, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!caja

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      nombre: '',
      estado: true
    }
  })

  const estado = watch('estado')

  useEffect(() => {
    if (caja) {
      reset({
        nombre: caja.nombre,
        estado: caja.estado
      })
    } else {
      reset({
        nombre: '',
        estado: true
      })
    }
  }, [caja, reset, open])

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      let result

      if (isEdit) {
        result = await updateCaja(caja.id, {
          nombre: data.nombre,
          estado: data.estado
        })
      } else {
        result = await createCaja({
          nombre: data.nombre
        })
      }

      if (result.success) {
        toast.success(isEdit ? 'Caja actualizada' : 'Caja creada', {
          description: `La caja "${data.nombre}" fue ${isEdit ? 'actualizada' : 'creada'} correctamente`
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
          <DialogTitle>
            {isEdit ? 'Editar Caja' : 'Nueva Caja'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Modifica los datos de la caja registradora'
              : 'Crea una nueva caja registradora para el hotel'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre de la Caja <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Caja Principal, Caja Recepción"
              {...register('nombre', {
                required: 'El nombre es obligatorio',
                minLength: {
                  value: 3,
                  message: 'Mínimo 3 caracteres'
                }
              })}
              disabled={loading}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center justify-between space-x-2 border rounded-lg p-4">
              <div className="space-y-0.5">
                <Label htmlFor="estado">Estado</Label>
                <p className="text-sm text-muted-foreground">
                  {estado ? 'Caja activa y disponible' : 'Caja inactiva'}
                </p>
              </div>
              <Toggle
                pressed={estado}
                onPressedChange={(pressed: boolean) => setValue('estado', pressed)}
                disabled={loading}
                aria-label="Cambiar estado de caja"
              >
                {estado ? 'Activa' : 'Inactiva'}
              </Toggle>
            </div>
          )}

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
