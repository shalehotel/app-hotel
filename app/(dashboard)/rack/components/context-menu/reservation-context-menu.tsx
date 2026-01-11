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
import { Button } from '@/components/ui/button'
import { LogIn, CreditCard, XCircle, Loader2, LogOut } from 'lucide-react'
import { RegistrarPagoDialog } from '@/components/cajas/registrar-pago-dialog'
import { realizarCheckin } from '@/lib/actions/checkin'
import { realizarCheckout, validarCheckout } from '@/lib/actions/checkout'
import { cancelarReserva } from '@/lib/actions/reservas'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RackReserva } from '@/types/rack'

type Props = {
  children: React.ReactNode
  reserva: RackReserva
  onUpdate: () => void
}

export function ReservationContextMenu({ children, reserva, onUpdate }: Props) {
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false)
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)
  
  // Estados para checkout con deuda
  const [forceCheckoutNeeded, setForceCheckoutNeeded] = useState(false)
  const [deudaPendiente, setDeudaPendiente] = useState(0)
  
  const fechaEntrada = new Date(reserva.fecha_entrada)
  const puedeHacerCheckin = isToday(fechaEntrada) && reserva.estado === 'RESERVADA'
  const puedeHacerCheckout = reserva.estado === 'CHECKED_IN'

  const handleCheckInRapido = async () => {
    if (!puedeHacerCheckin) return
    
    setProcesando(true)
    try {
      const result = await realizarCheckin(reserva.id)
      
      if (result.error) {
        alert(`Error: ${result.message || result.error}`)
      } else {
        onUpdate()
      }
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
      const result = await cancelarReserva(reserva.id)
      
      if (result.error) {
        alert(`Error: ${result.message || result.error}`)
      } else {
        setCancelarDialogOpen(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error al cancelar:', error)
      alert('Error al cancelar la reserva')
    } finally {
      setProcesando(false)
    }
  }

  const iniciarCheckout = async () => {
    setProcesando(true)
    try {
        const validacion = await validarCheckout(reserva.id)
        if (!validacion.puede_checkout) {
            setDeudaPendiente(validacion.saldo_pendiente || 0)
            setForceCheckoutNeeded(true)
            setCheckoutDialogOpen(true) // Asegurar que esté abierto
        } else {
            // Si no hay deuda, ejecutar directo o abrir confirmación simple
            // Aquí abrimos el dialog para confirmar visualmente
            setForceCheckoutNeeded(false)
            setCheckoutDialogOpen(true)
        }
    } catch (error) {
        console.error('Error validando checkout:', error)
        alert('Error al validar checkout')
    } finally {
        setProcesando(false)
    }
  }

  const confirmarCheckout = async (forzar = false) => {
    setProcesando(true)
    try {
      await realizarCheckout({
        reserva_id: reserva.id,
        forzar_checkout: forzar
      })
      setCheckoutDialogOpen(false)
      setForceCheckoutNeeded(false)
      onUpdate()
      // Idealmente usar toast, pero alert por simplicidad en este componente
      // alert('Check-out realizado exitosamente') 
    } catch (error) {
      console.error('Error en checkout:', error)
      alert(error instanceof Error ? error.message : 'Error al hacer check-out')
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

          {puedeHacerCheckout && (
            <>
              <ContextMenuItem
                onClick={iniciarCheckout}
                disabled={procesando}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check-out
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
      <RegistrarPagoDialog
        open={pagoDialogOpen}
        onOpenChange={setPagoDialogOpen}
        reserva={{
          id: reserva.id,
          saldo_pendiente: reserva.saldo_pendiente || 0,
          titular_nombre: `${reserva.huespedes?.nombres || ''} ${reserva.huespedes?.apellidos || ''}`,
          titular_tipo_doc: '',
          titular_numero_doc: '',
          habitacion_numero: '...',
          precio_pactado: reserva.precio_pactado || 0
        }}
        onSuccess={onUpdate}
      />

      {/* Dialog de Checkout */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
                {forceCheckoutNeeded ? '⚠️ Deuda Pendiente' : 'Confirmar Check-out'}
            </DialogTitle>
            <DialogDescription>
              {reserva.codigo_reserva}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {forceCheckoutNeeded ? (
                <div className="space-y-4">
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                        El huésped tiene un saldo pendiente de <strong>S/ {deudaPendiente.toFixed(2)}</strong>.
                    </div>
                    <Button 
                        className="w-full" 
                        onClick={() => {
                            setCheckoutDialogOpen(false)
                            setPagoDialogOpen(true)
                        }}
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pagar Deuda Ahora
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        O puedes forzar la salida dejando la deuda:
                    </p>
                </div>
            ) : (
                <p className="text-sm">
                ¿Confirmar check-out para {reserva.huespedes?.nombres} {reserva.huespedes?.apellidos}?
                </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                  setCheckoutDialogOpen(false)
                  setForceCheckoutNeeded(false)
              }}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button 
                onClick={() => confirmarCheckout(forceCheckoutNeeded)} 
                disabled={procesando}
                variant={forceCheckoutNeeded ? "destructive" : "default"}
            >
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {forceCheckoutNeeded ? 'Forzar Check-out' : 'Confirmar Salida'}
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
