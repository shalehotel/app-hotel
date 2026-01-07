'use client'

import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Props = {
  days: Date[]
}

export function GridHeader({ days }: Props) {
  return (
    <>
      {/* Empty corner cell */}
      <div className="sticky left-0 z-20 border-b border-r bg-muted/50 p-2">
        <span className="text-xs font-medium text-muted-foreground">Hab</span>
      </div>

      {/* Day headers */}
      {days.map((day, index) => (
        <div
          key={index}
          className={cn(
            "border-b border-r p-2 text-center",
            isToday(day) && "bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          <div className="text-xs font-medium">
            {format(day, 'EEE', { locale: es })}
          </div>
          <div className="text-lg font-bold">
            {format(day, 'd')}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(day, 'MMM', { locale: es })}
          </div>
        </div>
      ))}
    </>
  )
}
