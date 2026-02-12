'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  getDetalleHuesped,
  actualizarNotasHuesped,
  toggleClienteFrecuente
} from '@/lib/actions/huespedes'
import {
  Star,
  Loader2,
  Save,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

type Props = {
  huespedId: string
  open: boolean
  onClose: () => void
}

export function HuespedDetailSheet({ huespedId, open, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [huesped, setHuesped] = useState<any>(null)
  const [notas, setNotas] = useState('')
  const [notasOriginales, setNotasOriginales] = useState('')

  useEffect(() => {
    if (open) {
      cargarDatos()
    }
  }, [huespedId, open])

  async function cargarDatos() {
    setLoading(true)
    try {
      const data = await getDetalleHuesped(huespedId)
      setHuesped(data)
      setNotas(data?.notas_internas || '')
      setNotasOriginales(data?.notas_internas || '')
    } catch (error) {
      console.error('Error al cargar huésped:', error)
      toast.error('Error al cargar datos del huésped')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardarNotas() {
    if (notas === notasOriginales) return

    setSaving(true)
    try {
      await actualizarNotasHuesped(huespedId, notas)
      setNotasOriginales(notas)
      toast.success('Notas actualizadas')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar notas')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleVIP() {
    try {
      await toggleClienteFrecuente(huespedId, !huesped.es_frecuente)
      setHuesped({ ...huesped, es_frecuente: !huesped.es_frecuente })
      toast.success(huesped.es_frecuente ? 'Cliente marcado como Normal' : 'Cliente marcado como VIP')
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado')
    }
  }

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-xl">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!huesped) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">
              {huesped.nombres} {huesped.apellidos}
            </SheetTitle>
            {huesped.es_frecuente && (
              <Badge variant="default" className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white border-0">
                <Star className="h-3 w-3 fill-current" />
                VIP
              </Badge>
            )}
          </div>
          <SheetDescription>
            {huesped.tipo_documento} {huesped.numero_documento}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Gastado</p>
              <p className="text-lg font-bold mt-1">
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN',
                  minimumFractionDigits: 0
                }).format(huesped.gasto_total_historico || 0)}
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Visitas</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold">{huesped.visitas_completadas}</span>
                <span className="text-xs text-muted-foreground">de {huesped.total_visitas} reservas</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información Personal */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información Personal</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Correo electrónico</p>
                <p className="font-medium break-words">{huesped.correo || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Teléfono</p>
                <p className="font-medium">{huesped.telefono || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">País</p>
                <p className="font-medium">{huesped.pais || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Procedencia</p>
                <p className="font-medium">
                  {[huesped.procedencia_ciudad, huesped.procedencia_departamento].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cumpleaños</p>
                <p className="font-medium">
                  {huesped.fecha_nacimiento
                    ? format(new Date(huesped.fecha_nacimiento), 'dd MMM yyyy', { locale: es })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Última Visita</p>
                <p className="font-medium">
                  {huesped.ultima_visita
                    ? format(new Date(huesped.ultima_visita), 'dd MMM yyyy', { locale: es })
                    : 'Nunca'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notas Internas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">Notas Internas</h3>
              {notas !== notasOriginales && (
                <span className="text-xs text-orange-600 font-medium">Cambios sin guardar</span>
              )}
            </div>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Preferencias, alergias, incidentes previos..."
              className="min-h-[100px] resize-y"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleGuardarNotas}
                disabled={saving || notas === notasOriginales}
              >
                {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Guardar Notas
              </Button>
            </div>
          </div>

          <Separator />

          {/* Historial Reciente (Simplificado) */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Historial Reciente</h3>
            {huesped.estadias && huesped.estadias.length > 0 ? (
              <div className="space-y-3">
                {huesped.estadias.slice(0, 3).map((estadia: any) => (
                  <div key={estadia.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Reserva {estadia.codigo_reserva}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(estadia.fecha_entrada), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <Badge variant={
                      estadia.estado === 'CHECKED_IN' ? 'default' :
                        estadia.estado === 'CANCELADA' ? 'destructive' : 'secondary'
                    } className="text-[10px]">
                      {estadia.estado}
                    </Badge>
                  </div>
                ))}
                {huesped.estadias.length > 3 && (
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    y {huesped.estadias.length - 3} estadías más...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No hay historial de estadías.</p>
            )}
          </div>

        </div>

        <SheetFooter className="p-6 pt-2 border-t mt-auto">
          <Button
            className="w-full"
            variant={huesped.es_frecuente ? 'outline' : 'secondary'}
            onClick={handleToggleVIP}
          >
            <Star className="mr-2 h-4 w-4" />
            {huesped.es_frecuente ? 'Quitar estado VIP' : 'Marcar como VIP'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}