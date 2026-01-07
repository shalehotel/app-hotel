'use client'

import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogIn, CreditCard, XCircle, Loader2 } from 'lucide-react'
import { checkInRapido, cancelarReserva } from '@/lib/actions/rack'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RackReserva } from '@/lib/actions/rack'

type Props = {
  children: React.ReactNode
  reserva: RackReserva
  onUpdate: () => void
}

export function ReservationContextMenu({ children, reserva, onUpdate }: Props) {
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)
  
  // Datos del pago
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [numeroOperacion, setNumeroOperacion] = useState('')

  const fechaEntrada = new Date(reserva.fecha_entrada)
  const puedeHacerCheckin = isToday(fechaEntrada) && reserva.estado === 'RESERVADA'

  const handleCheckInRapido = async () => {
    if (!puedeHacerCheckin) return
    
    setProcesando(true)
    try {
      await checkInRapido(reserva.id)
      onUpdate()
    } catch (error) {
      console.error('Error en check-in:', error)
      alert('Error al hacer check-in')
    } finally {
      setProcesando(false)
    }
  }

  const handleCancelarReserva = async () => {
    setProcesando(true)
    try {
      await cancelarReserva(reserva.id)
      setCancelarDialogOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Error al cancelar:', error)
      alert('Error al cancelar la reserva')
    } finally {
      setProcesando(false)
    }
  }

  const handleRegistrarPago = async () => {
    if (!montoPago || parseFloat(montoPago) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setProcesando(true)
    try {
      // Importar y usar la función de pagos
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('pagos')
        .insert({
          reserva_id: reserva.id,
          monto: parseFloat(montoPago),
          metodo_pago: metodoPago,
          numero_operacion: numeroOperacion || null,
          fecha_pago: new Date().toISOString()
        })

      if (error) throw error

      setPagoDialogOpen(false)
      setMontoPago('')
      setMetodoPago('EFECTIVO')
      setNumeroOperacion('')
      onUpdate()
    } catch (error) {
      console.error('Error al registrar pago:', error)
      alert('Error al registrar el pago')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {puedeHacerCheckin && (
            <>
              <ContextMenuItem
                onClick={handleCheckInRapido}
                disabled={procesando}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check-in Rápido
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          <ContextMenuItem onClick={() => setPagoDialogOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Cobrar Rápido
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => setCancelarDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar Reserva
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialog de Pago Rápido */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {reserva.codigo_reserva} - {reserva.huespedes?.nombres} {reserva.huespedes?.apellidos}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto a cobrar</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo">Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
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

            {metodoPago !== 'EFECTIVO' && (
              <div className="space-y-2">
                <Label htmlFor="operacion">Número de Operación</Label>
                <Input
                  id="operacion"
                  placeholder="Opcional"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPagoDialogOpen(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button onClick={handleRegistrarPago} disabled={procesando}>
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Cancelación */}
      <Dialog open={cancelarDialogOpen} onOpenChange={setCancelarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar Reserva?</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la reserva {reserva.codigo_reserva} de{' '}
              {reserva.huespedes?.nombres} {reserva.huespedes?.apellidos}.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelarDialogOpen(false)}
              disabled={procesando}
            >
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelarReserva}
              disabled={procesando}
            >
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
