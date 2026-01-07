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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cerrarTurno, type TurnoActivo, type MovimientosTurno } from '@/lib/actions/turnos'
import { toast } from 'sonner'
import { Loader2, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  turno: TurnoActivo
  movimientos: MovimientosTurno | null
  onSuccess: () => void
}

type FormData = {
  declarado_pen: number
  declarado_usd: number
  nota?: string
}

const DENOMINACIONES_PEN = [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10]
const DENOMINACIONES_USD = [100, 50, 20, 10, 5, 1]

export function ModalCierreTurno({ open, onOpenChange, turno, movimientos, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [desglosePEN, setDesglosePEN] = useState<Record<number, number>>({})
  const [desgloseUSD, setDesgloseUSD] = useState<Record<number, number>>({})
  const [resultado, setResultado] = useState<any>(null)
  const [paso, setPaso] = useState<'conteo' | 'resultado'>('conteo')

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      declarado_pen: 0,
      declarado_usd: 0,
      nota: ''
    }
  })

  const declaradoPEN = watch('declarado_pen')
  const declaradoUSD = watch('declarado_usd')

  // Calcular total del desglose
  const calcularTotalDesglose = (desglose: Record<number, number>) => {
    return Object.entries(desglose).reduce((sum, [denominacion, cantidad]) => {
      return sum + (Number(denominacion) * cantidad)
    }, 0)
  }

  const totalDesglosePEN = calcularTotalDesglose(desglosePEN)
  const totalDesgloseUSD = calcularTotalDesglose(desgloseUSD)

  const montoEsperadoPEN = movimientos 
    ? turno.monto_apertura + movimientos.totalEfectivoPEN 
    : turno.monto_apertura

  const montoEsperadoUSD = movimientos
    ? (turno.monto_apertura_usd || 0) + movimientos.totalEfectivoUSD
    : (turno.monto_apertura_usd || 0)

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const result = await cerrarTurno({
        turno_id: turno.id,
        declarado_pen: data.declarado_pen,
        declarado_usd: data.declarado_usd || 0,
        arqueo_pen: desglosePEN,
        arqueo_usd: desgloseUSD,
        nota: data.nota
      })

      if (result.success) {
        setResultado(result)
        setPaso('resultado')
      } else {
        toast.error('Error al cerrar turno', {
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

  const handleFinalizar = () => {
    toast.success('Turno cerrado correctamente')
    onSuccess()
    onOpenChange(false)
    // Resetear estado
    setPaso('conteo')
    setResultado(null)
    setDesglosePEN({})
    setDesgloseUSD({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-500" />
            {paso === 'conteo' ? 'Cierre de Turno - Arqueo de Caja' : 'Resultado del Cierre'}
          </DialogTitle>
          <DialogDescription>
            {paso === 'conteo' 
              ? '⚠️ CIERRE CIEGO: Cuenta el dinero sin ver el monto esperado'
              : 'Resumen del cierre de turno'
            }
          </DialogDescription>
        </DialogHeader>

        {paso === 'conteo' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Advertencia de Cierre Ciego */}
            <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200">
              <CardContent className="pt-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  🔒 <strong>Procedimiento de Cierre Ciego:</strong> Cuenta todo el dinero en efectivo de la caja. 
                  El sistema comparará con el monto esperado DESPUÉS de confirmar.
                </p>
              </CardContent>
            </Card>

            {/* Tabs para PEN y USD */}
            <Tabs defaultValue="pen" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pen">Soles (S/)</TabsTrigger>
                <TabsTrigger value="usd">Dólares ($)</TabsTrigger>
              </TabsList>

              {/* Tab Soles */}
              <TabsContent value="pen" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="declarado_pen">
                    Total Contado (Soles) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="declarado_pen"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('declarado_pen', {
                        required: 'Debes contar el dinero',
                        min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                        valueAsNumber: true
                      })}
                      disabled={loading}
                      className="flex-1 text-lg font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue('declarado_pen', totalDesglosePEN)}
                    >
                      Usar Desglose
                    </Button>
                  </div>
                  {errors.declarado_pen && (
                    <p className="text-sm text-red-500">{errors.declarado_pen.message}</p>
                  )}
                </div>

                {/* Calculadora de billetes PEN */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Calculadora de Billetes y Monedas</CardTitle>
                    <CardDescription className="text-xs">
                      Total calculado: S/ {totalDesglosePEN.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Dólares */}
              <TabsContent value="usd" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="declarado_usd">
                    Total Contado (Dólares)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="declarado_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('declarado_usd', {
                        min: { value: 0, message: 'Debe ser mayor o igual a 0' },
                        valueAsNumber: true
                      })}
                      disabled={loading}
                      className="flex-1 text-lg font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue('declarado_usd', totalDesgloseUSD)}
                    >
                      Usar Desglose
                    </Button>
                  </div>
                </div>

                {/* Calculadora de billetes USD */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Calculadora de Billetes</CardTitle>
                    <CardDescription className="text-xs">
                      Total calculado: $ {totalDesgloseUSD.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Nota opcional */}
            <div className="space-y-2">
              <Label htmlFor="nota">Notas / Observaciones (Opcional)</Label>
              <Textarea
                id="nota"
                placeholder="Ej: Se cambió un billete de 200, etc."
                {...register('nota')}
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Resumen */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Total Declarado Soles:</span>
                  <span>S/ {declaradoPEN.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Declarado Dólares:</span>
                  <span>$ {declaradoUSD.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} variant="destructive" size="lg">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Lock className="h-4 w-4 mr-2" />
                Confirmar Cierre
              </Button>
            </div>
          </form>
        ) : (
          // Paso 2: Resultado
          <div className="space-y-6">
            {resultado && (
              <>
                {/* Estado del cuadre */}
                <Card className={
                  resultado.estado_cuadre === 'EXACTO' 
                    ? 'bg-green-50 dark:bg-green-950 border-green-200'
                    : resultado.estado_cuadre === 'SOBRANTE'
                    ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200'
                    : 'bg-red-50 dark:bg-red-950 border-red-200'
                }>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {resultado.estado_cuadre === 'EXACTO' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Cuadre Exacto</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <span className="text-orange-700 dark:text-orange-400">
                            {resultado.estado_cuadre === 'SOBRANTE' ? 'Sobrante Detectado' : 'Faltante Detectado'}
                          </span>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Sistema Esperaba (PEN)</p>
                        <p className="font-semibold text-lg">S/ {resultado.monto_sistema_pen.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Tú Declaraste (PEN)</p>
                        <p className="font-semibold text-lg">S/ {declaradoPEN.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Diferencia (PEN):</span>
                      <Badge variant={
                        Math.abs(resultado.diferencia_pen) < 0.5 ? 'secondary' : 
                        resultado.diferencia_pen > 0 ? 'default' : 'destructive'
                      } className="text-base">
                        {resultado.diferencia_pen > 0 ? '+' : ''}{resultado.diferencia_pen.toFixed(2)}
                      </Badge>
                    </div>
                    
                    {resultado.monto_sistema_usd > 0 && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Sistema Esperaba (USD)</p>
                            <p className="font-semibold">$ {resultado.monto_sistema_usd.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Tú Declaraste (USD)</p>
                            <p className="font-semibold">$ {declaradoUSD.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Diferencia (USD):</span>
                          <Badge variant={
                            Math.abs(resultado.diferencia_usd) < 0.5 ? 'secondary' : 
                            resultado.diferencia_usd > 0 ? 'default' : 'destructive'
                          }>
                            {resultado.diferencia_usd > 0 ? '+' : ''}{resultado.diferencia_usd.toFixed(2)}
                          </Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Mensaje */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {resultado.mensaje}
                  </p>
                </div>

                {/* Botón finalizar */}
                <Button 
                  onClick={handleFinalizar} 
                  className="w-full" 
                  size="lg"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Entendido, Finalizar
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
