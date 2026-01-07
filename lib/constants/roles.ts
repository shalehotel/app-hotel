// ========================================
// ROLES (ENUM)
// ========================================

export const ROLES = {
  ADMIN: 'ADMIN',
  RECEPCION: 'RECEPCION',
  HOUSEKEEPING: 'HOUSEKEEPING'
} as const

export type RolUsuario = typeof ROLES[keyof typeof ROLES]

export const ROLES_DISPONIBLES = [
  { value: 'ADMIN', label: 'Administrador', descripcion: 'Acceso completo al sistema' },
  { value: 'RECEPCION', label: 'Recepción', descripcion: 'Gestión de reservas y check-in/out' },
  { value: 'HOUSEKEEPING', label: 'Limpieza', descripcion: 'Gestión de estado de habitaciones' }
] as const
