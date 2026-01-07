'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, Clock, Building2, Mail, Phone, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { updateHotelConfiguracion } from '@/lib/actions/configuracion'
import type { HotelConfiguracion } from '@/lib/actions/configuracion'

type Props = {
  initialData: HotelConfiguracion | null
}

export function ConfiguracionGeneralForm({ initialData }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    ruc: initialData?.ruc || '',
    razon_social: initialData?.razon_social || '',
    nombre_comercial: initialData?.nombre_comercial || '',
    direccion_fiscal: initialData?.direccion_fiscal || '',
    telefono: initialData?.telefono || '',
    email: initialData?.email || '',
    pagina_web: initialData?.pagina_web || '',
    hora_checkin: initialData?.hora_checkin || '14:00',
    hora_checkout: initialData?.hora_checkout || '12:00',
    descripcion: initialData?.descripcion || '',
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await updateHotelConfiguracion(formData)
      toast.success('Configuración guardada exitosamente')
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.errorle.error('Error saving configuration:', error)
      alert('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Datos del Hotel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del Hotel
          </CardTitle>
          <CardDescription>
            Datos generales de tu establecimiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC *</Label>
              <Input
                id="ruc"
                value={formData.ruc}
                onChange={(e) => updateField('ruc', e.target.value)}
                placeholder="20XXXXXXXXX"
                maxLength={11}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                placeholder="+51 999 999 999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razon_social">Razón Social *</Label>
            <Input
              id="razon_social"
              value={formData.razon_social}
              onChange={(e) => updateField('razon_social', e.target.value)}
              placeholder="HOTEL PARADISE S.A.C."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
            <Input
              id="nombre_comercial"
              value={formData.nombre_comercial}
              onChange={(e) => updateField('nombre_comercial', e.target.value)}
              placeholder="Hotel Paradise"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion_fiscal">Dirección Fiscal</Label>
            <Input
              id="direccion_fiscal"
              value={formData.direccion_fiscal}
              onChange={(e) => updateField('direccion_fiscal', e.target.value)}
              placeholder="Av. Principal 123, Lima"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contacto@hotel.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pagina_web" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Página Web
              </Label>
              <Input
                id="pagina_web"
                type="url"
                value={formData.pagina_web}
                onChange={(e) => updateField('pagina_web', e.target.value)}
                placeholder="https://www.hotel.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              placeholder="Breve descripción del hotel..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horarios de Check-in/Check-out
          </CardTitle>
          <CardDescription>
            Define los horarios estándar del hotel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora_checkin">Hora de Check-in</Label>
              <Input
                id="hora_checkin"
                type="time"
                value={formData.hora_checkin}
                onChange={(e) => updateField('hora_checkin', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Hora a partir de la cual los huéspedes pueden hacer check-in
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_checkout">Hora de Check-out</Label>
              <Input
                id="hora_checkout"
                type="time"
                value={formData.hora_checkout}
                onChange={(e) => updateField('hora_checkout', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Hora límite para que los huéspedes hagan check-out
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
