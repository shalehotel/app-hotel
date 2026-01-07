import { Suspense } from 'react'
import { RackContainer } from './rack-container'
import { Skeleton } from '@/components/ui/skeleton'

export default async function RackPage() {
  return (
    <div className="fixed inset-0 left-[var(--sidebar-width)] bg-background">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <RackContainer />
      </Suspense>
    </div>
  )
}
