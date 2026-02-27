'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getLibroHuespedes, type LibroHuespedesItem } from '@/lib/actions/reportes'
import { format, startOfMonth, endOfMonth, setYear, setMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Printer, Search, FileText, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'

export function RegistroLegalClient() {
    const [mesInicio, setMesInicio] = useState<string>(new Date().getMonth().toString())
    const [mesFin, setMesFin] = useState<string>(new Date().getMonth().toString())
    const [anio, setAnio] = useState<string>(new Date().getFullYear().toString())
    const [datos, setDatos] = useState<LibroHuespedesItem[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const generarReporte = async () => {
        setLoading(true)
        try {
            // Validar que el año sea válido
            const anioNum = parseInt(anio)
            if (isNaN(anioNum) || anioNum < 2020 || anioNum > 2100) {
                toast.error('Ingresa un año válido (2020-2100)')
                setLoading(false)
                return
            }

            const mesInicioNum = parseInt(mesInicio)
            const mesFinNum = parseInt(mesFin)

            // Fecha de inicio: primer día del mes inicio
            const inicio = startOfMonth(setMonth(setYear(new Date(), anioNum), mesInicioNum))
            // Fecha fin: último día del mes fin
            const fin = endOfMonth(setMonth(setYear(new Date(), anioNum), mesFinNum))

            const result = await getLibroHuespedes({
                fechaInicio: inicio,
                fechaFin: fin
            })

            if (result.success && result.data) {
                setDatos(result.data)
                setSearched(true)
                if (result.data.length === 0) {
                    toast.info('No se encontraron registros para este periodo')
                } else {
                    const periodo = mesInicioNum === mesFinNum
                        ? `${meses[mesInicioNum].label} ${anio}`
                        : `${meses[mesInicioNum].label} - ${meses[mesFinNum].label} ${anio}`
                    toast.success(`${result.data.length} registros encontrados (${periodo})`)
                }
            } else {
                toast.error('Error al generar el reporte')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = async () => {
        if (datos.length === 0) return

        try {
            // Crear nuevo libro de Excel
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Libro de Huespedes')

            // Definir columnas con anchos
            worksheet.columns = [
                { width: 12 },  // Habitac. N°
                { width: 10 },  // Hora Ingreso
                { width: 14 },  // Fecha Ingreso
                { width: 10 },  // Hora Salida
                { width: 14 },  // Fecha Salida
                { width: 14 },  // Tarifa
                { width: 14 },  // Total
                { width: 40 },  // Nombres y Apellidos
                { width: 10 },  // Tipo
                { width: 15 },  // Número
                { width: 18 },  // Ciudad
                { width: 20 },  // Departamento
                { width: 12 },  // País
            ]

            // FILA 1: Encabezados principales
            const headerRow1 = worksheet.getRow(1)
            headerRow1.height = 20
            headerRow1.values = [
                'Habitac.\nN°',
                'INGRESO',
                '',
                'FECHA PROBABLE\nDE SALIDA',
                '',
                'TARIFA',
                'TOTAL',
                'HUÉSPED (ES)\nNOMBRES Y APELLIDOS',
                'DOCUMENTOS',
                '',
                'LUGAR DE NACIMIENTO',
                '',
                '',
                ''
            ]

            // FILA 2: Sub-encabezados
            const headerRow2 = worksheet.getRow(2)
            headerRow2.height = 20
            headerRow2.values = ['', 'HORA', 'FECHA', 'HORA', 'FECHA', '', '', '', 'TIPO', 'NÚMERO', 'CIUDAD', 'DEPARTAMENTO', 'PAÍS']

            // COMBINAR CELDAS
            worksheet.mergeCells('A1:A2')  // Habitac N°
            worksheet.mergeCells('B1:C1')  // INGRESO
            worksheet.mergeCells('D1:E1')  // FECHA PROBABLE DE SALIDA
            worksheet.mergeCells('F1:F2')  // TARIFA
            worksheet.mergeCells('G1:G2')  // TOTAL
            worksheet.mergeCells('H1:H2')  // HUÉSPED
            worksheet.mergeCells('I1:J1')  // DOCUMENTOS
            worksheet.mergeCells('K1:M1')  // LUGAR DE NACIMIENTO

            // Estilo para encabezados
            const headerStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } as ExcelJS.FillPattern,
                alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
                border: {
                    top: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            }

            // Aplicar estilo a encabezados
            for (let col = 1; col <= 13; col++) {
                worksheet.getCell(1, col).style = headerStyle
                worksheet.getCell(2, col).style = headerStyle
            }

            // AGREGAR DATOS
            datos.forEach((fila) => {
                const row = worksheet.addRow([
                    fila.habitacion,
                    format(new Date(fila.fecha_ingreso), 'HH:mm'),
                    format(new Date(fila.fecha_ingreso), 'd/MM/yyyy'),
                    format(new Date(fila.fecha_salida), 'HH:mm'),
                    format(new Date(fila.fecha_salida), 'd/MM/yyyy'),
                    fila.es_titular ? fila.tarifa : '',
                    fila.es_titular ? fila.total : '',
                    fila.nombre_completo,
                    fila.tipo_documento,
                    fila.numero_documento,
                    fila.ciudad,
                    fila.departamento,
                    fila.pais
                ])

                row.height = 20

                // Estilo para datos
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                    cell.alignment = {
                        horizontal: colNumber === 8 ? 'left' : 'center',  // Nombres a la izquierda (col 8 ahora)
                        vertical: 'middle'
                    }
                    cell.font = { size: 10 }
                })
            })

            // Generar archivo Excel
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url

            // Nombre de archivo según rango
            const mesInicioNum = parseInt(mesInicio)
            const mesFinNum = parseInt(mesFin)
            const nombrePeriodo = mesInicioNum === mesFinNum
                ? `${meses[mesInicioNum].label}_${anio}`
                : `${meses[mesInicioNum].label}-${meses[mesFinNum].label}_${anio}`

            link.download = `Libro_Huespedes_${nombrePeriodo}.xlsx`
            link.click()
            window.URL.revokeObjectURL(url)

            toast.success("Excel exportado con formato profesional")
        } catch (error) {
            console.error('Error al exportar Excel:', error)
            toast.error('Error al generar el archivo Excel')
        }
    }

    const anios = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())
    const meses = [
        { value: '0', label: 'Enero' },
        { value: '1', label: 'Febrero' },
        { value: '2', label: 'Marzo' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Mayo' },
        { value: '5', label: 'Junio' },
        { value: '6', label: 'Julio' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Septiembre' },
        { value: '9', label: 'Octubre' },
        { value: '10', label: 'Noviembre' },
        { value: '11', label: 'Diciembre' },
    ]

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header y Controles Unificados */}
            <div className="flex flex-col gap-4 sm:gap-6 print:hidden border-b pb-4 sm:pb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-primary">Libro de Huéspedes - Registro Legal</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        D.S. N° 001-2015-MINCETUR - Registro obligatorio de huéspedes
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-md border">
                        <Select value={mesInicio} onValueChange={setMesInicio}>
                            <SelectTrigger className="h-9 w-full sm:w-[140px] border-0 bg-transparent focus:ring-0 shadow-none text-xs sm:text-sm">
                                <SelectValue placeholder="Mes inicio" />
                            </SelectTrigger>
                            <SelectContent>
                                {meses.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-xs text-muted-foreground">→</span>

                        <Select value={mesFin} onValueChange={setMesFin}>
                            <SelectTrigger className="h-9 w-full sm:w-[140px] border-0 bg-transparent focus:ring-0 shadow-none text-xs sm:text-sm">
                                <SelectValue placeholder="Mes fin" />
                            </SelectTrigger>
                            <SelectContent>
                                {meses.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-5 bg-border mx-1" />

                        <input
                            type="number"
                            value={anio}
                            onChange={(e) => setAnio(e.target.value)}
                            placeholder="Año"
                            min="2020"
                            max="2100"
                            className="h-9 w-[80px] border-0 bg-transparent focus:ring-0 shadow-none text-xs sm:text-sm text-center outline-none"
                        />
                    </div>

                    <Button onClick={generarReporte} disabled={loading} className="h-10 px-4 sm:px-6 shadow-sm text-xs sm:text-sm">
                        {loading ? 'Generando...' : 'Generar Reporte'}
                    </Button>

                    {datos.length > 0 && (
                        <div className="flex items-center gap-2 sm:border-l sm:pl-4 sm:ml-2">
                            <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 hover:text-primary" title="Imprimir">
                                <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleExportExcel} className="h-10 w-10 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200" title="Exportar Excel">
                                <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Vista Previa / Impresión */}
            {searched && (
                <div className="print:block min-h-[400px] sm:min-h-[500px]">
                    {/* Cabecera del Documento Legal */}
                    <div className="hidden print:block mb-6 sm:mb-8 text-center">
                        <h1 className="text-lg sm:text-xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 inline-block">
                            Registro de Huéspedes
                        </h1>
                        <p className="text-xs sm:text-sm mt-2">
                            Periodo: {parseInt(mesInicio) === parseInt(mesFin)
                                ? `${meses[parseInt(mesInicio)].label.toUpperCase()} ${anio}`
                                : `${meses[parseInt(mesInicio)].label.toUpperCase()} - ${meses[parseInt(mesFin)].label.toUpperCase()} ${anio}`
                            }
                        </p>
                    </div>

                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <table className="w-full text-[9px] sm:text-xs border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-muted print:bg-transparent">
                                    <th rowSpan={2} className="border border-black p-1 text-center w-12 font-semibold align-middle">Habitac.<br />N°</th>
                                    <th colSpan={2} className="border border-black p-1 text-center font-semibold">INGRESO</th>
                                    <th colSpan={2} className="border border-black p-1 text-center font-semibold">FECHA PROBABLE<br />DE SALIDA</th>
                                    <th rowSpan={2} className="border border-black p-1 text-center w-16 font-semibold align-middle">TARIFA</th>
                                    <th rowSpan={2} className="border border-black p-1 text-center w-16 font-semibold align-middle">TOTAL</th>
                                    <th rowSpan={2} className="border border-black p-1 text-center font-semibold align-middle">HUÉSPED (ES)<br />NOMBRES Y APELLIDOS</th>
                                    <th colSpan={2} className="border border-black p-1 text-center font-semibold">DOCUMENTOS</th>
                                    <th colSpan={3} className="border border-black p-1 text-center font-semibold">LUGAR DE NACIMIENTO</th>
                                </tr>
                                <tr className="bg-muted print:bg-transparent">
                                    <th className="border border-black p-1 text-center w-12 font-semibold">HORA</th>
                                    <th className="border border-black p-1 text-center w-20 font-semibold">FECHA</th>
                                    <th className="border border-black p-1 text-center w-12 font-semibold">HORA</th>
                                    <th className="border border-black p-1 text-center w-20 font-semibold">FECHA</th>
                                    <th className="border border-black p-1 text-center w-12 font-semibold">TIPO</th>
                                    <th className="border border-black p-1 text-center w-20 font-semibold">NÚMERO</th>
                                    <th className="border border-black p-1 text-center w-20 font-semibold">CIUDAD</th>
                                    <th className="border border-black p-1 text-center w-24 font-semibold">DEPARTAMENTO</th>
                                    <th className="border border-black p-1 text-center w-16 font-semibold">PAÍS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="border border-black p-6 sm:p-8 text-center text-muted-foreground italic text-xs sm:text-sm">
                                            No hay registros de ingreso en este periodo.
                                        </td>
                                    </tr>
                                ) : (
                                    datos.map((fila, i) => (
                                        <tr key={i} className="print:break-inside-avoid">
                                            <td className="border border-black p-1 text-center font-bold">{fila.habitacion}</td>
                                            <td className="border border-black p-1 text-center">
                                                {format(new Date(fila.fecha_ingreso), 'HH:mm')}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {format(new Date(fila.fecha_ingreso), 'd/MM/yyyy')}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {format(new Date(fila.fecha_salida), 'HH:mm')}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {format(new Date(fila.fecha_salida), 'd/MM/yyyy')}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.es_titular ? fila.tarifa : ''}
                                            </td>
                                            <td className="border border-black p-1 text-center font-medium">
                                                {fila.es_titular ? fila.total : ''}
                                            </td>
                                            <td className="border border-black p-1 text-left">
                                                {fila.nombre_completo}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.tipo_documento}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.numero_documento}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.ciudad}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.departamento}
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                {fila.pais}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 sm:mt-8 hidden print:block text-xs text-center text-gray-500">
                        <p>Página legalizada N° _______</p>
                    </div>
                </div>
            )}

            {/* Mensaje inicial */}
            {!searched && (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-center">Selecciona un rango de meses y año para generar el libro de huéspedes.</p>
                    <p className="text-xs text-center mt-2 text-muted-foreground/70">Puedes consultar un solo mes o un rango completo</p>
                </div>
            )}

            <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
          body {
            background: white;
          }
          /* Ocultar elementos de navegación del layout principal si no tienen clase print:hidden */
          nav, aside, header {
            display: none !important;
          }
        }
      `}</style>
        </div>
    )
}
