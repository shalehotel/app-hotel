'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'

export function AlertsTab() {
  // Mock data - será reemplazado en Fase 2
  const alerts = [
    { id: '1', type: 'payment', message: 'Pago vencido - Hab 102', severity: 'high' },
    { id: '2', type: 'noshow', message: 'Posible No-show - Hab 205', severity: 'medium' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Alertas
        </CardTitle>
        <CardDescription>
          {alerts.length} alertas requieren atención
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-2">
              {alert.severity === 'high' && (
                <Badge variant="destructive" className="mt-0.5">
                  Alta
                </Badge>
              )}
              {alert.severity === 'medium' && (
                <Badge variant="secondary" className="mt-0.5">
                  Media
                </Badge>
              )}
              <p className="text-sm flex-1">{alert.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
