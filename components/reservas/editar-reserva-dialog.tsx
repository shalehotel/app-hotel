'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2, Save } from 'lucide-react'
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'

import { updateReserva } from '@/lib/actions/reservas'
import { OcupacionReserva } from '@/lib/actions/ocupaciones'

const formSchema = z.object({
    // Reserva
    fecha_entrada: z.date({ required_error: 'La fecha de entrada es requerida' }),
    fecha_salida: z.date({ required_error: 'La fecha de salida es requerida' }),
    precio_pactado: z.coerce.number().min(0, 'El precio no puede ser negativo'),
    moneda_pactada: z.enum(['PEN', 'USD']),
    nota: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type EditarReservaDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    reserva: OcupacionReserva
    titular?: any // Mantenemos prop aunque no se use para compatibilidad
    onSuccess?: () => void
}

export function EditarReservaDialog({
    open,
    onOpenChange,
    reserva,
    onSuccess
}: EditarReservaDialogProps) {
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fecha_entrada: new Date(),
            fecha_salida: new Date(),
            precio_pactado: 0,
            moneda_pactada: 'PEN',
            nota: ''
        }
    })

    // Cargar valores al abrir
    useEffect(() => {
        if (open && reserva) {
            form.reset({
                fecha_entrada: new Date(reserva.fecha_entrada),
                fecha_salida: new Date(reserva.fecha_salida),
                precio_pactado: Number(reserva.precio_pactado),
                moneda_pactada: reserva.moneda_pactada,
                nota: '',
            })
        }
    }, [open, reserva, form])

    async function onSubmit(data: FormValues) {
        try {
            setLoading(true)

            const result = await updateReserva({
                reservaId: reserva.id,
                reserva: {
                    fecha_entrada: data.fecha_entrada,
                    fecha_salida: data.fecha_salida,
                    precio_pactado: data.precio_pactado,
                    moneda_pactada: data.moneda_pactada,
                    nota: data.nota
                }
                // No enviamos titular
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="fecha_entrada"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Entrada</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: es })
                                                        ) : (
                                                            <span>Seleccione fecha</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha_salida"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Salida</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: es })
                                                        ) : (
                                                            <span>Seleccione fecha</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="precio_pactado"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio Pactado</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="moneda_pactada"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Moneda</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Moneda" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                                <SelectItem value="USD">Dólares (USD)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
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
