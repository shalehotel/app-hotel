'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, User, Users, Search, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { HuespedConRelacion } from '@/lib/actions/huespedes'
import { NacionalidadCombobox } from '@/components/custom/nacionalidad-combobox'
import { DepartamentoCombobox } from '@/components/custom/departamento-combobox'
import { consultarDocumento } from '@/lib/actions/consulta-documento'
import { generateUUID } from '@/lib/utils/random'
import { getDocumentError } from '@/lib/utils/validation'

interface HuespedFormData {
  id: string // ID temporal para el formulario
  huesped_bd_id?: string // ID real en la BD si existe
  nombres: string
  apellidos: string
  tipo_documento: 'DNI' | 'RUC' | 'PASAPORTE' | 'CE' | 'DOC_EXTRANJERO' | 'SIN_RUC' | 'OTRO'
  numero_documento: string
  pais: string
  procedencia_departamento: string
  procedencia_ciudad: string
  correo: string
  telefono: string
  fecha_nacimiento: string
  sexo: 'M' | 'F' | ''
  notas: string // Para parentesco o notas internas
  es_titular: boolean
  es_existente: boolean // Flag para saber si viene de la BD
}

interface Props {
  onSubmit: (huespedes: HuespedConRelacion[]) => Promise<void>
  initialData?: HuespedFormData[]
  submitButtonText?: string
  showSubmitButton?: boolean
  onChange?: (huespedes: HuespedConRelacion[]) => void
}

