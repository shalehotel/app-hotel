
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks GLOBALES antes de cualquier import
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    headers: vi.fn()
}))
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}))

// Mock de Supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockLimit = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: () => ({
        rpc: mockRpc,
        from: mockFrom.mockReturnValue({
            select: mockSelect.mockReturnValue({
                eq: mockEq.mockReturnValue({
                    single: mockSingle,
                    maybeSingle: mockMaybeSingle,
                    limit: mockLimit.mockReturnValue({
                        maybeSingle: mockMaybeSingle
                    }),
                    order: vi.fn().mockReturnThis()
                })
            }),
            update: mockUpdate,
            insert: mockInsert
        })
    })
}))

// Importar después de los mocks
import { acortarEstadia } from '@/lib/actions/estadias'
import { calcularReconciliacionCaja } from '@/lib/utils/finanzas'

// Mock de otras acciones
vi.mock('@/lib/actions/estadias', async (importOriginal) => {
    const actual = await importOriginal() as any
    return {
        ...actual,
        calcularResumenCambio: vi.fn().mockResolvedValue({
            success: true,
            resumen: {
                diferenciaDias: -1,
                diferenciaMonto: -100, // Devolución de 100
                requiereNotaCredito: false // Simulamos caso simple sin NC por ahora
            }
        })
    }
})

describe('Sistema de Devoluciones Refactorizado', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('acortarEstadia (Uso de RPC)', () => {
        it('debe llamar al RPC procesar_devolucion_atomica con los parámetros correctos', async () => {
            // Configurar mocks PERMANENTES para múltiples llamadas
            const reservaMock = {
                id: 'reserva-123',
                fecha_salida: '2026-01-30T12:00:00',
                fecha_entrada: '2026-01-20T12:00:00',
                precio_pactado: 100,
                moneda_pactada: 'PEN',
                codigo_reserva: 'RES-123'
            }

            // Supabase devolverá esto en .single() (para calcularResumenCambio y acortarEstadia)
            mockSingle.mockResolvedValue(reservaMock)

            // Turno activo
            mockMaybeSingle.mockResolvedValue({ id: 'turno-123', usuario_id: 'user-1' })

            // RPC exitoso
            mockRpc.mockResolvedValue({ data: { success: true }, error: null })

            // Mocks de comprobantes (para calcularResumenCambio)
            // Cuando llamamos a .in(), devolvemos array vacío para simplificar (sin NC por ahora)
            // O mockeamos select().select()... etc. Es complicado mockear todo el chain.
            // ESTRATEGIA: Vamos a dejar que calcularResumenCambio corra con los mocks.
            // Necesita .in() para comprobantes.

            const mockIn = vi.fn().mockReturnValue({
                data: [] // No hay comprobantes emitidos
            })

            // Actualizar el chain de mockSelect
            mockSelect.mockReturnValue({
                eq: mockEq.mockReturnValue({
                    single: mockSingle,
                    maybeSingle: mockMaybeSingle,
                    limit: mockLimit.mockReturnValue({
                        maybeSingle: mockMaybeSingle
                    }),
                    // Para calcularResumenCambio que busca comprobantes
                    neq: vi.fn().mockReturnValue({
                        in: mockIn
                    }),
                    order: vi.fn().mockReturnThis()
                }),
                // Soporte directo para llamadas que no usan eq primero, si las hubiera
                neq: vi.fn().mockReturnValue({
                    in: mockIn
                })
            })

            // Ejecutar
            // Acortamos 1 día (del 30 al 29)
            const result = await acortarEstadia('reserva-123', '2026-01-29', 'EFECTIVO')

            // Verificar éxito
            expect(result.success).toBe(true)

            // Verificar llamada RPC
            expect(mockRpc).toHaveBeenCalledWith('procesar_devolucion_atomica', expect.objectContaining({
                p_reserva_id: 'reserva-123',
                p_metodo_devolucion: 'EFECTIVO',
                p_turno_id: 'turno-123'
            }))
        })
    })

    it('debe manejar errores del RPC correctamente', async () => {
        // Setup mocks
        mockSingle.mockResolvedValueOnce({
            id: 'reserva-123',
            fecha_salida: '2026-01-30T12:00:00',
            fecha_entrada: '2026-01-20T12:00:00'
        })
        mockMaybeSingle.mockResolvedValueOnce({ id: 'turno-123' })

        mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Error simulado DB' } })

        // Ejecutar
        const result = await acortarEstadia('reserva-123', '2026-01-29', 'YAPE')

        // Verificar
        expect(result.success).toBe(false)
        expect(result.error).toContain('Error simulado DB')
    })
})

describe('calcularReconciliacionCaja (Nuevos Métodos)', () => {
    it('debe agrupar DEVOLUCION_EFECTIVO restando del efectivo', () => {
        const pagos = [
            { metodo_pago: 'EFECTIVO', monto: 500, moneda_pago: 'PEN' },
            { metodo_pago: 'DEVOLUCION_EFECTIVO', monto: -100, moneda_pago: 'PEN' }
        ]

        const stats = { total_ingresos_pen: 500, total_egresos_pen: 0 } as any // Simplificado

        const resultado = calcularReconciliacionCaja(pagos as any[], stats)

        // Efectivo = 500 + (-100) = 400
        expect(resultado.desglose.efectivo).toBe(400)
    })

    it('debe agrupar DEVOLUCION_YAPE sumando a billetera (monto es negativo)', () => {
        const pagos = [
            { metodo_pago: 'YAPE', monto: 200, moneda_pago: 'PEN' },
            { metodo_pago: 'DEVOLUCION_YAPE', monto: -50, moneda_pago: 'PEN' }
        ]

        const stats = { total_ingresos_pen: 200, total_egresos_pen: 0 } as any

        const resultado = calcularReconciliacionCaja(pagos as any[], stats)

        // Billetera = 200 + (-50) = 150
        expect(resultado.desglose.billetera).toBe(150)
    })

    it('debe agrupar DEVOLUCION_PENDIENTE en otros', () => {
        const pagos = [
            { metodo_pago: 'DEVOLUCION_PENDIENTE', monto: -50, moneda_pago: 'PEN' }
        ]

        const stats = { total_ingresos_pen: 0, total_egresos_pen: 0 } as any

        const resultado = calcularReconciliacionCaja(pagos as any[], stats)

        expect(resultado.desglose.otros).toBe(-50)
    })
})

