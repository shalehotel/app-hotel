import {
    getDashboardMetrics,
    getIngresosPorMetodoPago,
    getTendenciaIngresos,
    getResumenFacturacion
} from '@/lib/actions/dashboard'
import { DashboardClient } from '../dashboard-client'

type Props = {
    devolucionesPendientes: any[]
}

export default async function AdminDashboardContent({ devolucionesPendientes }: Props) {
    // Cargar datos del dashboard (solo para ADMIN) - Lógica movida desde page.tsx
    const [metrics, ingresosPorMetodoPago, tendencia, facturacion] = await Promise.all([
        getDashboardMetrics(),
        getIngresosPorMetodoPago(),
        getTendenciaIngresos(),
        getResumenFacturacion()
    ])

    return (
        <DashboardClient
            metrics={metrics}
            ingresosPorMetodoPago={ingresosPorMetodoPago}
            tendencia={tendencia}
            facturacion={facturacion}
            devolucionesPendientes={devolucionesPendientes}
        />
    )
}
