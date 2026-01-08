'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle, Clock, CreditCard } from 'lucide-react'
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
  onPaymentRequest: (reservaId: string) => void
}

export function StepConfirmacion({
  habitacion,
  formData,
  updateFormData,
  totalNoches,
  totalEstimado,
  onSuccess,
  onClose,
  onPaymentRequest
}: Props) {
  const [guardando, setGuardando] = useState(false)
  const [tipoAccion, setTipoAccion] = useState<'reserva' | 'checkin' | null>(null)

  async function handleSubmit(accion: 'reserva' | 'checkin') {
    setTipoAccion(accion)
    setGuardando(true)

    try {
      const result = await crearReservaDesdeRack({
        habitacion_id: habitacion.id,
        huespedes: formData.huespedes,
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: formData.fecha_salida,
        precio_pactado: formData.precio_pactado,
        estado: accion === 'checkin' ? 'CHECKED_IN' : 'RESERVADA',
        // Ya no enviamos pago aquí, se maneja aparte
        pago: null
      })

      if (result.error) {
        alert(result.error)
        return
      }

      onSuccess() // Refrescar Rack

      if (formData.registrar_pago && result.data?.id) {
        // Si marcó pagar, abrimos el flujo de pago con el ID creado
        onPaymentRequest(result.data.id)
      } else {
        onClose() // Si no, cerramos todo
      }

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

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documento:</span>
              <span className="font-medium">
                {formData.huespedes?.find((h: any) => h.es_titular)?.tipo_documento} {formData.huespedes?.find((h: any) => h.es_titular)?.numero_documento}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="font-semibold">Total a Pagar:</span>
            <span className="text-xl font-bold">S/ {totalEstimado.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Opción de Pago Diferido */}
      <div className="flex items-start space-x-2 p-4 border border-blue-200 bg-blue-50 rounded-lg">
        <Checkbox 
          id="pagar_ahora" 
          checked={formData.registrar_pago}
          onCheckedChange={(checked) => updateFormData({ registrar_pago: checked === true })}
        />
        <div className="grid gap-1.5 leading-none">
          <Label 
            htmlFor="pagar_ahora" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Proceder al cobro inmediatamente
          </Label>
          <p className="text-xs text-muted-foreground">
            Al finalizar, se abrirá la ventana para emitir el comprobante de pago.
          </p>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="space-y-3 pt-4 border-t">
        <Button
          className="w-full"
          size="lg"
          variant="outline"
          onClick={() => handleSubmit('reserva')}
          disabled={guardando}
        >
          {guardando && tipoAccion === 'reserva' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Clock className="mr-2 h-4 w-4" />
          )}
          Solo Reservar (Sin Check-in)
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
          Confirmar Check-in
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

