'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCajasDisponibles, type Caja } from '@/lib/actions/cajas'
import { abrirTurno } from '@/lib/actions/cajas'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Lock, DollarSign } from 'lucide-react'

type Props = {
  onSuccess: () => void
}

type FormData = {
  caja_id: string
  monto_apertura_pen: number
  monto_apertura_usd: number
}

const DENOMINACIONES_PEN = [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10]
const DENOMINACIONES_USD = [100, 50, 20, 10, 5, 1]

export function ModalAperturaTurno({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [loadingCajas, setLoadingCajas] = useState(true)
  const [cajas, setCajas] = useState<Caja[]>([])
  const [cajaSeleccionada, setCajaSeleccionada] = useState<string>('')
  const [usuarioId, setUsuarioId] = useState<string>('')
  
  // Contadores de billetes/monedas
  const [desglosePEN, setDesglosePEN] = useState<Record<number, number>>({})
  const [desgloseUSD, setDesgloseUSD] = useState<Record<number, number>>({})

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      caja_id: '',
      monto_apertura_pen: 50,
      monto_apertura_usd: 0
    }
  })

  const montoPEN = watch('monto_apertura_pen')
  const montoUSD = watch('monto_apertura_usd')

  useEffect(() => {
    const loadData = async () => {
      // Obtener usuario actual
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUsuarioId(user.id)
      }

      // Cargar cajas disponibles
      setLoadingCajas(true)
      const result = await getCajasDisponibles()
      if (result.success) {
        setCajas(result.data)
        if (result.data.length > 0) {
          setCajaSeleccionada(result.data[0].id)
          setValue('caja_id', result.data[0].id)
        }
      } else {
        toast.error('Error al cargar cajas', {
          description: result.error
        })
      }
      setLoadingCajas(false)
    }

    loadData()
  }, [setValue])

  // Calcular total del desglose
  const calcularTotalDesglose = (desglose: Record<number, number>) => {
    return Object.entries(desglose).reduce((sum, [denominacion, cantidad]) => {
      return sum + (Number(denominacion) * cantidad)
    }, 0)
  }

  const totalDesglosePEN = calcularTotalDesglose(desglosePEN)
  const totalDesgloseUSD = calcularTotalDesglose(desgloseUSD)

  const onSubmit = async (data: FormData) => {
    if (!usuarioId) {
      toast.error('No se pudo identificar el usuario')
      return
    }

    if (!data.caja_id) {
      toast.error('Selecciona una caja')
      return
    }

    setLoading(true)

    try {
      const result = await abrirTurno({
        caja_id: data.caja_id,
        usuario_id: usuarioId,
        monto_apertura_pen: data.monto_apertura_pen,
        monto_apertura_usd: data.monto_apertura_usd || 0
      })

      if (result.success) {
        toast.success('Turno abierto', {
          description: 'Tu turno de caja ha sido iniciado correctamente'
        })
        onSuccess()
      } else {
        toast.error('Error al abrir turno', {
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
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-500" />
            Apertura de Turno Requerida
          </DialogTitle>
          <DialogDescription>
            Debes abrir tu turno de caja antes de comenzar a operar.
          </DialogDescription>
        </DialogHeader>

        {loadingCajas ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cajas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay cajas disponibles.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contacta al administrador para configurar las cajas.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Selección de Caja */}
            <div className="space-y-2">
              <Label htmlFor="caja_id">
                Caja a Utilizar <span className="text-red-500">*</span>
              </Label>
              <Select
                value={cajaSeleccionada}
                onValueChange={(value) => {
                  setCajaSeleccionada(value)
                  setValue('caja_id', value)
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cajas.map((caja) => (
                    <SelectItem key={caja.id} value={caja.id}>
                      {caja.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabs para PEN y USD */}
            <Tabs defaultValue="pen" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pen">Soles (S/)</TabsTrigger>
                <TabsTrigger value="usd">Dólares ($)</TabsTrigger>
              </TabsList>

              {/* Tab Soles */}
              <TabsContent value="pen" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monto_apertura_pen">
                    Monto de Apertura (Soles) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="monto_apertura_pen"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="50.00"
                      {...register('monto_apertura_pen', {
                        required: 'El monto es obligatorio',
                        min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                        valueAsNumber: true
                      })}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue('monto_apertura_pen', totalDesglosePEN)}
                    >
                      Usar Desglose
                    </Button>
                  </div>
                  {errors.monto_apertura_pen && (
                    <p className="text-sm text-red-500">{errors.monto_apertura_pen.message}</p>
                  )}
                </div>

                {/* Desglose de billetes/monedas PEN */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Desglose (Opcional)</p>
                    <p className="text-xs text-muted-foreground">
                      Cuenta tus billetes y monedas. Total: S/ {totalDesglosePEN.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DENOMINACIONES_PEN.map((denom) => (
                      <div key={denom} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">S/ {denom}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={desglosePEN[denom] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setDesglosePEN(prev => ({ ...prev, [denom]: val }))
                          }}
                          className="text-xs h-8"
                          disabled={loading}
                        />
                        <span className="text-xs text-muted-foreground w-16">
                          = {((desglosePEN[denom] || 0) * denom).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab Dólares */}
              <TabsContent value="usd" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monto_apertura_usd">
                    Monto de Apertura (Dólares)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="monto_apertura_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('monto_apertura_usd', {
                        min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                        valueAsNumber: true
                      })}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue('monto_apertura_usd', totalDesgloseUSD)}
                    >
                      Usar Desglose
                    </Button>
                  </div>
                </div>

                {/* Desglose de billetes USD */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Desglose (Opcional)</p>
                    <p className="text-xs text-muted-foreground">
                      Cuenta tus billetes en dólares. Total: $ {totalDesgloseUSD.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DENOMINACIONES_USD.map((denom) => (
                      <div key={denom} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">$ {denom}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={desgloseUSD[denom] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setDesgloseUSD(prev => ({ ...prev, [denom]: val }))
                          }}
                          className="text-xs h-8"
                          disabled={loading}
                        />
                        <span className="text-xs text-muted-foreground w-16">
                          = {((desgloseUSD[denom] || 0) * denom).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Resumen */}
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Apertura Soles:</span>
                  <span className="font-semibold">S/ {montoPEN.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Apertura Dólares:</span>
                  <span className="font-semibold">$ {montoUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botón Submit */}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Lock className="h-4 w-4 mr-2" />
              Abrir Turno e Iniciar Jornada
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
