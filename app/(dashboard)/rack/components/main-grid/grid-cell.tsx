'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type Props = {
  roomId: string
  day: Date
  isToday: boolean
  onReservationClick: (id: string) => void
  onCellClick: () => void
  onMouseDown?: () => void
  onMouseEnter?: () => void
  onMouseUp?: () => void
  isSelected?: boolean
  children?: ReactNode
}

export function GridCell({
  roomId,
  day,
  isToday,
  onReservationClick,
  onCellClick,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  isSelected,
  children
}: Props) {
  return (
    <div
      className={cn(
        "relative border-b border-r h-[80px] transition-colors",
        !children && "hover:bg-accent/50 cursor-pointer",
        isToday && "bg-blue-50/50 dark:bg-blue-950/10",
        isSelected && !children && "bg-primary/20"
      )}
      onClick={!children ? onCellClick : undefined}
      onMouseDown={!children ? onMouseDown : undefined}
      onMouseEnter={!children ? onMouseEnter : undefined}
      onMouseUp={!children ? onMouseUp : undefined}
    >
      {children}
    </div>
  )
}
