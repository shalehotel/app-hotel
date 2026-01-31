
/**
 * Helper crucial para mantener consistencia "obsesivamente correcta" en toda la app.
 * Centraliza la lógica de desglose de métodos de pago y reconciliación de efectivo vs movimientos.
 */
export function calcularReconciliacionCaja(pagos: any[], estadisticas: any) {
    const desglose = {
        efectivo: 0,
        tarjeta: 0,
        billetera: 0,
        transferencia: 0,
        otros: 0
    }

    let totalPagosPositivos = 0
    let totalPagosNegativosEfectivo = 0
    let totalGeneral = 0

    if (pagos) {
        pagos.forEach(p => {
            // Normalizar todo a PEN para el desglose visual principal
            const montoEnPen = p.moneda_pago === 'USD' ? p.monto * (p.tipo_cambio_pago || 1) : p.monto
            totalGeneral += montoEnPen

            // Acumular para lógica de conciliación
            if (montoEnPen > 0) {
                totalPagosPositivos += montoEnPen
            } else if (p.metodo_pago === 'DEVOLUCION_EFECTIVO') {
                totalPagosNegativosEfectivo += Math.abs(montoEnPen)
            }

            switch (p.metodo_pago) {
                case 'EFECTIVO':
                case 'DEVOLUCION_EFECTIVO':
                    desglose.efectivo += montoEnPen;
                    break;
                case 'TARJETA':
                    desglose.tarjeta += montoEnPen;
                    break;
                case 'YAPE':
                case 'PLIN':
                case 'DEVOLUCION_YAPE':
                case 'DEVOLUCION_PLIN':
                    desglose.billetera += montoEnPen;
                    break;
                case 'TRANSFERENCIA':
                case 'DEVOLUCION_TRANSFERENCIA':
                    desglose.transferencia += montoEnPen;
                    break;
                case 'DEVOLUCION_PENDIENTE':
                    // Las devoluciones pendientes no afectan ningún método hasta que se procesen
                    desglose.otros += montoEnPen;
                    break;
                default:
                    desglose.otros += montoEnPen;
            }
        })
    }

    // A. Ingresos Manuales
    const totalIngresosCaja = estadisticas.total_ingresos_pen
    let manualIngreso = 0
    if (totalIngresosCaja > totalPagosPositivos) {
        manualIngreso = totalIngresosCaja - totalPagosPositivos
        desglose.efectivo += manualIngreso
    }

    // B. Egresos Manuales
    const totalEgresosCaja = estadisticas.total_egresos_pen
    let manualEgreso = 0
    if (totalEgresosCaja > totalPagosNegativosEfectivo) {
        manualEgreso = totalEgresosCaja - totalPagosNegativosEfectivo
        desglose.efectivo -= manualEgreso
    }

    return {
        desglose,
        totalGeneral,
        manualIngreso,
        manualEgreso,
        totalPagosPositivos,
        totalPagosNegativosEfectivo
    }
}
