'use client'

import React, { createContext, useContext } from 'react'
import type { HotelConfig } from '@/lib/actions/configuracion'

// Contexto
const ConfigContext = createContext<HotelConfig | null>(null)

// Provider
export function ConfigProvider({ 
  children, 
  initialConfig 
}: { 
  children: React.ReactNode
  initialConfig: HotelConfig | null
}) {
  return (
    <ConfigContext.Provider value={initialConfig}>
      {children}
    </ConfigContext.Provider>
  )
}

// Hook - retorna el config (puede ser null si no está configurado)
export function useConfig() {
  return useContext(ConfigContext)
}
