import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        // 1. Obtener datos de la reserva y huéspedes
        const { data: reserva, error: reservaError } = await supabase
            .from('reservas')
            .select(`
                *,
                habitaciones (numero, piso, tipos_habitacion:tipo_id (nombre)),
                reserva_huespedes (
                    es_titular,
                    huespedes (
                        nombres,
                        apellidos,
                        tipo_documento,
                        numero_documento,
                        pais,
                        fecha_nacimiento,
                        telefono,
                        correo,
                        procedencia_departamento,
                        procedencia_ciudad,
                        sexo
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (reservaError || !reserva) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
        }

        // Obtener usuario responsable
        let responsableNombre = 'RESPONSABLE RECEPCIÓN'
        if (reserva.usuario_id) {
            const { data: usuario } = await supabase
                .from('usuarios')
                .select('nombres, apellidos')
                .eq('id', reserva.usuario_id)
                .single()
            if (usuario) {
                responsableNombre = `${usuario.nombres} ${usuario.apellidos}`.toUpperCase()
            }
        }

        // Obtener pagos
        const { data: pagos } = await supabase
            .from('pagos')
            .select('metodo_pago, monto')
            .eq('reserva_id', id)

        // 2. Obtener configuración del hotel
        const { data: config } = await supabase
            .from('hotel_configuracion')
            .select('*')
            .single()

        // 3. Generar PDF (Lógica sincronizada con kardex-generator.ts)
        const doc = new jsPDF()

        // Hotel Defaults (from Config ONLY)
        const hotel = {
            nombre: (config?.nombre_comercial || config?.razon_social || '').toUpperCase(),
            ruc: config?.ruc || '',
            direccion: (config?.direccion_fiscal || '').toUpperCase(),
            ciudad_region: (config?.region || config?.ciudad ? `${config?.ciudad || ''} ${config?.region || ''}` : '').toUpperCase(),
            telefono: config?.telefono ? `TELF: ${config?.telefono}` : '',
            terminos: config?.terminos_condiciones || ''
        }

        const pageWidth = doc.internal.pageSize.width

        // --- HEADER ---
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')

        // Hotel Name
        doc.text(hotel.nombre, pageWidth / 2, 20, { align: 'center' })

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')

        // Address Lines
        let currentY = 26
        doc.text(hotel.direccion, pageWidth / 2, currentY, { align: 'center' })

        if (hotel.ciudad_region && hotel.ciudad_region.trim()) {
            currentY += 4
            const regionText = hotel.ciudad_region.replace(/^\s+|\s+$/g, '')
            doc.text(regionText, pageWidth / 2, currentY, { align: 'center' })
        }

        // RUC & Phone
        currentY += 4
        const rucPhoneText = `RUC: ${hotel.ruc}   ${hotel.telefono || ''}`
        doc.text(rucPhoneText, pageWidth / 2, currentY, { align: 'center' })

        // --- REGISTRATION CARD TITLE ---
        const titleY = currentY + 10
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        // Alignment fixed to right at X=160
        doc.text(`TARJETA DE REGISTRO`, 160, titleY, { align: 'right' })

        doc.setFontSize(14)
        const kardexNum = reserva.numero_kardex
            ? String(reserva.numero_kardex).padStart(6, '0')
            : `REF-${reserva.codigo_reserva}`
        doc.text(`Nº ${kardexNum}`, 195, titleY, { align: 'right' })

        // --- TABLE 1: RESERVATION DETAILS ---
        let startY = titleY + 5

        // Responsable box
        doc.autoTable({
            startY: startY,
            theme: 'plain',
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                fontSize: 8,
                cellPadding: 2,
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50, fillColor: [240, 240, 240] }
            },
            body: [[
                'ATENDIDO POR / ATTENDED BY:',
                responsableNombre
            ]]
        })

        startY = (doc as any).lastAutoTable.finalY + 5

        const fechaLlegada = format(new Date(reserva.fecha_entrada), 'dd/MM/yyyy', { locale: es })
        const horaLlegada = reserva.check_in_real
            ? format(new Date(reserva.check_in_real), 'HH:mm', { locale: es })
            : format(new Date(reserva.fecha_entrada), 'HH:mm', { locale: es })

        const huespedesCount = reserva.reserva_huespedes?.length || 0

        doc.autoTable({
            startY: startY,
            theme: 'plain',
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                fontSize: 9,
                cellPadding: 3,
            },
            headStyles: {
                fontStyle: 'bold',
                fillColor: [240, 240, 240]
            },
            head: [[
                'LLEGADA (Arrival)',
                'SALIDA (Departure)',
                'HABITACIÓN (Room)',
                'Nº HUÉSPEDES',
                'TARIFA (Rate)'
            ]],
            body: [[
                `${fechaLlegada}\n${horaLlegada}`,
                format(new Date(reserva.fecha_salida), 'dd/MM/yyyy', { locale: es }),
                reserva.habitaciones?.numero || '-',
                String(huespedesCount),
                `S/ ${Number(reserva.precio_pactado).toFixed(2)}`
            ]]
        })

        // --- TABLE 2: GUEST DETAILS (TITULAR) ---
        const titularReserva = reserva.reserva_huespedes?.find((rh: any) => rh.es_titular)
        const titular = titularReserva?.huespedes || {}

        const procedencia = [titular.procedencia_ciudad, titular.procedencia_departamento].filter(Boolean).join(', ') || '-'
        const sexoTexto = titular.sexo === 'M' ? 'MASCULINO' : titular.sexo === 'F' ? 'FEMENINO' : '-'

        doc.autoTable({
            startY: (doc as any).lastAutoTable.finalY + 5,
            theme: 'plain',
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                fontSize: 9,
                cellPadding: 3,
            },
            body: [
                [{ content: 'DATOS DEL HUÉSPED / GUEST INFORMATION', colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'center' } }],
                [
                    { content: 'NOMBRE COMPLETO (Full Name):', styles: { fontStyle: 'bold' } },
                    { content: `${titular.nombres || ''} ${titular.apellidos || ''}`, colSpan: 3 }
                ],
                [
                    { content: 'DOCUMENTO (ID/Passport):', styles: { fontStyle: 'bold' } },
                    titular.numero_documento || '-',
                    { content: 'PAÍS (Country):', styles: { fontStyle: 'bold' } },
                    titular.pais || '-'
                ],
                [
                    { content: 'FECHA NAC. (Birth Date):', styles: { fontStyle: 'bold' } },
                    titular.fecha_nacimiento ? format(new Date(titular.fecha_nacimiento), 'dd/MM/yyyy') : '-',
                    { content: 'SEXO (Sex):', styles: { fontStyle: 'bold' } },
                    sexoTexto
                ],
                [
                    { content: 'PROCEDENCIA (Origin):', styles: { fontStyle: 'bold' } },
                    { content: procedencia, colSpan: 3 }
                ],
                [
                    { content: 'TELÉFONO (Phone):', styles: { fontStyle: 'bold' } },
                    titular.telefono || '-',
                    { content: 'E-MAIL:', styles: { fontStyle: 'bold' } },
                    titular.correo || '-'
                ]
            ]
        })

        // --- ACCOMPANYING GUESTS ---
        const acompanantes = reserva.reserva_huespedes
            ?.filter((rh: any) => !rh.es_titular)
            .map((rh: any) => rh.huespedes) || []

        if (acompanantes.length > 0) {
            const acompBody = acompanantes.map((acom: any) => [
                `${acom.nombres} ${acom.apellidos}`,
                acom.numero_documento || '-',
            ])

            doc.autoTable({
                startY: (doc as any).lastAutoTable.finalY + 5,
                theme: 'plain',
                styles: {
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                    fontSize: 8,
                    cellPadding: 2,
                },
                head: [['ACOMPAÑANTE(S) / ACCOMPANYING GUEST(S)', 'DOCUMENTO']],
                body: acompBody
            })
        }

        // --- PAYMENT METHODS ---
        const metodos = pagos?.map((p: any) => p.metodo_pago) || []
        const isCash = metodos.includes('EFECTIVO') ? '[ X ]' : '[  ]'
        const isCard = metodos.includes('TARJETA_CREDITO') || metodos.includes('TARJETA_DEBITO') ? '[ X ]' : '[  ]'
        const isTransfer = metodos.includes('TRANSFERENCIA') || metodos.includes('YAPE') || metodos.includes('PLIN') ? '[ X ]' : '[  ]'

        doc.autoTable({
            startY: (doc as any).lastAutoTable.finalY + 5,
            theme: 'plain',
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                fontSize: 9,
                cellPadding: 3,
            },
            body: [
                [{ content: 'FORMA DE PAGO / PAYMENT METHOD', colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
                [{ content: `${isCash} EFECTIVO / CASH      ${isCard} TARJETA / CARD      ${isTransfer} TRANSFERENCIA`, colSpan: 4, styles: { halign: 'center', minCellHeight: 15, valign: 'middle' } }]
            ]
        })

        // --- TERMS & CONDITIONS ---
        const termsY = (doc as any).lastAutoTable.finalY + 8

        if (termsY > 200) {
            doc.addPage()
        }

        const currentTermsY = termsY > 200 ? 20 : termsY

        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')

        const termsText = hotel.terminos || ''
        const splitTerms = doc.splitTextToSize(termsText, 180)
        doc.text(splitTerms, 15, currentTermsY)

        const termsHeight = splitTerms.length * 3
        let legalY = currentTermsY + termsHeight + 10

        // --- AGREEMENT & SIGNATURES ---
        if (legalY > 260) {
            doc.addPage()
            legalY = 30
        }

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('ESTOY DE ACUERDO CON LOS TÉRMINOS Y POLÍTICAS DEL HOTEL', pageWidth / 2, legalY, { align: 'center' })

        const firmaY = legalY + 25
        doc.setLineWidth(0.1)

        // Firma Huésped
        doc.line(25, firmaY, 90, firmaY)
        doc.text('FIRMA DEL HUÉSPED', 57, firmaY + 5, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.text(`DNI/PASAPORTE: ${titular.numero_documento || ''}`, 25, firmaY + 9)



        // Output
        const pdfBuffer = doc.output('arraybuffer')

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename=Kardex_${reserva.numero_kardex || reserva.codigo_reserva}.pdf`
            }
        })

    } catch (error) {
        console.error('[Kardex] Error generating PDF:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
