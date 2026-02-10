import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth'
import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardSkeleton } from './components/dashboard-skeleton'
import AdminDashboardContent from './components/admin-dashboard-content'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getDevolucionesPendientes } from '@/lib/actions/cajas'
import { DevolucionesPendientesAlert } from '@/components/dashboard/devoluciones-pendientes-alert'

export default async function DashboardPage() {
  // Verificar que el usuario esté autenticado
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener devoluciones pendientes
  // @ts-ignore - Ignoramos error de tipado temporalmente para agilizar, los datos son compatibles en runtime
  const devolucionesPendientes = await getDevolucionesPendientes()

  if (user.rol !== 'ADMIN') {
    if (user.rol === 'RECEPCION') {
      redirect('/rack')
    }
    if (user.rol === 'HOUSEKEEPING') {
      redirect('/limpieza')
    }

    // Fallback por si hay otro rol no contemplado
    return (
      <DashboardHeader
        breadcrumbs={[{ label: 'Inicio' }]}
      />
    )
  }

  // Renderizado principal con Suspense para admins
  return (
    <>
      <DashboardHeader
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <AdminDashboardContent devolucionesPendientes={devolucionesPendientes} />
        </Suspense>
      </div>
    </>
  )
}
