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
import { deleteSerie, type Serie } from '@/lib/actions/series'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serie: Serie | null
  onSuccess: () => void
}

export function SerieDeleteAlert({ open, onOpenChange, serie, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!serie) return

    setLoading(true)

    try {
      const result = await deleteSerie(serie.id)

      if (result.success) {
        toast.success('Serie eliminada', {
          description: `La serie "${serie.serie}" fue eliminada correctamente`
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
          <AlertDialogTitle>¿Eliminar serie?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la serie <strong>{serie?.serie}</strong>.
            <br /><br />
            Solo puedes eliminar series que no hayan emitido comprobantes (correlativo en 0).
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
