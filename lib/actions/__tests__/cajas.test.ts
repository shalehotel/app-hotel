import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

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

// Import after mocks
import { abrirCaja, cerrarCajaAtomico, registrarMovimiento } from '../cajas'

describe('Módulo de Cajas - Tests Enterprise', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Setup default chains
        mockFrom.mockReturnValue({
            select: mockSelect,
            insert: mockInsert,
            update: mockUpdate
        })
        mockSelect.mockReturnValue({
            eq: mockEq,
            order: mockOrder
        })
        mockOrder.mockReturnValue({
            limit: mockLimit
        })
        mockLimit.mockReturnValue({
            single: mockSingle
        })
        mockEq.mockReturnValue({
            single: mockSingle,
            eq: mockEq
        })
        mockInsert.mockReturnValue({
            select: mockSelect
        })
    })

    describe('abrirCaja', () => {
        it('debe rechazar si el usuario ya tiene turno abierto', async () => {
            // Mock: turno existente
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-existente' },
                error: null
            })

            const result = await abrirCaja({
                caja_id: 'caja-001',
                monto_apertura: 100
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('turno abierto')
        })

        it('debe permitir abrir caja si no hay turno previo', async () => {
            // Mock: no hay turno existente
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }
            })
            // Mock: insert exitoso
            mockSingle.mockResolvedValueOnce({
                data: { id: 'nuevo-turno-123' },
                error: null
            })

            const result = await abrirCaja({
                caja_id: 'caja-001',
                monto_apertura: 100,
                monto_apertura_usd: 20
            })

            expect(result.success).toBe(true)
            expect(result.turno_id).toBe('nuevo-turno-123')
        })
    })

    describe('cerrarCajaAtomico', () => {
        it('debe detectar descuadre y requerir autorización', async () => {
            // Mock: turno activo encontrado
            mockSingle.mockResolvedValueOnce({
                data: {
                    id: 'turno-123',
                    estado: 'ABIERTA',
                    monto_apertura_efectivo: 100
                },
                error: null
            })

            // Mock: RPC validar_y_cerrar_caja
            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    requiere_autorizacion: true,
                    descuadre_pen: -50,
                    descuadre_usd: 0,
                    efectivo_teorico_pen: 150,
                    efectivo_teorico_usd: 0
                },
                error: null
            })

            const result = await cerrarCajaAtomico({
                turno_id: 'turno-123',
                monto_declarado_pen: 100, // Debería ser 150
                monto_declarado_usd: 0
            })

            expect(result.success).toBe(true)
            expect(result.requiere_autorizacion).toBe(true)
            expect(result.descuadre_pen).toBe(-50)
        })

        it('debe cerrar correctamente sin descuadre', async () => {
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-123', estado: 'ABIERTA' },
                error: null
            })

            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    requiere_autorizacion: false,
                    descuadre_pen: 0,
                    descuadre_usd: 0
                },
                error: null
            })

            const result = await cerrarCajaAtomico({
                turno_id: 'turno-123',
                monto_declarado_pen: 150,
                monto_declarado_usd: 0
            })

            expect(result.success).toBe(true)
            expect(result.requiere_autorizacion).toBe(false)
        })
    })

    describe('registrarMovimiento', () => {
        it('debe rechazar monto <= 0', async () => {
            // Setup para simular turno activo
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-123' },
                error: null
            })

            const result = await registrarMovimiento({
                tipo: 'INGRESO',
                moneda: 'PEN',
                monto: -50, // Monto inválido
                motivo: 'Test de monto negativo'
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('mayor a 0')
        })

        it('debe rechazar motivo muy corto', async () => {
            mockSingle.mockResolvedValueOnce({
                data: { id: 'turno-123' },
                error: null
            })

            const result = await registrarMovimiento({
                tipo: 'EGRESO',
                moneda: 'PEN',
                monto: 50,
                motivo: 'abc' // Muy corto (< 5 chars)
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('5 caracteres')
        })
    })
})
