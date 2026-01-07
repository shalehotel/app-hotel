'use client'

import { HuespedesForm } from '@/components/huespedes/huespedes-form'
import type { HuespedConRelacion } from '@/lib/actions/huespedes'
import { useState, useEffect, useRef } from 'react'

type Props = {
  formData: any
  updateFormData: (updates: any) => void
  onValidate?: () => boolean
}

export function StepHuesped({ formData, updateFormData }: Props) {
  // Convertir datos del formData a formato del componente si ya existen
  const [initialHuespedes, setInitialHuespedes] = useState<any[]>()

  useEffect(() => {
    if (formData.huespedes && formData.huespedes.length > 0) {
      setInitialHuespedes(formData.huespedes)
    }
  }, [])

  const handleHuespedesChange = (huespedes: HuespedConRelacion[]) => {
    // Guardar automáticamente en el formData cuando cambian los huéspedes
    updateFormData({ 
      huespedes,
      // Mantener compatibilidad con código anterior (titular)
      huesped_id: null, // Se creará en confirmación
      nombres: huespedes[0]?.nombres || '',
      apellidos: huespedes[0]?.apellidos || '',
      numero_documento: huespedes[0]?.numero_documento || '',
      tipo_documento: huespedes[0]?.tipo_documento || 'DNI',
    })
  }

  const handleHuespedesSubmit = async (huespedes: HuespedConRelacion[]) => {
    // Guardar los huéspedes en el formData del wizard
    handleHuespedesChange(huespedes)
    return Promise.resolve()
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Datos de Huéspedes</h3>
        <p className="text-sm text-muted-foreground">
          Registra al huésped titular y sus acompañantes (si los hay)
        </p>
      </div>

      <HuespedesForm 
        onSubmit={handleHuespedesSubmit}
        initialData={initialHuespedes}
        showSubmitButton={false}
        onChange={handleHuespedesChange}
      />

      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
        💡 <strong>Tip:</strong> Los datos se guardarán al confirmar la reserva en el siguiente paso
      </div>
    </div>
  )
}
