'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteCaja, type Caja } from '@/lib/actions/cajas'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja: Caja | null
  onSuccess: () => void
}

export function CajaDeleteAlert({ open, onOpenChange, caja, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!caja) return

    setLoading(true)

    try {
      const result = await deleteCaja(caja.id)

      if (result.success) {
        toast.success('Caja eliminada', {
          description: `La caja "${caja.nombre}" fue desactivada correctamente`
        })
        onSuccess()
      } else {
        toast.error('Error al eliminar', {
          description: result.error
        })
      }
    } catch (error: any) {
      toast.error('Error inesperado', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar caja?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de desactivar la caja <strong>{caja?.nombre}</strong>.
            <br /><br />
            Esta acción marcará la caja como inactiva. No podrás eliminarla si tiene turnos activos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
