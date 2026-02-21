'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Save, DoorOpen, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
// Popover retirado
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

import {
    updateReserva,
    getHabitacionesDisponiblesParaEdicion,
    type HabitacionParaEdicion
} from '@/lib/actions/reservas'
import { OcupacionReserva } from '@/lib/actions/ocupaciones'

const formSchema = z.object({
    habitacion_id: z.string().min(1, 'Selecciona una habitación'),
    fecha_entrada: z.date(),
    fecha_salida: z.date(),
    precio_pactado: z.string().min(1),
    moneda_pactada: z.enum(['PEN', 'USD']),
    nota: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type EditarReservaDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    reserva: OcupacionReserva
    titular?: any
    onSuccess?: () => void
}

export function EditarReservaDialog({
    open,
    onOpenChange,
    reserva,
    onSuccess
}: EditarReservaDialogProps) {
    const [loading, setLoading] = useState(false)
    const [habitaciones, setHabitaciones] = useState<HabitacionParaEdicion[]>([])
    const [loadingHabitaciones, setLoadingHabitaciones] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            habitacion_id: '',
            fecha_entrada: new Date(),
            fecha_salida: new Date(),
            precio_pactado: '0',
            moneda_pactada: 'PEN',
            nota: ''
        }
    })

    const habitacionIdSeleccionada = form.watch('habitacion_id')
    const habitacionCambiada =
        habitacionIdSeleccionada &&
        habitacionIdSeleccionada !== reserva.habitacion_id

    // Un solo useEffect: carga habitaciones PRIMERO, luego hace reset del formulario en serie
    useEffect(() => {
        if (!open || !reserva) return

        setLoadingHabitaciones(true)

        getHabitacionesDisponiblesParaEdicion(
            reserva.id,
            reserva.fecha_entrada,
            reserva.fecha_salida
        ).then((habs) => {
            setHabitaciones(habs)
            form.reset({
                habitacion_id: reserva.habitacion_id || '',
                fecha_entrada: new Date(reserva.fecha_entrada),
                fecha_salida: new Date(reserva.fecha_salida),
                precio_pactado: String(Number(reserva.precio_pactado)),
                moneda_pactada: reserva.moneda_pactada,
                nota: '',
            })
        }).catch(() => {
            toast.error('Error al cargar las habitaciones disponibles')
        }).finally(() => {
            setLoadingHabitaciones(false)
        })
    }, [open, reserva?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    async function onSubmit(data: FormValues) {
        try {
            setLoading(true)

            const result = await updateReserva({
                reservaId: reserva.id,
                reserva: {
                    habitacion_id: data.habitacion_id,
                    fecha_entrada: data.fecha_entrada,
                    fecha_salida: data.fecha_salida,
                    precio_pactado: parseFloat(data.precio_pactado),
                    moneda_pactada: data.moneda_pactada,
                    nota: data.nota
                }
            })

            if (result.success) {
                toast.success('Reserva actualizada correctamente')
                onSuccess?.()
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Error al actualizar reserva')
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const habitacionActual = habitaciones.find(h => h.id === reserva.habitacion_id)
    const habitacionNueva = habitaciones.find(h => h.id === habitacionIdSeleccionada)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Reserva</DialogTitle>
                    <DialogDescription>
                        Modifique los detalles del contrato de la reserva.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* CAMPO: Habitación */}
                        <FormField
                            control={form.control as any}
                            name="habitacion_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <DoorOpen className="h-3.5 w-3.5" />
                                        Habitación
                                    </FormLabel>
                                    {loadingHabitaciones ? (
                                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cargando habitaciones...
                                        </div>
                                    ) : (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una habitación" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent position="popper" className="z-[200]">
                                                {habitaciones.map(h => (
                                                    <SelectItem
                                                        key={h.id}
                                                        value={h.id}
                                                        disabled={!h.disponible && h.id !== reserva.habitacion_id}
                                                    >
                                                        <span className="font-mono font-semibold mr-2">
                                                            {h.numero}
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">
                                                            Piso {h.piso} · {h.categoria_nombre}
                                                        </span>
                                                        {h.id === reserva.habitacion_id && (
                                                            <span className="text-xs text-muted-foreground ml-1">(actual)</span>
                                                        )}
                                                        {!h.disponible && h.id !== reserva.habitacion_id && (
                                                            <span className="text-xs text-destructive ml-1">(ocupada)</span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <FormMessage />
                                    {habitacionCambiada && habitacionNueva && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                            Se cambiará: hab.&nbsp;
                                            <span className="font-mono font-semibold">
                                                {habitacionActual?.numero ?? reserva.habitacion_numero}
                                            </span>
                                            &nbsp;→&nbsp;
                                            <span className="font-mono font-semibold">
                                                {habitacionNueva.numero}
                                            </span>
                                            {reserva.estado === 'CHECKED_IN' && (
                                                <Badge variant="outline" className="border-amber-400 text-amber-600 text-[10px]">
                                                    Huésped en casa
                                                </Badge>
                                            )}
                                        </p>
                                    )}
                                </FormItem>
                            )}
                        />

                        {/* Fechas gestionadas desde el Rack, enviadas como valor previo */}
                        {/* Precio y Moneda */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="precio_pactado"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio Pactado</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="moneda_pactada"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Moneda</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Moneda" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="z-[200]">
                                                <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                                <SelectItem value="USD">Dólares (USD)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Nota */}
                        <FormField
                            control={form.control as any}
                            name="nota"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nota de Reserva</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Información adicional sobre la reserva..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading || loadingHabitaciones}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
