'use client'

import { useState, useEffect } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { RackHabitacion } from '@/lib/actions/rack'
import { StepTarifa } from './steps/step-tarifa'
import { StepHuesped } from './steps/step-huesped'
import { StepConfirmacion } from './steps/step-confirmacion'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  habitacion: RackHabitacion
  fechaInicial: Date
  fechaFinal?: Date
  onSuccess: () => void
}

type FormData = {
  // Step 1: Tarifa
  tarifa_id: string | null
  fecha_entrada: Date
  fecha_salida: Date
  precio_pactado: number
  
  // Step 2: Huésped
  huesped_id: string | null // Si existe en BD
  tipo_documento: string
  numero_documento: string
  nombres: string
  apellidos: string
  email: string
  telefono: string
  nacionalidad: string
  fecha_nacimiento: string
  
  // Step 3: Pago
  registrar_pago: boolean
  metodo_pago: string | null
  numero_operacion: string | null
  monto_pagado: number
}

export function NewReservationDialog({ 
  open, 
  onOpenChange, 
  habitacion, 
  fechaInicial,
  fechaFinal,
  onSuccess 
}: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  
  // Calcular fecha_salida: si hay fechaFinal, usar día siguiente; sino +1 día desde fechaInicial
  const calcularFechaSalida = () => {
    if (fechaFinal) {
      return new Date(fechaFinal.getTime() + 86400000) // fechaFinal + 1 día
    }
    return new Date(fechaInicial.getTime() + 86400000) // fechaInicial + 1 día
  }
  
  const [formData, setFormData] = useState<FormData>({
    tarifa_id: null,
    fecha_entrada: fechaInicial,
    fecha_salida: calcularFechaSalida(),
    precio_pactado: 0,
    
    huesped_id: null,
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    nacionalidad: 'PE',
    fecha_nacimiento: '',
    
    registrar_pago: false,
    metodo_pago: null,
    numero_operacion: null,
    monto_pagado: 0
  })

  const totalNoches = differenceInDays(formData.fecha_salida, formData.fecha_entrada)
  const totalEstimado = formData.precio_pactado * totalNoches

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleClose = () => {
    setCurrentStep(1)
    onOpenChange(false)
  }

  const canGoNext = () => {
    if (currentStep === 1) {
      return formData.tarifa_id && formData.precio_pactado > 0
    }
    if (currentStep === 2) {
      return formData.numero_documento && formData.nombres && formData.apellidos
    }
    return true
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {currentStep === 1 && 'Seleccionar Tarifa'}
            {currentStep === 2 && 'Datos del Huésped'}
            {currentStep === 3 && 'Confirmación y Pago'}
          </SheetTitle>
          <SheetDescription>
            Hab. {habitacion.numero} - {habitacion.tipos_habitacion.nombre}
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 my-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded ${
                step <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {currentStep === 1 && (
            <StepTarifa
              habitacion={habitacion}
              formData={formData}
              updateFormData={updateFormData}
              totalNoches={totalNoches}
              totalEstimado={totalEstimado}
            />
          )}

          {currentStep === 2 && (
            <StepHuesped
              formData={formData}
              updateFormData={updateFormData}
            />
          )}

          {currentStep === 3 && (
            <StepConfirmacion
              habitacion={habitacion}
              formData={formData}
              updateFormData={updateFormData}
              totalNoches={totalNoches}
              totalEstimado={totalEstimado}
              onSuccess={onSuccess}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Navigation (solo para step 1 y 2) */}
        {currentStep < 3 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
            )}

            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canGoNext()}
            >
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
