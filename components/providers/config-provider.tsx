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
  initialConfig: HotelConfig
}) {
  return (
    <ConfigContext.Provider value={initialConfig}>
      {children}
    </ConfigContext.Provider>
  )
}

// Hook
export function useConfig() {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig debe usarse dentro de un ConfigProvider')
  }
  return context
}
