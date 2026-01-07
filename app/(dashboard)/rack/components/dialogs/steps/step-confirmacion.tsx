'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle, Clock } from 'lucide-react'
import { crearReservaDesdeRack } from '@/lib/actions/rack'
import type { RackHabitacion } from '@/lib/actions/rack'

type Props = {
  habitacion: RackHabitacion
  formData: any
  updateFormData: (updates: any) => void
  totalNoches: number
  totalEstimado: number
  onSuccess: () => void
  onClose: () => void
}

export function StepConfirmacion({
  habitacion,
  formData,
  updateFormData,
  totalNoches,
  totalEstimado,
  onSuccess,
  onClose
}: Props) {
  const [guardando, setGuardando] = useState(false)
  const [tipoAccion, setTipoAccion] = useState<'reserva' | 'checkin' | null>(null)

  async function handleSubmit(accion: 'reserva' | 'checkin') {
    setTipoAccion(accion)
    setGuardando(true)

    try {
      await crearReservaDesdeRack({
        habitacion_id: habitacion.id,
        huespedes: formData.huespedes,
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: formData.fecha_salida,
        precio_pactado: formData.precio_pactado,
        estado: accion === 'checkin' ? 'CHECKED_IN' : 'RESERVADA',
        pago: formData.registrar_pago ? {
          metodo_pago: formData.metodo_pago,
          monto: formData.monto_pagado,
          numero_operacion: formData.numero_operacion
        } : null
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Error al crear la reserva')
    } finally {
      setGuardando(false)
      setTipoAccion(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="space-y-3">
        <h3 className="font-semibold">Resumen de la Reserva</h3>
        
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Habitación:</span>
            <span className="font-medium">
              {habitacion.numero} - {habitacion.tipos_habitacion.nombre}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entrada:</span>
            <span className="font-medium">
              {format(formData.fecha_entrada, 'PPP', { locale: es })}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Salida:</span>
            <span className="font-medium">
              {format(formData.fecha_salida, 'PPP', { locale: es })}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Noches:</span>
            <span className="font-medium">{totalNoches}</span>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Huésped titular:</span>
              <span className="font-medium">
                {formData.huespedes?.find((h: any) => h.es_titular)?.nombres} {formData.huespedes?.find((h: any) => h.es_titular)?.apellidos}
              </span>
            </div>

            {formData.huespedes && formData.huespedes.length > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acompañantes:</span>
                <span className="font-medium">
                  {formData.huespedes.filter((h: any) => !h.es_titular).length} persona{formData.huespedes.filter((h: any) => !h.es_titular).length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documento:</span>
              <span className="font-medium">
                {formData.huespedes?.find((h: any) => h.es_titular)?.tipo_documento} {formData.huespedes?.find((h: any) => h.es_titular)?.numero_documento}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold">S/ {totalEstimado.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Opciones de Pago */}
      <div className="space-y-3">
        <Label>¿Registrar pago ahora?</Label>
        
        <RadioGroup
          value={formData.registrar_pago ? 'si' : 'no'}
          onValueChange={(value) => updateFormData({ registrar_pago: value === 'si' })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="no-pago" />
            <label htmlFor="no-pago" className="text-sm cursor-pointer">
              No, continuar sin pago
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="si" id="si-pago" />
            <label htmlFor="si-pago" className="text-sm cursor-pointer">
              Sí, registrar pago ahora
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Formulario de Pago */}
      {formData.registrar_pago && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select
              value={formData.metodo_pago || ''}
              onValueChange={(value) => updateFormData({ metodo_pago: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="YAPE">Yape</SelectItem>
                <SelectItem value="PLIN">Plin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Monto a Pagar</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.monto_pagado}
              onChange={(e) => updateFormData({ monto_pagado: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          {formData.metodo_pago && formData.metodo_pago !== 'EFECTIVO' && (
            <div className="space-y-2">
              <Label>Número de Operación</Label>
              <Input
                value={formData.numero_operacion || ''}
                onChange={(e) => updateFormData({ numero_operacion: e.target.value })}
                placeholder="Número de transacción"
              />
            </div>
          )}
        </div>
      )}

      {/* Botones de Acción */}
      <div className="space-y-3 pt-4 border-t">
        <Button
          className="w-full"
          size="lg"
          variant="default"
          onClick={() => handleSubmit('reserva')}
          disabled={guardando}
        >
          {guardando && tipoAccion === 'reserva' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Clock className="mr-2 h-4 w-4" />
          )}
          Crear Reserva (para después)
        </Button>

        <Button
          className="w-full"
          size="lg"
          onClick={() => handleSubmit('checkin')}
          disabled={guardando}
        >
          {guardando && tipoAccion === 'checkin' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Hacer Check-in Ahora
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={onClose}
          disabled={guardando}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
