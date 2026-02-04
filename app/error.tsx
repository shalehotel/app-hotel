'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <CardTitle>Error Inesperado</CardTitle>
          </div>
          <CardDescription>
            Ha ocurrido un error al cargar la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-mono text-muted-foreground">
              {error.message || 'Error desconocido'}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Código: {error.digest}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Posibles soluciones:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Configura tu hotel en <span className="font-medium">/configuracion</span></li>
              <li>Verifica que tienes permisos adecuados</li>
              <li>Intenta recargar la página</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => reset()} className="flex-1">
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/configuracion'}
              className="flex-1"
            >
              Ir a Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
