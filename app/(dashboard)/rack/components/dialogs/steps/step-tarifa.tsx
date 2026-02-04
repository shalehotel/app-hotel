'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTarifas, type Tarifa } from '@/lib/actions/tarifas'
import type { RackHabitacion } from '@/types/rack'

type Props = {
  habitacion: RackHabitacion
  formData: any
  updateFormData: (updates: any) => void
  totalNoches: number
  totalEstimado: number
}

export function StepTarifa({ habitacion, formData, updateFormData, totalNoches, totalEstimado }: Props) {
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(true)
  const [precioManual, setPrecioManual] = useState(false)

  useEffect(() => {
    loadTarifas()
  }, [habitacion.tipo_id, habitacion.categoria_id])

  async function loadTarifas() {
    try {
      setLoading(true)
      const data = await getTarifas()
      // Filtrar solo las tarifas que coincidan con el tipo y categoría de la habitación
      const tarifasFiltradas = data.filter(t => 
        t.activa && 
        t.tipo_habitacion_id === habitacion.tipo_id && 
        t.categoria_habitacion_id === habitacion.categoria_id
      )
      setTarifas(tarifasFiltradas)
    } catch (error) {
      console.error('Error loading tarifas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTarifaSelect = (tarifaId: string) => {
    const tarifa = tarifas.find(t => t.id === tarifaId)
    if (tarifa) {
      updateFormData({
        tarifa_id: tarifaId,
        precio_pactado: tarifa.precio_base
      })
      setPrecioManual(false)
    }
  }

  const tarifaSeleccionada = tarifas.find(t => t.id === formData.tarifa_id)
  const precioFueraDeLimite = tarifaSeleccionada && formData.precio_pactado < tarifaSeleccionada.precio_minimo

  return (
    <div className="space-y-6">
      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha de Entrada</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.fecha_entrada, 'PPP', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.fecha_entrada}
                onSelect={(date) => date && updateFormData({ fecha_entrada: date })}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha de Salida</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.fecha_salida, 'PPP', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.fecha_salida}
                onSelect={(date) => date && updateFormData({ fecha_salida: date })}
                locale={es}
                disabled={(date) => date <= formData.fecha_entrada}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {totalNoches} {totalNoches === 1 ? 'noche' : 'noches'}
      </div>

      {/* Tarifas */}
      <div className="space-y-3">
        <Label>Seleccionar Tarifa</Label>
        
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tarifas...
          </div>
        ) : tarifas.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No hay tarifas disponibles. Configura tarifas primero.
          </div>
        ) : (
          <RadioGroup value={formData.tarifa_id || ''} onValueChange={handleTarifaSelect}>
            {tarifas.map((tarifa) => (
              <div key={tarifa.id} className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value={tarifa.id} id={tarifa.id} />
                <label
                  htmlFor={tarifa.id}
                  className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <span>{tarifa.nombre_tarifa}</span>
                    <div className="text-right">
                      <div className="font-semibold">S/ {tarifa.precio_base.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        Mínimo: S/ {tarifa.precio_minimo.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Precio Pactado */}
      {formData.tarifa_id && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Precio Pactado (por noche)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPrecioManual(!precioManual)}
            >
              {precioManual ? 'Usar precio base' : 'Editar precio'}
            </Button>
          </div>

          {precioManual ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_pactado}
              onChange={(e) => updateFormData({ precio_pactado: parseFloat(e.target.value) || 0 })}
            />
          ) : (
            <div className="text-2xl font-bold">
              S/ {formData.precio_pactado.toFixed(2)}
            </div>
          )}

          {precioFueraDeLimite && (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                El precio está por debajo del mínimo permitido (S/ {tarifaSeleccionada.precio_minimo.toFixed(2)}).
                Se requiere autorización especial.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview Total */}
      {formData.tarifa_id && formData.precio_pactado > 0 && (
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Precio por noche:</span>
            <span>S/ {formData.precio_pactado.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Número de noches:</span>
            <span>{totalNoches}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
            <span>Total Estimado:</span>
            <span>S/ {totalEstimado.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
