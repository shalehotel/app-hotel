'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const DEPARTAMENTOS_PERU = [
    'Amazonas',
    'Áncash',
    'Apurímac',
    'Arequipa',
    'Ayacucho',
    'Cajamarca',
    'Callao',
    'Cusco',
    'Huancavelica',
    'Huánuco',
    'Ica',
    'Junín',
    'La Libertad',
    'Lambayeque',
    'Lima',
    'Loreto',
    'Madre de Dios',
    'Moquegua',
    'Pasco',
    'Piura',
    'Puno',
    'San Martín',
    'Tacna',
    'Tumbes',
    'Ucayali',
    'Extranjero',
]

interface DepartamentoComboboxProps {
    value: string
    onValueChange: (value: string) => void
    disabled?: boolean
}

export function DepartamentoCombobox({ value, onValueChange, disabled }: DepartamentoComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value || '')

    // Sincronizar inputValue con value cuando cambia externamente
    React.useEffect(() => {
        setInputValue(value || '')
    }, [value])

    const filteredDepartamentos = DEPARTAMENTOS_PERU.filter((dpto) =>
        dpto.toLowerCase().includes(inputValue.toLowerCase())
    )

    const handleInputChange = (newValue: string) => {
        setInputValue(newValue)
        // Actualizar el valor en tiempo real para permitir valores personalizados
        onValueChange(newValue)
    }

    const handleSelect = (selectedValue: string) => {
        onValueChange(selectedValue)
        setInputValue(selectedValue)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {value || 'Selecciona o escribe...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar o escribir departamento..."
                        value={inputValue}
                        onValueChange={handleInputChange}
                    />
                    <CommandList>
                        {filteredDepartamentos.length === 0 && inputValue && (
                            <CommandItem
                                value={inputValue}
                                onSelect={() => handleSelect(inputValue)}
                            >
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                Usar "{inputValue}"
                            </CommandItem>
                        )}
                        <CommandGroup>
                            {filteredDepartamentos.map((departamento) => (
                                <CommandItem
                                    key={departamento}
                                    value={departamento}
                                    onSelect={() => handleSelect(departamento)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value.toLowerCase() === departamento.toLowerCase()
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        )}
                                    />
                                    {departamento}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
