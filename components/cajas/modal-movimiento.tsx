'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  createMovimiento, 
  type TipoMovimiento,
  type MonedaMovimiento,
  type CategoriaMovimiento,
  getCategoriasMovimiento,
  getCategoriaLabel
} from '@/lib/actions/movimientos'
import { toast } from 'sonner'
import { Loader2, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  turnoId: string
  tipo: TipoMovimiento
  onSuccess: () => void
}

type FormData = {
  monto: number
  moneda: MonedaMovimiento
  motivo: string
  categoria: CategoriaMovimiento
  comprobante_referencia?: string
}

export function ModalMovimiento({ open, onOpenChange, turnoId, tipo, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const categorias = getCategoriasMovimiento()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      monto: 0,
      moneda: 'PEN',
      motivo: '',
      categoria: tipo === 'EGRESO' ? 'GASTO_OPERATIVO' : 'DOTACION_SENCILLO',
      comprobante_referencia: ''
    }
  })

  const moneda = watch('moneda')
  const categoria = watch('categoria')

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const result = await createMovimiento({
        turno_id: turnoId,
        tipo,
        monto: data.monto,
        moneda: data.moneda,
        motivo: data.motivo,
        categoria: data.categoria,
        comprobante_referencia: data.comprobante_referencia || undefined
      })

      if (result.success) {
        toast.success(
          tipo === 'EGRESO' 
            ? 'Gasto registrado correctamente' 
            : 'Ingreso registrado correctamente',
          {
            description: `${data.moneda === 'PEN' ? 'S/' : '$'} ${data.monto.toFixed(2)}`
          }
        )
        reset()
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error('Error al registrar movimiento', {
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

  const getTituloModal = () => {
    if (tipo === 'EGRESO') return 'Registrar Gasto / Salida de Dinero'
    return 'Registrar Ingreso / Dotación'
  }

  const getDescripcionModal = () => {
    if (tipo === 'EGRESO') {
      return 'Registra compras, pagos o cualquier salida de efectivo de la caja'
    }
    return 'Registra dotaciones de sencillo u otros ingresos extras'
  }

  const getIcono = () => {
    if (tipo === 'EGRESO') {
      return <TrendingDown className="h-5 w-5 text-red-500" />
    }
    return <TrendingUp className="h-5 w-5 text-green-500" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcono()}
            {getTituloModal()}
          </DialogTitle>
          <DialogDescription>
            {getDescripcionModal()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Selector de Moneda */}
          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup
              value={moneda}
              onValueChange={(value) => setValue('moneda', value as MonedaMovimiento)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PEN" id="pen" />
                <Label htmlFor="pen" className="font-normal cursor-pointer">
                  Soles (S/)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="usd" />
                <Label htmlFor="usd" className="font-normal cursor-pointer">
                  Dólares ($)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">
              Monto <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register('monto', {
                  required: 'El monto es obligatorio',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                  valueAsNumber: true
                })}
                disabled={loading}
                className="pl-10 text-lg font-semibold"
              />
            </div>
            {errors.monto && (
              <p className="text-sm text-red-500">{errors.monto.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              value={categoria}
              onValueChange={(value) => setValue('categoria', value as CategoriaMovimiento)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoriaLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo / Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder={
                tipo === 'EGRESO'
                  ? 'Ej: Compra de papel higiénico y jabón líquido'
                  : 'Ej: Dotación de sencillo desde gerencia'
              }
              {...register('motivo', {
                required: 'El motivo es obligatorio',
                minLength: { value: 5, message: 'Mínimo 5 caracteres' }
              })}
              disabled={loading}
              rows={3}
            />
            {errors.motivo && (
              <p className="text-sm text-red-500">{errors.motivo.message}</p>
            )}
          </div>

          {/* Comprobante Referencia (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="comprobante_referencia" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              N° Comprobante (Opcional)
            </Label>
            <Input
              id="comprobante_referencia"
              placeholder="Ej: B001-00012345"
              {...register('comprobante_referencia')}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Si tienes ticket o factura del gasto
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant={tipo === 'EGRESO' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tipo === 'EGRESO' ? (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Registrar Gasto
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Registrar Ingreso
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
