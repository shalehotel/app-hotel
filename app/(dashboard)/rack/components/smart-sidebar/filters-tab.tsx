import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilterX } from 'lucide-react'
import type { RackHabitacion } from '@/lib/actions/rack'

export type FilterState = {
  tipoId: string
  categoriaId: string
  estadoLimpieza: string
  estadoOcupacion: string
  estadoServicio: string
}

export const initialFilters: FilterState = {
  tipoId: 'all',
  categoriaId: 'all',
  estadoLimpieza: 'all',
  estadoOcupacion: 'all',
  estadoServicio: 'all'
}

type Props = {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  habitaciones: RackHabitacion[]
}

export function FiltersTab({ filters, onFilterChange, habitaciones }: Props) {
  // Extraer opciones únicas
  const tipos = Array.from(new Set(habitaciones.map(h => JSON.stringify({ id: h.tipo_id, nombre: h.tipos_habitacion.nombre }))))
    .map(s => JSON.parse(s))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const categorias = Array.from(new Set(habitaciones.map(h => JSON.stringify({ id: h.categoria_id, nombre: h.categorias_habitacion.nombre }))))
    .map(s => JSON.parse(s))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const handleReset = () => {
    onFilterChange(initialFilters)
  }

  const updateFilter = (key: keyof FilterState, value: string) => {
    // ToggleGroup returns undefined if unselected (when clicking active item), treat as 'all' or keep current logic
    if (!value) return 
    onFilterChange({ ...filters, [key]: value })
  }

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length

  return (
    <div className="space-y-5">
      {/* Header Minimalista */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Filtros Activos</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px] font-medium">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset} 
            className="h-7 px-2 text-xs"
          >
            <FilterX className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Estado de Ocupación - Toggle Group */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ocupación</Label>
          <ToggleGroup 
            type="single" 
            value={filters.estadoOcupacion} 
            onValueChange={(v) => v && updateFilter('estadoOcupacion', v)}
            className="justify-start w-full"
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all" className="flex-1">Todas</ToggleGroupItem>
            <ToggleGroupItem value="LIBRE" className="flex-1 data-[state=on]:bg-green-100 data-[state=on]:text-green-700 data-[state=on]:border-green-200 dark:data-[state=on]:bg-green-900/20 dark:data-[state=on]:text-green-400">Libres</ToggleGroupItem>
            <ToggleGroupItem value="OCUPADA" className="flex-1 data-[state=on]:bg-red-100 data-[state=on]:text-red-700 data-[state=on]:border-red-200 dark:data-[state=on]:bg-red-900/20 dark:data-[state=on]:text-red-400">Ocupadas</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Estado de Limpieza - Grid Vertical */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Limpieza</Label>
          <ToggleGroup 
            type="single" 
            value={filters.estadoLimpieza} 
            onValueChange={(v) => v && updateFilter('estadoLimpieza', v)}
            className="grid grid-cols-2 gap-2 w-full"
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all" className="w-full">Todas</ToggleGroupItem>
            <ToggleGroupItem value="LIMPIA" className="w-full data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-200 dark:data-[state=on]:bg-blue-900/20 dark:data-[state=on]:text-blue-400">Limpias</ToggleGroupItem>
            <ToggleGroupItem value="SUCIA" className="w-full data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200 dark:data-[state=on]:bg-amber-900/20 dark:data-[state=on]:text-amber-400">Sucias</ToggleGroupItem>
            <ToggleGroupItem value="EN_LIMPIEZA" className="w-full data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-700 data-[state=on]:border-indigo-200 dark:data-[state=on]:bg-indigo-900/20 dark:data-[state=on]:text-indigo-400">Limpiando</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator className="my-1" />

        {/* Selects Grid */}
        <div className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tipo</Label>
            <Select value={filters.tipoId} onValueChange={(v) => updateFilter('tipoId', v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {tipos.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Categoría</Label>
            <Select value={filters.categoriaId} onValueChange={(v) => updateFilter('categoriaId', v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado Servicio */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estado Servicio</Label>
            <Select value={filters.estadoServicio} onValueChange={(v) => updateFilter('estadoServicio', v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OPERATIVA">Operativa</SelectItem>
                <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                <SelectItem value="FUERA_SERVICIO">Fuera de Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
