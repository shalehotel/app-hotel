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

const NACIONALIDADES = [
    'Peruana',
    'Argentina',
    'Boliviana',
    'Brasileña',
    'Chilena',
    'Colombiana',
    'Ecuatoriana',
    'Venezolana',
    'Uruguaya',
    'Paraguaya',
    'Estadounidense',
    'Canadiense',
    'Mexicana',
    'Española',
    'Francesa',
    'Alemana',
    'Italiana',
    'Británica',
    'Portuguesa',
    'Holandesa',
    'Belga',
    'Suiza',
    'Sueca',
    'Noruega',
    'Danesa',
    'Finlandesa',
    'Rusa',
    'Ucraniana',
    'Polaca',
    'Rumana',
    'Griega',
    'Turca',
    'China',
    'Japonesa',
    'Coreana',
    'India',
    'Australiana',
    'Neozelandesa',
    'Sudafricana',
    'Israelí',
    'Otra',
]

interface NacionalidadComboboxProps {
    value: string
    onValueChange: (value: string) => void
    disabled?: boolean
}

export function NacionalidadCombobox({ value, onValueChange, disabled }: NacionalidadComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value || '')

    // Sincronizar inputValue con value cuando cambia externamente
    React.useEffect(() => {
        setInputValue(value || '')
    }, [value])

    const filteredNacionalidades = NACIONALIDADES.filter((nac) =>
        nac.toLowerCase().includes(inputValue.toLowerCase())
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
                        placeholder="Buscar o escribir nacionalidad..."
                        value={inputValue}
                        onValueChange={handleInputChange}
                    />
                    <CommandList>
                        {filteredNacionalidades.length === 0 && inputValue && (
                            <CommandItem
                                value={inputValue}
                                onSelect={() => handleSelect(inputValue)}
                            >
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                Usar "{inputValue}"
                            </CommandItem>
                        )}
                        <CommandGroup>
                            {filteredNacionalidades.map((nacionalidad) => (
                                <CommandItem
                                    key={nacionalidad}
                                    value={nacionalidad}
                                    onSelect={() => handleSelect(nacionalidad)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value.toLowerCase() === nacionalidad.toLowerCase()
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        )}
                                    />
                                    {nacionalidad}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
