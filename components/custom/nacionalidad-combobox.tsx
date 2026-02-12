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
import { PAISES, PAISES_FRECUENTES } from '@/lib/utils/nacionalidades'

interface NacionalidadComboboxProps {
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
}

export function NacionalidadCombobox({
    value = '',
    onValueChange,
    disabled = false,
}: NacionalidadComboboxProps) {
    const [open, setOpen] = React.useState(false)

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
                    {value || 'Seleccionar país...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar país..." />
                    <CommandList>
                        <CommandEmpty>No se encontró el país.</CommandEmpty>
                        
                        {/* Países frecuentes */}
                        <CommandGroup heading="Más comunes">
                            {PAISES_FRECUENTES.map((pais) => (
                                <CommandItem
                                    key={pais}
                                    value={pais}
                                    onSelect={() => {
                                        onValueChange?.(pais)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === pais ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {pais}
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {/* Todos los países */}
                        <CommandGroup heading="Todos los países">
                            {PAISES.filter(p => !PAISES_FRECUENTES.includes(p)).map((pais) => (
                                <CommandItem
                                    key={pais}
                                    value={pais}
                                    onSelect={() => {
                                        onValueChange?.(pais)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === pais ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {pais}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
