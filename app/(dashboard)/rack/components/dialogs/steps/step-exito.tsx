'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, CreditCard, DoorClosed, Receipt } from 'lucide-react'

type Props = {
  reservaId: string
  codigoReserva: string
  esCheckIn: boolean
  totalPagar: number
  onCobrar: () => void
  onCerrar: () => void
}

export function StepExito({ 
  reservaId, 
  codigoReserva, 
  esCheckIn, 
  totalPagar,
  onCobrar, 
  onCerrar 
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {esCheckIn ? '¡Check-in Exitoso!' : '¡Reserva Confirmada!'}
        </h2>
        <p className="text-muted-foreground">
          La operación se ha registrado correctamente con código 
          <span className="font-mono font-medium text-foreground mx-1">{codigoReserva}</span>
        </p>
      </div>

      <div className="w-full max-w-sm bg-muted/50 rounded-lg p-4 border">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Saldo Pendiente</span>
          <span className="text-xl font-bold text-primary">S/ {totalPagar.toFixed(2)}</span>
        </div>
        
        <div className="grid gap-3">
          <Button 
            size="lg" 
            className="w-full font-semibold shadow-md" 
            onClick={onCobrar}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Cobrar y Facturar Ahora
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onCerrar}
          >
            <DoorClosed className="mr-2 h-4 w-4" />
            Finalizar y volver al Rack
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground max-w-xs">
        Puedes registrar el pago más tarde seleccionando la reserva en el Rack.
      </p>
    </div>
  )
}
