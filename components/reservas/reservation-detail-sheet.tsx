'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  getDetalleReserva,
  getHuespedesDeReserva,
  type OcupacionReserva
} from '@/lib/actions/ocupaciones'
import { getHotelConfig, type HotelConfig } from '@/lib/actions/configuracion'
import { generateKardexPDF } from '@/lib/pdf/kardex-generator'
import { getPagosByReserva } from '@/lib/actions/pagos'
import { realizarCheckin } from '@/lib/actions/checkin'
import {
  realizarCheckout,
  validarCheckout
} from '@/lib/actions/checkout'
import {
  DoorOpen,
  DoorClosed,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Printer
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { RegistrarPagoDialog } from '@/components/cajas/registrar-pago-dialog'

type ReservationDetailSheetProps = {
  reservaId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  readonly?: boolean // Modo solo lectura / auditoría
  defaultTab?: 'ficha' | 'cuenta'
}

export function ReservationDetailSheet({ reservaId, open, onOpenChange, onUpdate, readonly = false, defaultTab = 'ficha' }: ReservationDetailSheetProps) {
  const [reserva, setReserva] = useState<OcupacionReserva | null>(null)
  const [huespedes, setHuespedes] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [hotelConfig, setHotelConfig] = useState<HotelConfig>()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialogs
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false)
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [forceCheckout, setForceCheckout] = useState(false)

  useEffect(() => {
    if (open && reservaId) {
      cargarDatos()
    }
  }, [open, reservaId])

  async function cargarDatos() {
    try {
      setLoading(true)
      const [detalleData, huespedesData, pagosData, configData] = await Promise.all([
        getDetalleReserva(reservaId),
        getHuespedesDeReserva(reservaId),
        getPagosByReserva(reservaId),
        getHotelConfig()
      ])

      setReserva(detalleData)
      setHuespedes(huespedesData)
      setPagos(pagosData)
      setHotelConfig(configData || null)
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar los detalles de la reserva')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintKardex = () => {
    if (!reserva) return
    generateKardexPDF(reserva, huespedes, pagos, hotelConfig)
  }

  async function handleCheckin() {
    if (!reserva) return

    try {
      setActionLoading(true)
      await realizarCheckin(reserva.id)
      toast.success('Check-in realizado exitosamente')
      await cargarDatos()
      onUpdate?.() // Actualizar Rack
      setCheckinDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al realizar check-in')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCheckout() {
    if (!reserva) return

    try {
      setActionLoading(true)

      // Validar si tiene deuda
      const validation = await validarCheckout(reserva.id)

      if (!validation.puede_checkout && !forceCheckout) {
        // Mostrar confirmación si tiene deuda
        setForceCheckout(true)
        setCheckoutDialogOpen(true)
        setActionLoading(false)
        return
      }

      await realizarCheckout({
        reserva_id: reserva.id,
        forzar_checkout: forceCheckout
      })
      toast.success('Check-out realizado exitosamente')
      await cargarDatos()
      onUpdate?.() // Actualizar Rack (Barra desaparece, Habitación sucia)
      setCheckoutDialogOpen(false)
      setForceCheckout(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al realizar check-out')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !reserva) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const esReservada = reserva.estado === 'RESERVADA'
  const esCheckedIn = reserva.estado === 'CHECKED_IN'
  const esCheckedOut = reserva.estado === 'CHECKED_OUT'
  const tieneDeuda = reserva.saldo_pendiente > 0

  const titular = huespedes.find(h => h.es_titular)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">Reserva {reserva.codigo_reserva}</SheetTitle>
              <Badge variant={esCheckedIn ? 'default' : esReservada ? 'outline' : 'secondary'} className="capitalize">
                {reserva.estado.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
            <SheetDescription>
              Habitación {reserva.habitacion_numero} • {reserva.tipo_habitacion}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="ficha">Ficha de Registro</TabsTrigger>
                <TabsTrigger value="cuenta">Estado de Cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="ficha" className="space-y-6">
                {/* Reservation Header with Kardex # */}
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Nº Ficha de Registro</p>
                  <p className="font-mono font-bold text-lg">
                    {(reserva as any).numero_kardex
                      ? String((reserva as any).numero_kardex).padStart(6, '0')
                      : reserva.codigo_reserva}
                  </p>
                </div>

                {/* General Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fecha Entrada</p>
                    <p className="font-medium">
                      {format(new Date(reserva.fecha_entrada), 'dd MMM yyyy', { locale: es })}
                    </p>
                    {reserva.check_in_real && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Check-in: {format(new Date(reserva.check_in_real), 'HH:mm', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha Salida</p>
                    <p className="font-medium">
                      {format(new Date(reserva.fecha_salida), 'dd MMM yyyy', { locale: es })}
                    </p>
                    {reserva.check_out_real && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Check-out: {format(new Date(reserva.check_out_real), 'HH:mm', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estancia</p>
                    <p className="font-medium">
                      {reserva.total_noches} {reserva.total_noches === 1 ? 'noche' : 'noches'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio Pactado</p>
                    <p className="font-medium">S/ {reserva.precio_pactado.toFixed(2)} / noche</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responsable</p>
                    <p className="font-medium truncate" title={reserva.responsable_nombre || 'No registrado'}>
                      {reserva.responsable_nombre || '-'}
                    </p>
                  </div>
                </div>

                {/* Payment Methods (if any) */}
                {(reserva as any).metodos_pago && (reserva as any).metodos_pago.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Método(s) de pago:</span>
                    <div className="flex gap-1 flex-wrap">
                      {(reserva as any).metodos_pago.map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Huespedes (FICHA COMPLETA) */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">Registro de Huéspedes</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!reserva || !hotelConfig}
                      onClick={handlePrintKardex}
                    >
                      <Printer className="mr-2 h-3.5 w-3.5" />
                      Imprimir Ficha
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {huespedes.map((h, idx) => {
                      const datos = h.huespedes
                      const esTitular = h.es_titular

                      return (
                        <div key={idx} className={`flex flex-col p-4 rounded-lg border ${esTitular ? 'bg-muted/40 border-primary/20' : 'bg-background'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${esTitular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {esTitular ? 'Titular' : 'Acompañante'}
                              </span>
                              <p className="font-semibold text-base mt-1">
                                {datos.nombres} {datos.apellidos}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">{datos.numero_documento}</p>
                              <p className="text-xs text-muted-foreground">{datos.tipo_documento}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground">País</p>
                              <p>{datos.pais || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Sexo</p>
                              <p>{datos.sexo === 'M' ? 'Masculino' : datos.sexo === 'F' ? 'Femenino' : '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Fecha Nacimiento</p>
                              <p>{datos.fecha_nacimiento ? format(new Date(datos.fecha_nacimiento), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Procedencia</p>
                              <p className="text-xs">
                                {[datos.procedencia_ciudad, datos.procedencia_departamento].filter(Boolean).join(', ') || '-'}
                              </p>
                            </div>
                            {datos.telefono && (
                              <div>
                                <p className="text-xs text-muted-foreground">Teléfono</p>
                                <p className="font-mono text-xs">{datos.telefono}</p>
                              </div>
                            )}
                            {datos.correo && (
                              <div>
                                <p className="text-xs text-muted-foreground">Correo</p>
                                <p className="text-xs truncate">{datos.correo}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Metadatos (Check-out info, created_at) */}
                <div className="space-y-4 pt-4">
                  {esCheckedOut && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Check-out Completado</p>
                        <p className="text-xs text-muted-foreground">
                          {reserva.check_out_real && format(new Date(reserva.check_out_real), "dd MMM yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}

                  {readonly && (
                    <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                      <p>Código de Reserva: <span className="font-mono font-medium">{reserva.codigo_reserva}</span></p>
                      <p>Creado: {reserva.created_at && format(new Date(reserva.created_at), "dd MMM yyyy HH:mm", { locale: es })}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="cuenta" className="space-y-6">
                {/* Finanzas */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Estado de Cuenta</h3>
                    {esCheckedIn && !readonly && (
                      <Button variant="outline" size="sm" onClick={() => setPagoDialogOpen(true)}>
                        <CreditCard className="h-3 w-3 mr-2" />
                        Registrar Pago
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-muted/20 rounded-lg border text-center">
                      <span className="block text-xs text-muted-foreground mb-1">Total</span>
                      <span className="block font-semibold">S/ {reserva.total_estimado.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900 text-center">
                      <span className="block text-xs text-muted-foreground mb-1">Pagado</span>
                      <span className="block font-semibold text-green-600">S/ {reserva.total_pagado.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900 text-center">
                      <span className="block text-xs text-muted-foreground mb-1">Pendiente</span>
                      <span className="block font-semibold text-red-600">S/ {reserva.saldo_pendiente.toFixed(2)}</span>
                    </div>
                  </div>

                  {pagos.length > 0 ? (
                    <div className="space-y-2">
                      {pagos.map((pago) => (
                        <div key={pago.id} className="flex justify-between items-center p-2 text-sm border-b last:border-0">
                          <div>
                            <p className="font-medium">S/ {pago.monto.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{pago.metodo_pago}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(pago.fecha_pago), 'dd MMM', { locale: es })}
                            </p>
                            {pago.comprobantes && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                {pago.comprobantes.tipo_comprobante.substring(0, 1)}{(pago.comprobantes.numero_completo || '').split('-')[1] || '000'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">No hay pagos registrados</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <SheetFooter className="p-6 pt-2 border-t mt-auto">
            {!readonly ? (
              /* MODO OPERATIVO */
              <>
                {esReservada && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setCheckinDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <DoorOpen className="h-4 w-4 mr-2" />
                    Hacer Check-in
                  </Button>
                )}

                {esCheckedIn && (
                  <div className="flex gap-2 w-full">
                    {tieneDeuda && (
                      <Button
                        className="flex-1"
                        variant="default"
                        onClick={() => setPagoDialogOpen(true)}
                        disabled={actionLoading}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Cobrar
                      </Button>
                    )}

                    <Button
                      className="flex-1"
                      variant={tieneDeuda ? 'outline' : 'default'}
                      onClick={() => setCheckoutDialogOpen(true)}
                      disabled={actionLoading}
                    >
                      <DoorClosed className="h-4 w-4 mr-2" />
                      Check-out
                    </Button>
                  </div>
                )}

                {esCheckedOut && (
                  <Button variant="outline" className="w-full" disabled>
                    Reserva Finalizada
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full text-center text-xs text-muted-foreground">
                Modo Auditoría
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog: Check-in */}
      <AlertDialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea realizar el check-in de <strong>{reserva.titular_nombre}</strong> en la habitación <strong>{reserva.habitacion_numero}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckin} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Check-out */}
      <AlertDialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tieneDeuda && !forceCheckout ? '⚠️ Check-out con Deuda' : 'Confirmar Check-out'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {tieneDeuda && !forceCheckout ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    El huésped tiene un saldo pendiente de <strong>S/ {reserva.saldo_pendiente.toFixed(2)}</strong>.
                  </div>
                  <div className="grid gap-2">
                    <Button
                      variant="default"
                      onClick={(e) => {
                        e.preventDefault()
                        setCheckoutDialogOpen(false)
                        setPagoDialogOpen(true)
                      }}
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pagar Deuda Ahora
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Si pagas ahora, podrás realizar el check-out inmediatamente después.
                    </p>
                  </div>
                </div>
              ) : (
                <span>
                  ¿Desea realizar el check-out de <strong>{reserva.titular_nombre}</strong> de la habitación <strong>{reserva.habitacion_numero}</strong>?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setForceCheckout(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tieneDeuda && !forceCheckout ? 'Forzar Check-out (Dejar Deuda)' : 'Confirmar Check-out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Registrar Pago */}
      <RegistrarPagoDialog
        open={pagoDialogOpen}
        onOpenChange={setPagoDialogOpen}
        reserva={{
          id: reserva.id,
          saldo_pendiente: reserva.saldo_pendiente,
          titular_nombre: reserva.titular_nombre,
          titular_tipo_doc: reserva.titular_tipo_doc,
          titular_numero_doc: reserva.titular_numero_doc,
          habitacion_numero: reserva.habitacion_numero,
          precio_pactado: reserva.precio_pactado,
          fecha_entrada: reserva.fecha_entrada,
          fecha_salida: reserva.fecha_salida
        }}
        onSuccess={cargarDatos}
      />
    </>
  )
}
