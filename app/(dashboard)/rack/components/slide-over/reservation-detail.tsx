'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { User, Calendar, DollarSign, FileText } from 'lucide-react'

type Props = {
  reservationId: string | null
  open: boolean
  onClose: () => void
}

export function ReservationDetail({ reservationId, open, onClose }: Props) {
  if (!reservationId) return null

  // Mock data - será reemplazado en Fase 2
  const reservation = {
    id: reservationId,
    guest: 'Juan Pérez',
    room: '102',
    checkIn: '2026-01-05',
    checkOut: '2026-01-08',
    nights: 3,
    total: 210.00,
    paid: 150.00,
    status: 'RESERVADA'
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Reserva #{reservationId}</span>
            <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
              {reservation.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Detalles completos de la reserva
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Guest Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Huésped</h3>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">{reservation.guest}</p>
              <p className="text-sm text-muted-foreground">Habitación {reservation.room}</p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Fechas</h3>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Check-in:</span>
                <span className="text-sm font-medium">{reservation.checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Check-out:</span>
                <span className="text-sm font-medium">{reservation.checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Noches:</span>
                <span className="text-sm font-medium">{reservation.nights}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Pagos</h3>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">S/ {reservation.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pagado:</span>
                <span className="text-sm font-medium text-green-600">S/ {reservation.paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Saldo:</span>
                <span className="text-sm font-bold text-red-600">
                  S/ {(reservation.total - reservation.paid).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4">
            <Button className="w-full">Check-in</Button>
            <Button variant="outline" className="w-full">Registrar Pago</Button>
            <Button variant="outline" className="w-full">Editar Reserva</Button>
            <Button variant="destructive" className="w-full">Cancelar Reserva</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