const TIPOS_DOCUMENTO = [
  { value: 'DNI', label: 'DNI' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CE', label: 'Carnet de Extranjería' },
  { value: 'DOC_EXTRANJERO', label: 'Doc. Extranjero' },
  { value: 'SIN_RUC', label: 'Sin RUC' },
  { value: 'OTRO', label: 'Otro' },
]

export function HuespedesForm({ onSubmit, initialData, submitButtonText = 'Guardar Huéspedes', showSubmitButton = true, onChange }: Props) {
  const [huespedes, setHuespedes] = useState<HuespedFormData[]>(
    initialData || [
      {
        id: generateUUID(),
        nombres: '',
        apellidos: '',
        tipo_documento: 'DNI',
        numero_documento: '',
        pais: 'Perú',
        procedencia_departamento: '',
        procedencia_ciudad: '',
        correo: '',
        telefono: '',
        fecha_nacimiento: '',
        sexo: '',
        notas: '',
        es_titular: true,
        es_existente: false,
      },
    ]
  )

  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState<Record<string, boolean>>({})
  const [erroresApi, setErroresApi] = useState<Record<string, string>>({})

  // Función para buscar datos vía APISPerú + BD local
  const buscarDocumento = useCallback(async (huespedId: string, tipoDoc: string, numDoc: string) => {
    if (!numDoc) return

    // Solo consultar API para DNI (8 dígitos)
    if (tipoDoc === 'DNI' && numDoc.length !== 8) return
    // Para otros tipos, ignorar API
    if (tipoDoc !== 'DNI') return

    setBuscando(prev => ({ ...prev, [huespedId]: true }))
    setErroresApi(prev => ({ ...prev, [huespedId]: '' }))

    try {
      const result = await consultarDocumento('DNI', numDoc)

      if (result.success && result.data) {
        const data = result.data
        setHuespedes(prev => prev.map(h => {
          if (h.id === huespedId) {
            const updated = { ...h }

            // Datos de APISPerú (RENIEC)
            if (data.nombres) updated.nombres = data.nombres
            if (data.apellidos) updated.apellidos = data.apellidos

            // Datos complementarios de BD local
            if (data.huesped_existente) {
              updated.huesped_bd_id = data.huesped_existente.id
              updated.es_existente = true
              if (data.huesped_existente.pais) updated.pais = data.huesped_existente.pais
              if (data.huesped_existente.procedencia_departamento) updated.procedencia_departamento = data.huesped_existente.procedencia_departamento
              if (data.huesped_existente.procedencia_ciudad) updated.procedencia_ciudad = data.huesped_existente.procedencia_ciudad
              if (data.huesped_existente.correo) updated.correo = data.huesped_existente.correo
              if (data.huesped_existente.telefono) updated.telefono = data.huesped_existente.telefono
              if (data.huesped_existente.fecha_nacimiento) updated.fecha_nacimiento = data.huesped_existente.fecha_nacimiento
              if (data.huesped_existente.sexo) updated.sexo = data.huesped_existente.sexo as 'M' | 'F'
              if (data.huesped_existente.notas_internas) updated.notas = data.huesped_existente.notas_internas
            }

            toast.success(`Datos encontrados: ${updated.nombres} ${updated.apellidos}`)
            return updated
          }
          return h
        }))
      } else {
        setErroresApi(prev => ({ ...prev, [huespedId]: result.error || 'No se encontraron datos' }))
        // Limpiar flag de existente
        setHuespedes(prev => prev.map(h => {
          if (h.id === huespedId) {
            return { ...h, huesped_bd_id: undefined, es_existente: false }
          }
          return h
        }))
      }
    } catch (error) {
      console.error('Error consultando documento:', error)
      setErroresApi(prev => ({ ...prev, [huespedId]: 'Error de conexión' }))
    } finally {
      setBuscando(prev => ({ ...prev, [huespedId]: false }))
    }
  }, [])

  const agregarAcompanante = () => {
    setHuespedes([
      ...huespedes,
      {
        id: generateUUID(),
        nombres: '',
        apellidos: '',
        tipo_documento: 'DNI',
        numero_documento: '',
        pais: 'Perú',
        procedencia_departamento: '',
        procedencia_ciudad: '',
        correo: '',
        telefono: '',
        fecha_nacimiento: '',
        sexo: '',
        notas: '',
        es_titular: false,
        es_existente: false,
      },
    ])
  }

  const eliminarHuesped = (id: string) => {
    if (huespedes.length === 1) {
      toast.error('Debe haber al menos un huésped')
      return
    }

    const huespedAEliminar = huespedes.find((h) => h.id === id)
    if (huespedAEliminar?.es_titular) {
      toast.error('No puedes eliminar al huésped titular')
      return
    }

    setHuespedes(huespedes.filter((h) => h.id !== id))
  }

  const actualizarHuesped = (id: string, field: keyof HuespedFormData, value: any) => {
    const updatedHuespedes = huespedes.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    setHuespedes(updatedHuespedes)

    // Notificar cambios al padre si está en modo onChange
    if (onChange) {
      const huespedConRelacion = updatedHuespedes.map(h => ({
        ...h,
        sexo: h.sexo === '' ? null : h.sexo,
        huesped_id: null
      }))
      onChange(huespedConRelacion as any)
    }
  }

  const validarFormulario = (): boolean => {
    for (const h of huespedes) {
      const label = h.es_titular ? 'Titular' : 'Acompañante'
      if (!h.nombres.trim()) {
        toast.error(`${label}: Nombres es obligatorio`)
        return false
      }
      if (!h.apellidos.trim()) {
        toast.error(`${label}: Apellidos es obligatorio`)
        return false
      }
      if (!h.numero_documento.trim()) {
        toast.error(`${label}: Número de documento es obligatorio`)
        return false
      }
      if (!h.sexo) {
        toast.error(`${label}: Sexo es obligatorio`)
        return false
      }
      if (!h.pais.trim()) {
        toast.error(`${label}: País es obligatorio`)
        return false
      }
      if (!h.procedencia_departamento.trim()) {
        toast.error(`${label}: Departamento es obligatorio`)
        return false
      }
      if (!h.procedencia_ciudad.trim()) {
        toast.error(`${label}: Ciudad es obligatorio`)
        return false
      }
      // fecha_nacimiento es opcional — no requerido por MINCETUR
    }

    // Validar documentos únicos y formato
    const documentos = huespedes.map((h) => h.numero_documento)
    const duplicados = documentos.filter((d, i) => documentos.indexOf(d) !== i)
    if (duplicados.length > 0) {
      toast.error('No puede haber documentos duplicados')
      return false
    }

    // Validar formato de documentos
    for (const h of huespedes) {
      const docError = getDocumentError(h.tipo_documento, h.numero_documento)
      if (docError) {
        toast.error(`Error en ${h.es_titular ? 'Titular' : 'Acompañante'}: ${docError}`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validarFormulario()) return

    setLoading(true)
    try {
      const huespedesData: HuespedConRelacion[] = huespedes.map((h) => ({
        nombres: h.nombres,
        apellidos: h.apellidos,
        // @ts-ignore - Temporary bypass for type matching
        tipo_documento: h.tipo_documento,
        numero_documento: h.numero_documento,
        pais: h.pais,
        procedencia_departamento: h.procedencia_departamento || null,
        procedencia_ciudad: h.procedencia_ciudad || null,
        correo: h.correo || null,
        telefono: h.telefono || null,
        fecha_nacimiento: h.fecha_nacimiento || null,
        notas_internas: h.notas || null,
        es_titular: h.es_titular,
      }))

      await onSubmit(huespedesData)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar huéspedes')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // RENDER DE UN BLOQUE DE HUÉSPED (Titular o Acompañante)
  // =====================================================
  const renderHuespedFields = (huesped: HuespedFormData, labelPrefix: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ===== FILA 1: TIPO DOCUMENTO + NÚMERO DOCUMENTO (PRIMERA FILA) ===== */}
      <div>
        <Label>Tipo Documento</Label>
        <Select
          value={huesped.tipo_documento}
          onValueChange={(value) =>
            actualizarHuesped(huesped.id, 'tipo_documento', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          Número Documento <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            value={huesped.numero_documento}
            onChange={(e) => {
              actualizarHuesped(huesped.id, 'numero_documento', e.target.value)
              // Limpiar error al escribir
              if (erroresApi[huesped.id]) {
                setErroresApi(prev => ({ ...prev, [huesped.id]: '' }))
              }
            }}
            onBlur={() => buscarDocumento(huesped.id, huesped.tipo_documento, huesped.numero_documento)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                buscarDocumento(huesped.id, huesped.tipo_documento, huesped.numero_documento)
              }
            }}
            placeholder={huesped.tipo_documento === 'DNI' ? 'Ingrese 8 dígitos y presione Tab' : 'Número de documento'}
            required
            className={`pr-10 ${getDocumentError(huesped.tipo_documento, huesped.numero_documento) || erroresApi[huesped.id] ? 'border-red-500' : ''}`}
          />
          {buscando[huesped.id] && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" />
          )}
          {!buscando[huesped.id] && huesped.es_existente && (
            <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
          )}
          {!buscando[huesped.id] && erroresApi[huesped.id] && (
            <AlertTriangle className="absolute right-3 top-2.5 h-4 w-4 text-amber-500" />
          )}
        </div>
        {getDocumentError(huesped.tipo_documento, huesped.numero_documento) && (
          <p className="text-[10px] text-red-500 font-medium mt-1">
            {getDocumentError(huesped.tipo_documento, huesped.numero_documento)}
          </p>
        )}
        {erroresApi[huesped.id] && (
          <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {erroresApi[huesped.id]}
          </p>
        )}
        {huesped.es_existente && (
          <Badge variant="secondary" className="mt-1 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Huésped registrado
          </Badge>
        )}
      </div>

      {/* ===== FILA 2: NOMBRES + APELLIDOS ===== */}
      <div>
        <Label>
          Nombres <span className="text-red-500">*</span>
        </Label>
        <Input
          value={huesped.nombres}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'nombres', e.target.value)
          }
          placeholder="Nombres del huésped"
          required
        />
      </div>

      <div>
        <Label>
          Apellidos <span className="text-red-500">*</span>
        </Label>
        <Input
          value={huesped.apellidos}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'apellidos', e.target.value)
          }
          placeholder="Apellidos del huésped"
          required
        />
      </div>

      {/* ===== FILA 3: SEXO + FECHA NACIMIENTO ===== */}
      <div>
        <Label>
          Sexo (MINCETUR) <span className="text-red-500">*</span>
        </Label>
        <Select
          value={huesped.sexo}
          onValueChange={(value) =>
            actualizarHuesped(huesped.id, 'sexo', value)
          }
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="M">Masculino</SelectItem>
            <SelectItem value="F">Femenino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          Fecha Nacimiento <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={huesped.fecha_nacimiento}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'fecha_nacimiento', e.target.value)
          }
          required
        />
      </div>

      {/* ===== FILA 4: PAÍS + DEPARTAMENTO ===== */}
      <div>
        <Label>
          País <span className="text-red-500">*</span>
        </Label>
        <NacionalidadCombobox
          value={huesped.pais}
          onValueChange={(value) =>
            actualizarHuesped(huesped.id, 'pais', value)
          }
        />
      </div>

      <div>
        <Label>
          Departamento <span className="text-red-500">*</span>
        </Label>
        <DepartamentoCombobox
          value={huesped.procedencia_departamento}
          onValueChange={(value) =>
            actualizarHuesped(huesped.id, 'procedencia_departamento', value)
          }
        />
      </div>

      {/* ===== FILA 5: CIUDAD + CORREO ===== */}
      <div>
        <Label>
          Ciudad <span className="text-red-500">*</span>
        </Label>
        <Input
          value={huesped.procedencia_ciudad}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'procedencia_ciudad', e.target.value)
          }
          placeholder="Lima, Chachapoyas, etc."
          required
        />
      </div>

      <div>
        <Label>Correo</Label>
        <Input
          type="email"
          value={huesped.correo}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'correo', e.target.value)
          }
        />
      </div>

      {/* ===== FILA 6: TELÉFONO + NOTAS ===== */}
      <div>
        <Label>Teléfono</Label>
        <Input
          type="tel"
          value={huesped.telefono}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'telefono', e.target.value)
          }
        />
      </div>

      <div>
        <Label>
          Notas / Parentesco
        </Label>
        <Input
          value={huesped.notas}
          onChange={(e) =>
            actualizarHuesped(huesped.id, 'notas', e.target.value)
          }
          placeholder="Parentesco con menor, autorización..."
        />
      </div>
    </div>
  )

  const titular = huespedes.find((h) => h.es_titular)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HUÉSPED TITULAR */}
      {titular && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <div>
                <CardTitle>Huésped Titular</CardTitle>
                <CardDescription>Persona responsable de la reserva</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderHuespedFields(titular, 'titular')}
          </CardContent>
        </Card>
      )}

      {/* ACOMPAÑANTES */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <div>
                <CardTitle>Acompañantes</CardTitle>
                <CardDescription>
                  {huespedes.length - 1} acompañante(s) registrado(s)
                </CardDescription>
              </div>
            </div>
            <Button type="button" onClick={agregarAcompanante} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Acompañante
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
          {huespedes
            .filter((h) => !h.es_titular)
            .map((acomp, index) => (
              <div key={acomp.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Acompañante {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarHuesped(acomp.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                {renderHuespedFields(acomp, `acomp-${index}`)}
              </div>
            ))}

          {huespedes.filter((h) => !h.es_titular).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay acompañantes registrados</p>
              <p className="text-sm">Haz clic en &quot;Agregar Acompañante&quot; para añadir</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOTÓN GUARDAR */}
      {showSubmitButton && (
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Procesando...' : submitButtonText}
          </Button>
        </div>
      )}
    </form>
  )
}
