import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HotelConfig } from '@/lib/actions/configuracion'

export const generateKardexPDF = (reserva: any, huespedes: any[], pagos: any[], config?: HotelConfig) => {
    // 1. Setup Document
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
    doc.text(`TARJETA DE REGISTRO`, 160, titleY, { align: 'right' })

    doc.setFontSize(14)
    // Format Kardex Number
    const kardexNum = reserva.numero_kardex
        ? String(reserva.numero_kardex).padStart(6, '0')
        : `REF-${reserva.codigo_reserva}`
    doc.text(`Nº ${kardexNum}`, 195, titleY, { align: 'right' })

    // --- TABLE 1: RESERVATION DETAILS ---
    let startY = titleY + 5

    // Responsable box
    const nombreResponsable = (reserva.responsable_nombre || 'RESPONSABLE RECEPCIÓN').toUpperCase()

    autoTable(doc, {
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
            nombreResponsable
        ]]
    })

    startY = (doc as any).lastAutoTable.finalY + 5

    // Date/Time Logic with Fallback
    const fechaLlegada = format(new Date(reserva.fecha_entrada), 'dd/MM/yyyy', { locale: es })
    const horaLlegada = reserva.check_in_real
        ? format(new Date(reserva.check_in_real), 'HH:mm', { locale: es })
        : format(new Date(reserva.fecha_entrada), 'HH:mm', { locale: es })

    autoTable(doc, {
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
            reserva.habitacion_numero || reserva.habitaciones?.numero || '-',
            String(huespedes.length),
            `S/ ${Number(reserva.precio_pactado).toFixed(2)}`
        ]]
    })

    // --- TABLE 2: GUEST DETAILS (TITULAR) ---
    const titularReserva = huespedes.find((h: any) => h.es_titular)
    const titular = titularReserva?.huespedes || {}

    const procedencia = titular.procedencia_departamento || '-'

    autoTable(doc, {
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
                { content: 'NACIONALIDAD (Nationality):', styles: { fontStyle: 'bold' } },
                titular.nacionalidad || '-'
            ],
            [
                { content: 'FECHA NAC. (Birth Date):', styles: { fontStyle: 'bold' } },
                titular.fecha_nacimiento ? format(new Date(titular.fecha_nacimiento), 'dd/MM/yyyy') : '-',
                { content: 'SEXO (Sex):', styles: { fontStyle: 'bold' } },
                titular.sexo || '-'
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
    const acompanantes = huespedes
        .filter((h: any) => !h.es_titular)
        .map((h: any) => h.huespedes)

    if (acompanantes.length > 0) {
        const acompBody = acompanantes.map((acomp: any) => [
            `${acomp.nombres} ${acomp.apellidos}`,
            acomp.numero_documento || '-',
        ])

        autoTable(doc, {
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
    const metodos = pagos ? pagos.map((p: any) => p.metodo_pago) : []
    const isCash = metodos.includes('EFECTIVO') ? '[ X ]' : '[  ]'
    const isCard = metodos.includes('TARJETA_CREDITO') || metodos.includes('TARJETA_DEBITO') || metodos.includes('TARJETA') ? '[ X ]' : '[  ]'
    const isTransfer = metodos.includes('TRANSFERENCIA') || metodos.includes('YAPE') || metodos.includes('PLIN') ? '[ X ]' : '[  ]'

    autoTable(doc, {
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

    // Split text into lines that fit width
    const splitTerms = doc.splitTextToSize(hotel.terminos, 180)
    doc.text(splitTerms, 15, currentTermsY)

    // Calculate height of terms
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

    doc.line(25, firmaY, 90, firmaY)
    doc.text('FIRMA DEL HUÉSPED', 57, firmaY + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text(`DNI/PASAPORTE: ${titular.numero_documento || ''}`, 25, firmaY + 9)



    // Save
    const fileName = `Kardex_${reserva.numero_kardex || reserva.codigo_reserva}_${format(new Date(), 'yyyyMMdd')}.pdf`
    doc.save(fileName)
}
