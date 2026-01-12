'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  data: any[]
  mes: number
  anio: number
  hotelNombre: string
}

export function LibroHuespedesPrint({ data, mes, anio, hotelNombre }: Props) {
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ]

  return (
    <div className="bg-white text-black p-8 font-serif" id="libro-impresion">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #libro-impresion, #libro-impresion * { visibility: visible; }
          #libro-impresion { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 0;
          }
          @page { size: landscape; margin: 1cm; }
        }
      `}} />

      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">Registro de Huéspedes - Libro Oficial</h1>
        <p className="text-sm mt-1">{hotelNombre}</p>
        <p className="text-lg font-bold mt-2">MES: {meses[mes - 1]} {anio}</p>
      </div>

      <table className="w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1">HAB.</th>
            <th className="border border-black px-2 py-1">INGRESO (FECHA/HORA)</th>
            <th className="border border-black px-2 py-1">SALIDA (FECHA/HORA)</th>
            <th className="border border-black px-2 py-1">APELLIDOS Y NOMBRES</th>
            <th className="border border-black px-2 py-1">NACIONALIDAD</th>
            <th className="border border-black px-2 py-1">TIPO DOC.</th>
            <th className="border border-black px-2 py-1">NÚMERO DOC.</th>
            <th className="border border-black px-2 py-1">TARIFA</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-black px-2 py-8 text-center text-gray-500">
                No se registraron movimientos en este periodo.
              </td>
            </tr>
          ) : (
            data.map((r, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1 text-center font-bold">{r.habitacion_numero}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {format(new Date(r.check_in_real || r.fecha_entrada), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {r.check_out_real 
                    ? format(new Date(r.check_out_real), 'dd/MM/yyyy HH:mm') 
                    : format(new Date(r.fecha_salida), 'dd/MM/yyyy (Prev)')
                  }
                </td>
                <td className="border border-black px-2 py-1 uppercase">{r.titular_nombre}</td>
                <td className="border border-black px-2 py-1 text-center uppercase">{r.titular_nacionalidad || '-'}</td>
                <td className="border border-black px-2 py-1 text-center">{r.titular_tipo_doc}</td>
                <td className="border border-black px-2 py-1 text-center font-mono">{r.titular_numero_doc}</td>
                <td className="border border-black px-2 py-1 text-right font-bold">
                  {r.moneda_pactada} {Number(r.precio_pactado).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-8 flex justify-between text-[10px]">
        <p>Fecha de generación: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <div className="border-t border-black w-48 text-center pt-1 mt-8">
          Firma y Sello de Recepción
        </div>
      </div>
    </div>
  )
}
