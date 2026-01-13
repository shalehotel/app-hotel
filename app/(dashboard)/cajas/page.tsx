import { GestionCajasClient } from './gestion-cajas-client'
import { DashboardHeader } from '@/components/dashboard-header'

export const dynamic = 'force-dynamic'

export default function CajasPage() {
  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Gestión de Cajas' }
        ]}
      />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <GestionCajasClient />
      </div>
    </>
  )
}
