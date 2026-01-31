import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()

const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
        getUser: vi.fn(() => Promise.resolve({
            data: { user: { id: 'user-123' } }
        }))
    }
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('@/lib/actions/configuracion', () => ({
    getHotelConfig: vi.fn(() => Promise.resolve({
        facturacion_activa: true,
        ruc: '20123456789',
        tasa_igv: 18,
        es_exonerado_igv: false
    }))
}))

vi.mock('@/lib/services/nubefact', () => ({
    enviarComprobanteNubefact: vi.fn(() => Promise.resolve({
        success: true,
        aceptada_por_sunat: true,
        hash: 'hash-123',
        enlace: 'http://example.com/xml',
        enlace_del_cdr: 'http://example.com/cdr',
        enlace_pdf: 'http://example.com/pdf',
        mensaje: 'OK'
    }))
}))

// Import after mocks
import { cobrarYFacturarAtomico, getSaldoPendiente } from '../pagos'

describe('Módulo de Pagos - Tests Enterprise', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        mockFrom.mockReturnValue({
            select: mockSelect,
            insert: mockInsert,
            update: vi.fn().mockReturnValue({ eq: mockEq })
        })
        mockSelect.mockReturnValue({
            eq: mockEq
        })
        mockEq.mockReturnValue({
            single: mockSingle,
            eq: mockEq
        })
    })

    describe('cobrarYFacturarAtomico', () => {
        it('debe rechazar si no hay turno activo', async () => {
            // Mock: no hay turno activo
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }
            })

            const result = await cobrarYFacturarAtomico({
                reserva_id: 'reserva-001',
                metodo_pago: 'EFECTIVO',
                monto: 100,
                moneda: 'PEN',
                tipo_comprobante: 'BOLETA',
                serie: 'B001',
                cliente_tipo_doc: 'DNI',
                cliente_numero_doc: '12345678',
                cliente_nombre: 'CLIENTE PRUEBA',
                items: [{
                    descripcion: 'Hospedaje 1 noche',
                    cantidad: 1,
                    precio_unitario: 100,
                    subtotal: 100
                }]
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('turno')
        })

        it('debe detectar operaciones duplicadas (idempotencia)', async () => {
            // Mock: turno activo
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-123' },
                error: null
            })
            // Mock: reserva existe
            mockSingle.mockResolvedValueOnce({
                data: { id: 'reserva-001', codigo_reserva: 'ABC123' },
                error: null
            })
            // Mock: serie existe
            mockSingle.mockResolvedValueOnce({
                data: { id: 'serie-001', tipo_comprobante: 'BOLETA' },
                error: null
            })

            // Mock: RPC retorna duplicado
            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    duplicado: true,
                    pago_id: 'pago-existente-123'
                },
                error: null
            })

            const result = await cobrarYFacturarAtomico({
                reserva_id: 'reserva-001',
                caja_turno_id: 'turno-123',
                metodo_pago: 'EFECTIVO',
                monto: 100,
                moneda: 'PEN',
                tipo_comprobante: 'BOLETA',
                serie: 'B001',
                cliente_tipo_doc: 'DNI',
                cliente_numero_doc: '12345678',
                cliente_nombre: 'CLIENTE PRUEBA',
                items: [{
                    descripcion: 'Hospedaje',
                    cantidad: 1,
                    precio_unitario: 100,
                    subtotal: 100
                }]
            })

            expect(result.success).toBe(true)
            expect(result.duplicado).toBe(true)
        })

        it('debe procesar cobro exitosamente con transacción ACID', async () => {
            // Mock: turno activo
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-123' },
                error: null
            })
            // Mock: reserva existe
            mockSingle.mockResolvedValueOnce({
                data: { id: 'reserva-001', codigo_reserva: 'ABC123' },
                error: null
            })
            // Mock: serie existe
            mockSingle.mockResolvedValueOnce({
                data: { id: 'serie-001', tipo_comprobante: 'BOLETA' },
                error: null
            })

            // Mock: RPC exitoso
            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    duplicado: false,
                    comprobante_id: 'comprobante-nuevo-123',
                    pago_id: 'pago-nuevo-123',
                    numero_completo: 'B001-00000001',
                    correlativo: 1
                },
                error: null
            })

            // Mock: insert detalles
            mockInsert.mockResolvedValueOnce({ error: null })

            const result = await cobrarYFacturarAtomico({
                reserva_id: 'reserva-001',
                caja_turno_id: 'turno-123',
                metodo_pago: 'TARJETA',
                monto: 150,
                moneda: 'PEN',
                tipo_comprobante: 'BOLETA',
                serie: 'B001',
                cliente_tipo_doc: 'DNI',
                cliente_numero_doc: '12345678',
                cliente_nombre: 'CLIENTE PRUEBA',
                items: [{
                    descripcion: 'Hospedaje 1 noche',
                    cantidad: 1,
                    precio_unitario: 150,
                    subtotal: 150
                }]
            })

            expect(result.success).toBe(true)
            expect(result.comprobante_id).toBe('comprobante-nuevo-123')
            expect(result.numero_completo).toBe('B001-00000001')
        })
    })

    describe('getSaldoPendiente', () => {
        it('debe calcular saldo pendiente correctamente', async () => {
            // Mock: reserva con precio pactado
            mockSingle.mockResolvedValueOnce({
                data: {
                    precio_pactado: 100,
                    moneda_pactada: 'PEN',
                    fecha_entrada: '2026-01-24T12:00:00',
                    fecha_salida: '2026-01-25T12:00:00'
                },
                error: null
            })

            // Mock: pagos realizados (50 PEN)
            mockEq.mockReturnValueOnce({
                data: [{ monto: 50, moneda_pago: 'PEN', tipo_cambio_pago: 1 }],
                error: null
            })

            const saldo = await getSaldoPendiente('reserva-001')

            // Si 1 noche * 100 = 100, y pagó 50, saldo = 50
            expect(saldo).toBe(50)
        })

        it('debe convertir pagos en USD a PEN correctamente', async () => {
            mockSingle.mockResolvedValueOnce({
                data: {
                    precio_pactado: 100,
                    moneda_pactada: 'PEN',
                    fecha_entrada: '2026-01-24',
                    fecha_salida: '2026-01-25'
                },
                error: null
            })

            // Pago de 25 USD con tipo de cambio 4
            mockEq.mockReturnValueOnce({
                data: [{ monto: 25, moneda_pago: 'USD', tipo_cambio_pago: 4 }],
                error: null
            })

            const saldo = await getSaldoPendiente('reserva-001')

            // 25 USD * 4 = 100 PEN → saldo = 0
            expect(saldo).toBe(0)
        })
    })
})
