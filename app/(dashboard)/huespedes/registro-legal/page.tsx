import { RegistroLegalClient } from './registro-legal-client'
import { DashboardHeader } from '@/components/dashboard-header'

export const metadata = {
    title: 'Libro de Huéspedes | App Hotel',
    description: 'Generación de Registro de Huéspedes Legalizado',
}

export default function RegistroLegalPage() {
    return (
        <>
            <DashboardHeader
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Huéspedes', href: '/huespedes' },
                    { label: 'Libro Legal' }
                ]}
            />
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <RegistroLegalClient />
            </div>
        </>
    )
}
