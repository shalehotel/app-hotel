import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getUser } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUser()

    if (!user) {
        redirect('/login')
    }

    // Serializar solo los campos necesarios
    const userData = {
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
    }

    return (
        <SidebarProvider>
            <AppSidebar user={userData} />
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}
