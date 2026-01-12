import { DashboardHeader } from '@/components/dashboard-header'
import { ConfiguracionGeneralForm } from './configuracion-general-form'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { Separator } from '@/components/ui/separator'

export default async function ConfiguracionPage() {
  const config = await getHotelConfig()

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuración' }
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Configura los datos generales del hotel y horarios
          </p>
        </div>

        <Separator />

        <ConfiguracionGeneralForm initialData={config} />
      </div>
    </>
  )
}
