import { Suspense } from 'react'
import { CajasClient } from './cajas-client'
import { Skeleton } from '@/components/ui/skeleton'

export default function CajasPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Cajas</h2>
      </div>
      
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <CajasClient />
      </Suspense>
    </div>
  )
}
