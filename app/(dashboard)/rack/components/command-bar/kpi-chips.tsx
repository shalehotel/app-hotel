'use client'

import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { RackKPIs } from '@/lib/actions/rack'

type Props = {
  kpis: RackKPIs
}

export function KpiChips({ kpis }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className="gap-1 cursor-pointer hover:bg-secondary/80"
      >
        <ArrowDown className="h-3 w-3" />
        Llegadas: {kpis.llegadas}
      </Badge>
      
      <Badge 
        variant="secondary" 
        className="gap-1 cursor-pointer hover:bg-secondary/80"
      >
        <ArrowUp className="h-3 w-3" />
        Salidas: {kpis.salidas}
      </Badge>
      
      <Badge 
        variant="secondary" 
        className="gap-1 cursor-pointer hover:bg-secondary/80"
      >
        <Trash2 className="h-3 w-3" />
        Sucias: {kpis.sucias}
      </Badge>
    </div>
  )
}
