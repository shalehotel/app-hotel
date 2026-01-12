import { describe, it, expect, vi, beforeEach } from 'vitest'
import { realizarCheckin } from '../checkin'

// Mock Supabase
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

const mockSupabase = {
    from: mockFrom,
}

// Mock createClient
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

describe('realizarCheckin', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        
        // Default chain setup
        mockFrom.mockReturnValue({
            select: mockSelect,
            update: mockUpdate,
        })
        mockSelect.mockReturnValue({
            eq: mockEq,
        })
        mockUpdate.mockReturnValue({
            eq: mockEq,
        })
        mockEq.mockReturnValue({
            single: mockSingle,
        })
        // For update chains that don't end in single()
        mockEq.mockReturnValueOnce({
             single: mockSingle
        }).mockReturnValue({
            // Promise resolve for update().eq()
            then: (callback: any) => callback({ error: null })
        })
    })

    it('should return error if reservation is not found', async () => {
        // Setup mock for missing reservation
        mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

        const result = await realizarCheckin('reserva-123')

        expect(result).toEqual({
            error: 'Reserva no encontrada',
            code: 'RESERVA_NO_ENCONTRADA'
        })
    })

    it('should return error if room is not clean', async () => {
        // 1. Mock Reserva Found
        mockSingle.mockResolvedValueOnce({ 
            data: { id: 'reserva-123', habitacion_id: 'hab-101', estado: 'RESERVADA' }, 
            error: null 
        })

        // 2. Mock Habitacion Found but DIRTY
        mockSingle.mockResolvedValueOnce({ 
            data: { 
                estado_limpieza: 'SUCIA', 
                estado_servicio: 'OPERATIVA',
                estado_ocupacion: 'LIBRE' 
            }, 
            error: null 
        })

        const result = await realizarCheckin('reserva-123')

        expect(result).toEqual({
            error: 'Habitación requiere limpieza',
            message: 'Por favor, solicite al área de housekeeping que limpie la habitación primero.',
            code: 'HABITACION_SUCIA'
        })
    })
})
