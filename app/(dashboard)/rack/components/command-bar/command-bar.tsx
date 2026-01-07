'use client'

import { Search, Plus, PanelRight, LayoutGrid, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiChips } from './kpi-chips'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { RackKPIs } from '@/lib/actions/rack'

type Props = {
  onToggleSidebar: () => void
  kpis: RackKPIs
  viewMode: 'rack' | 'cards'
  onViewModeChange: (mode: 'rack' | 'cards') => void
}

export function CommandBar({ onToggleSidebar, kpis, viewMode, onViewModeChange }: Props) {
  return (
    <div className="border-b bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        {/* Left side: Logo + Search */}
        <div className="flex items-center gap-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Rack</h1>
          </div>

          {/* Omnibox - Buscador Global */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar huésped, reserva o habitación..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Right side: KPIs + Actions */}
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as 'rack' | 'cards')}>
            <ToggleGroupItem value="rack" aria-label="Vista Rack" size="sm">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Vista Tarjetas" size="sm">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* KPI Chips */}
          <KpiChips kpis={kpis} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleSidebar}>
              <PanelRight className="h-4 w-4" />
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
