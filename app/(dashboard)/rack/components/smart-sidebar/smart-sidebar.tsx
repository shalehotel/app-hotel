'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TodayTab } from './today-tab'
import { AlertsTab } from './alerts-tab'
import { cn } from '@/lib/utils'

type Tareas = {
  checkins: any[]
  checkouts: any[]
}

type Props = {
  open: boolean
  onClose: () => void
  onReservationClick: (id: string) => void
  tareas: Tareas
}

export function SmartSidebar({ open, onClose, onReservationClick, tareas }: Props) {
  if (!open) return null

  return (
    <div className="w-80 border-l bg-background flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Tareas</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestiona check-ins, check-outs y alertas
        </p>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="space-y-4 mt-4">
            <TodayTab 
              onReservationClick={onReservationClick}
              checkins={tareas.checkins}
              checkouts={tareas.checkouts}
            />
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4 mt-4">
            <AlertsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
