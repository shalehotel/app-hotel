'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Search, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

import { agregarAcompananteReserva } from '@/lib/actions/huespedes'
import { consultarDocumento } from '@/lib/actions/consulta-documento'
import { NacionalidadCombobox } from '@/components/custom/nacionalidad-combobox'
import { DepartamentoCombobox } from '@/components/custom/departamento-combobox'

const formSchema = z.object({
    nombres: z.string().min(1, 'El nombre es requerido'),
    apellidos: z.string().min(1, 'Los apellidos son requeridos'),
    tipo_documento: z.enum(['DNI', 'RUC', 'PASAPORTE', 'CE', 'DOC_EXTRANJERO', 'SIN_RUC', 'OTRO']),
    numero_documento: z.string().min(1, 'El número de documento es requerido'),
    pais: z.string().min(1, 'El país es requerido'),
    procedencia_ciudad: z.string().min(1, 'La ciudad es requerida'),
    procedencia_departamento: z.string().min(1, 'El departamento es requerido'),
    correo: z.string().email('Correo inválido').optional().or(z.literal('')),
    telefono: z.string().optional(),
    fecha_nacimiento: z.string().optional(),
    sexo: z.enum(['M', 'F']).optional(),
    notas_internas: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type AgregarAcompananteDialogProps = {
    reservaId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AgregarAcompananteDialog({
    reservaId,
    open,
    onOpenChange,
    onSuccess
}: AgregarAcompananteDialogProps) {
    const [loading, setLoading] = useState(false)
    const [buscando, setBuscando] = useState(false)
    const [esExistente, setEsExistente] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombres: '',
            apellidos: '',
            tipo_documento: 'DNI',
            numero_documento: '',
            pais: 'Perú',
            procedencia_ciudad: '',
            procedencia_departamento: '',
            correo: '',
            telefono: '',
            fecha_nacimiento: '',
            sexo: undefined,
            notas_internas: ''
        }
    })

    useEffect(() => {
        if (open) {
            form.reset()
            setEsExistente(false)
        }
    }, [open, form])

    const buscarDatosReniec = async () => {
        const tipoDoc = form.getValues('tipo_documento')
        const numDoc = form.getValues('numero_documento')

        if (tipoDoc !== 'DNI' || numDoc.length !== 8) return

        setBuscando(true)
        setEsExistente(false)

        try {
            const result = await consultarDocumento('DNI', numDoc)

            if (result.success && result.data) {
                const data = result.data
                if (data.nombres) form.setValue('nombres', data.nombres)
                if (data.apellidos) form.setValue('apellidos', data.apellidos)

                if (data.huesped_existente) {
                    setEsExistente(true)
                    const h = data.huesped_existente
                    if (h.pais) form.setValue('pais', h.pais)
                    if (h.procedencia_departamento) form.setValue('procedencia_departamento', h.procedencia_departamento)
                    if (h.procedencia_ciudad) form.setValue('procedencia_ciudad', h.procedencia_ciudad)
                    if (h.correo) form.setValue('correo', h.correo)
                    if (h.telefono) form.setValue('telefono', h.telefono)
                    if (h.fecha_nacimiento) form.setValue('fecha_nacimiento', h.fecha_nacimiento)
                    if (h.sexo) form.setValue('sexo', h.sexo as 'M' | 'F')
                    if (h.notas_internas) form.setValue('notas_internas', h.notas_internas)
                }
                toast.success('Datos encontrados exitosamente')
            } else {
                toast.error(result.error || 'No se encontraron datos en RENIEC ni en el Historial')
            }
        } catch (error) {
            toast.error('Error de conexión al consultar documento')
        } finally {
            setBuscando(false)
        }
    }

    async function onSubmit(data: FormValues) {
        try {
            setLoading(true)

            const result = await agregarAcompananteReserva(reservaId, {
                ...data,
                es_titular: false
            })

            if (result.success) {
                toast.success('Acompañante agregado correctamente')
                onSuccess?.()
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Error al agregar acompañante')
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado al guardar')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar Acompañante</DialogTitle>
                    <DialogDescription>
                        Ingrese los datos del nuevo huésped. Si ingresa un DNI, los datos de RENIEC se autocompletarán.
                    </DialogDescription>
                </DialogHeader>

                {esExistente && (
                    <Badge variant="secondary" className="w-max mb-2">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Huésped encontrado en el historial del hotel
                    </Badge>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_documento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo Doc.</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="DNI">DNI</SelectItem>
                                                <SelectItem value="RUC">RUC</SelectItem>
                                                <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                                <SelectItem value="CE">Carnet Ext.</SelectItem>
                                                <SelectItem value="DOC_EXTRANJERO">Doc. Extranjero</SelectItem>
                                                <SelectItem value="SIN_RUC">Sin RUC</SelectItem>
                                                <SelectItem value="OTRO">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="numero_documento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número Doc.</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    onBlur={buscarDatosReniec}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            buscarDatosReniec()
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            {form.watch('tipo_documento') === 'DNI' && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={buscarDatosReniec}
                                                    disabled={buscando || field.value.length !== 8}
                                                >
                                                    {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nombres"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombres</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="apellidos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellidos</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="pais"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>País</FormLabel>
                                        <FormControl>
                                            <NacionalidadCombobox
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sexo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sexo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="M">Masculino</SelectItem>
                                                <SelectItem value="F">Femenino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="procedencia_departamento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento (Origen)</FormLabel>
                                        <FormControl>
                                            <DepartamentoCombobox
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="procedencia_ciudad"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ciudad (Origen)</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="fecha_nacimiento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Nac.</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="telefono"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="correo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notas_internas"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas / Parentesco</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="P.ej: Padre del titular, menor de edad..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Agregar Acompañante'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
