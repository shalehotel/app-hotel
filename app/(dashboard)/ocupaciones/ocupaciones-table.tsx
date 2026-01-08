"use client"

import { useState, useEffect } from "react"
import { getOcupacionesActuales, type OcupacionReserva } from "@/lib/actions/ocupaciones"
import { DataTable } from '@/components/tables/data-table'
import { columns } from "./columns"
import { ReservationDetailSheet } from "@/components/reservas/reservation-detail-sheet"
import { RegistrarPagoDialog } from "@/components/cajas/registrar-pago-dialog"
import { Skeleton } from "@/components/ui/skeleton"

export function OcupacionesTable() {
  const [ocupaciones, setOcupaciones] = useState<OcupacionReserva[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pagoReservaData, setPagoReservaData] = useState<any | null>(null)

  useEffect(() => {
    cargarOcupaciones()
  }, [])

  async function cargarOcupaciones() {
    try {
      setLoading(true)
      const data = await getOcupacionesActuales({})
      setOcupaciones(data)
    } catch (error) {
      console.error("Error al cargar ocupaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleVerDetalle(reservaId: string) {
    setSelectedReservaId(reservaId)
    setSheetOpen(true)
  }

  function handleCobrar(ocupacion: OcupacionReserva) {
    setPagoReservaData({
      id: ocupacion.id,
      saldo_pendiente: ocupacion.saldo_pendiente,
      titular_nombre: ocupacion.titular_nombre,
      titular_tipo_doc: ocupacion.titular_tipo_doc,
      titular_numero_doc: ocupacion.titular_numero_doc,
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={ocupaciones}
        searchKey="titular_nombre"
        searchPlaceholder="Buscar por huésped..."
        meta={{
          onVerDetalle: handleVerDetalle,
          onCobrar: handleCobrar,
        }}
      />

      {selectedReservaId && (
        <ReservationDetailSheet
          reservaId={selectedReservaId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}

      {pagoReservaData && (
        <RegistrarPagoDialog
          reserva={pagoReservaData}
          open={!!pagoReservaData}
          onOpenChange={(open) => {
            if (!open) setPagoReservaData(null)
          }}
          onSuccess={cargarOcupaciones}
        />
      )}
    </>
  )
}
