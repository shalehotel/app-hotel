'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  onReservationClick: (id: string) => void
  checkins: any[]
  checkouts: any[]
}

export function TodayTab({ onReservationClick, checkins, checkouts }: Props) {
  return (
    <div className="space-y-4">
      {/* Check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowDown className="h-4 w-4" />
            Check-ins Pendientes
          </CardTitle>
          <CardDescription>
            {checkins.length} llegadas programadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay check-ins programados
            </p>
          ) : (
            checkins.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onReservationClick(checkin.id)}
              >
                <div>
                  <p className="font-medium text-sm">
                    {checkin.huespedes ? `${checkin.huespedes.nombres} ${checkin.huespedes.apellidos}` : 'Sin huésped'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hab {checkin.habitaciones?.numero || 'N/A'}
                  </p>
                </div>
                <Badge variant="outline">
                  {format(new Date(checkin.fecha_entrada), 'HH:mm', { locale: es })}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Check-outs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUp className="h-4 w-4" />
            Check-outs Pendientes
          </CardTitle>
          <CardDescription>
            {checkouts.length} salidas programadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay check-outs programados
            </p>
          ) : (
            checkouts.map((checkout) => (
              <div
                key={checkout.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onReservationClick(checkout.id)}
              >
                <div>
                  <p className="font-medium text-sm">
                    {checkout.huespedes ? `${checkout.huespedes.nombres} ${checkout.huespedes.apellidos}` : 'Sin huésped'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hab {checkout.habitaciones?.numero || 'N/A'}
                  </p>
                </div>
                <Badge variant="outline">
                  {format(new Date(checkout.fecha_salida), 'HH:mm', { locale: es })}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
