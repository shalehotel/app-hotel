export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      caja_movimientos: {
        Row: {
          caja_turno_id: string
          categoria: string | null
          comprobante_referencia: string | null
          created_at: string | null
          evidencia_url: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda_enum"] | null
          monto: number
          motivo: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          caja_turno_id: string
          categoria?: string | null
          comprobante_referencia?: string | null
          created_at?: string | null
          evidencia_url?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_enum"] | null
          monto: number
          motivo: string
          tipo: string
          usuario_id: string
        }
        Update: {
          caja_turno_id?: string
          categoria?: string | null
          comprobante_referencia?: string | null
          created_at?: string | null
          evidencia_url?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_enum"] | null
          monto?: number
          motivo?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_movimientos_caja_turno_id_fkey"
            columns: ["caja_turno_id"]
            isOneToOne: false
            referencedRelation: "caja_turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      caja_turnos: {
        Row: {
          caja_id: string
          estado: string | null
          fecha_apertura: string | null
          fecha_cierre: string | null
          id: string
          monto_apertura: number | null
          monto_apertura_usd: number | null
          monto_cierre_declarado: number | null
          monto_cierre_declarado_usd: number | null
          monto_cierre_sistema: number | null
          monto_cierre_sistema_usd: number | null
          usuario_id: string
        }
        Insert: {
          caja_id: string
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          monto_apertura?: number | null
          monto_apertura_usd?: number | null
          monto_cierre_declarado?: number | null
          monto_cierre_declarado_usd?: number | null
          monto_cierre_sistema?: number | null
          monto_cierre_sistema_usd?: number | null
          usuario_id: string
        }
        Update: {
          caja_id?: string
          estado?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string | null
          id?: string
          monto_apertura?: number | null
          monto_apertura_usd?: number | null
          monto_cierre_declarado?: number | null
          monto_cierre_declarado_usd?: number | null
          monto_cierre_sistema?: number | null
          monto_cierre_sistema_usd?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_turnos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_turnos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas: {
        Row: {
          created_at: string | null
          estado: boolean | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          estado?: boolean | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          estado?: boolean | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      canales_venta: {
        Row: {
          activo: boolean | null
          comision_porcentaje: number | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          comision_porcentaje?: number | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          comision_porcentaje?: number | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      categorias_habitacion: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      comprobante_detalles: {
        Row: {
          cantidad: number
          codigo_afectacion_igv: string
          comprobante_id: string | null
          descripcion: string
          id: string
          precio_unitario: number
          subtotal: number
        }
        Insert: {
          cantidad: number
          codigo_afectacion_igv?: string
          comprobante_id?: string | null
          descripcion: string
          id?: string
          precio_unitario: number
          subtotal: number
        }
        Update: {
          cantidad?: number
          codigo_afectacion_igv?: string
          comprobante_id?: string | null
          descripcion?: string
          id?: string
          precio_unitario?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "comprobante_detalles_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobante_detalles_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "vw_historial_comprobantes"
            referencedColumns: ["id"]
          },
        ]
      }
      comprobantes: {
        Row: {
          cdr_url: string | null
          created_at: string | null
          estado_sunat: Database["public"]["Enums"]["estado_sunat_enum"] | null
          external_id: string | null
          fecha_emision: string | null
          hash_cpe: string | null
          id: string
          moneda: Database["public"]["Enums"]["moneda_enum"] | null
          monto_icbper: number | null
          monto_igv: number | null
          nota_credito_ref_id: string | null
          numero: number
          op_exoneradas: number | null
          op_gravadas: number | null
          op_inafectas: number | null
          receptor_direccion: string | null
          receptor_nro_doc: string
          receptor_razon_social: string
          receptor_tipo_doc: string
          reserva_id: string
          serie: string
          tipo_cambio: number | null
          tipo_comprobante: Database["public"]["Enums"]["tipo_comprobante_enum"]
          total_venta: number
          turno_caja_id: string
          xml_url: string | null
        }
        Insert: {
          cdr_url?: string | null
          created_at?: string | null
          estado_sunat?: Database["public"]["Enums"]["estado_sunat_enum"] | null
          external_id?: string | null
          fecha_emision?: string | null
          hash_cpe?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_enum"] | null
          monto_icbper?: number | null
          monto_igv?: number | null
          nota_credito_ref_id?: string | null
          numero: number
          op_exoneradas?: number | null
          op_gravadas?: number | null
          op_inafectas?: number | null
          receptor_direccion?: string | null
          receptor_nro_doc: string
          receptor_razon_social: string
          receptor_tipo_doc: string
          reserva_id: string
          serie: string
          tipo_cambio?: number | null
          tipo_comprobante: Database["public"]["Enums"]["tipo_comprobante_enum"]
          total_venta: number
          turno_caja_id: string
          xml_url?: string | null
        }
        Update: {
          cdr_url?: string | null
          created_at?: string | null
          estado_sunat?: Database["public"]["Enums"]["estado_sunat_enum"] | null
          external_id?: string | null
          fecha_emision?: string | null
          hash_cpe?: string | null
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_enum"] | null
          monto_icbper?: number | null
          monto_igv?: number | null
          nota_credito_ref_id?: string | null
          numero?: number
          op_exoneradas?: number | null
          op_gravadas?: number | null
          op_inafectas?: number | null
          receptor_direccion?: string | null
          receptor_nro_doc?: string
          receptor_razon_social?: string
          receptor_tipo_doc?: string
          reserva_id?: string
          serie?: string
          tipo_cambio?: number | null
          tipo_comprobante?: Database["public"]["Enums"]["tipo_comprobante_enum"]
          total_venta?: number
          turno_caja_id?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comprobantes_nota_credito_ref_id_fkey"
            columns: ["nota_credito_ref_id"]
            isOneToOne: false
            referencedRelation: "comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_nota_credito_ref_id_fkey"
            columns: ["nota_credito_ref_id"]
            isOneToOne: false
            referencedRelation: "vw_historial_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_turno_caja_id_fkey"
            columns: ["turno_caja_id"]
            isOneToOne: false
            referencedRelation: "caja_turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      habitaciones: {
        Row: {
          categoria_id: string
          created_at: string | null
          estado_limpieza:
            | Database["public"]["Enums"]["estado_limpieza_enum"]
            | null
          estado_ocupacion:
            | Database["public"]["Enums"]["estado_ocupacion_enum"]
            | null
          estado_servicio:
            | Database["public"]["Enums"]["estado_servicio_enum"]
            | null
          id: string
          numero: string
          piso: string | null
          tipo_id: string
          updated_at: string | null
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          estado_limpieza?:
            | Database["public"]["Enums"]["estado_limpieza_enum"]
            | null
          estado_ocupacion?:
            | Database["public"]["Enums"]["estado_ocupacion_enum"]
            | null
          estado_servicio?:
            | Database["public"]["Enums"]["estado_servicio_enum"]
            | null
          id?: string
          numero: string
          piso?: string | null
          tipo_id: string
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          estado_limpieza?:
            | Database["public"]["Enums"]["estado_limpieza_enum"]
            | null
          estado_ocupacion?:
            | Database["public"]["Enums"]["estado_ocupacion_enum"]
            | null
          estado_servicio?:
            | Database["public"]["Enums"]["estado_servicio_enum"]
            | null
          id?: string
          numero?: string
          piso?: string | null
          tipo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habitaciones_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_habitacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitaciones_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_habitacion"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_configuracion: {
        Row: {
          descripcion: string | null
          direccion_fiscal: string | null
          email: string | null
          es_exonerado_igv: boolean | null
          facturacion_activa: boolean | null
          hora_checkin: string | null
          hora_checkout: string | null
          id: string
          logo_url: string | null
          moneda_principal: string | null
          nombre_comercial: string | null
          pagina_web: string | null
          proveedor_sunat_config: Json | null
          razon_social: string
          ruc: string
          tasa_icbper: number | null
          tasa_igv: number | null
          telefono: string | null
          ubigeo_codigo: string | null
          updated_at: string | null
        }
        Insert: {
          descripcion?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          es_exonerado_igv?: boolean | null
          facturacion_activa?: boolean | null
          hora_checkin?: string | null
          hora_checkout?: string | null
          id?: string
          logo_url?: string | null
          moneda_principal?: string | null
          nombre_comercial?: string | null
          pagina_web?: string | null
          proveedor_sunat_config?: Json | null
          razon_social: string
          ruc: string
          tasa_icbper?: number | null
          tasa_igv?: number | null
          telefono?: string | null
          ubigeo_codigo?: string | null
          updated_at?: string | null
        }
        Update: {
          descripcion?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          es_exonerado_igv?: boolean | null
          facturacion_activa?: boolean | null
          hora_checkin?: string | null
          hora_checkout?: string | null
          id?: string
          logo_url?: string | null
          moneda_principal?: string | null
          nombre_comercial?: string | null
          pagina_web?: string | null
          proveedor_sunat_config?: Json | null
          razon_social?: string
          ruc?: string
          tasa_icbper?: number | null
          tasa_igv?: number | null
          telefono?: string | null
          ubigeo_codigo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      huespedes: {
        Row: {
          apellidos: string
          correo: string | null
          created_at: string | null
          es_frecuente: boolean | null
          fecha_nacimiento: string | null
          id: string
          nacionalidad: string | null
          nombres: string
          notas_internas: string | null
          numero_documento: string
          procedencia_departamento: string | null
          telefono: string | null
          tipo_documento: string
        }
        Insert: {
          apellidos: string
          correo?: string | null
          created_at?: string | null
          es_frecuente?: boolean | null
          fecha_nacimiento?: string | null
          id?: string
          nacionalidad?: string | null
          nombres: string
          notas_internas?: string | null
          numero_documento: string
          procedencia_departamento?: string | null
          telefono?: string | null
          tipo_documento: string
        }
        Update: {
          apellidos?: string
          correo?: string | null
          created_at?: string | null
          es_frecuente?: boolean | null
          fecha_nacimiento?: string | null
          id?: string
          nacionalidad?: string | null
          nombres?: string
          notas_internas?: string | null
          numero_documento?: string
          procedencia_departamento?: string | null
          telefono?: string | null
          tipo_documento?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          caja_turno_id: string
          comprobante_id: string | null
          fecha_pago: string | null
          id: string
          metodo_pago: string
          moneda_pago: Database["public"]["Enums"]["moneda_enum"] | null
          monto: number
          nota: string | null
          referencia_pago: string | null
          reserva_id: string
          tipo_cambio_pago: number | null
        }
        Insert: {
          caja_turno_id: string
          comprobante_id?: string | null
          fecha_pago?: string | null
          id?: string
          metodo_pago: string
          moneda_pago?: Database["public"]["Enums"]["moneda_enum"] | null
          monto: number
          nota?: string | null
          referencia_pago?: string | null
          reserva_id: string
          tipo_cambio_pago?: number | null
        }
        Update: {
          caja_turno_id?: string
          comprobante_id?: string | null
          fecha_pago?: string | null
          id?: string
          metodo_pago?: string
          moneda_pago?: Database["public"]["Enums"]["moneda_enum"] | null
          monto?: number
          nota?: string | null
          referencia_pago?: string | null
          reserva_id?: string
          tipo_cambio_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_caja_turno_id_fkey"
            columns: ["caja_turno_id"]
            isOneToOne: false
            referencedRelation: "caja_turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "vw_historial_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_huespedes: {
        Row: {
          created_at: string | null
          es_titular: boolean | null
          huesped_id: string | null
          id: string
          reserva_id: string | null
        }
        Insert: {
          created_at?: string | null
          es_titular?: boolean | null
          huesped_id?: string | null
          id?: string
          reserva_id?: string | null
        }
        Update: {
          created_at?: string | null
          es_titular?: boolean | null
          huesped_id?: string | null
          id?: string
          reserva_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserva_huespedes_huesped_id_fkey"
            columns: ["huesped_id"]
            isOneToOne: false
            referencedRelation: "huespedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_huespedes_huesped_id_fkey"
            columns: ["huesped_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["titular_id"]
          },
          {
            foreignKeyName: "reserva_huespedes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_huespedes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          autorizado_descuento: boolean | null
          canal_venta_id: string | null
          check_in_real: string | null
          check_out_real: string | null
          codigo_reserva: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_reserva_enum"] | null
          fecha_entrada: string
          fecha_salida: string
          habitacion_id: string | null
          huesped_presente: boolean | null
          id: string
          moneda_pactada: Database["public"]["Enums"]["moneda_enum"] | null
          precio_base_tarifa: number | null
          precio_pactado: number
          updated_at: string | null
        }
        Insert: {
          autorizado_descuento?: boolean | null
          canal_venta_id?: string | null
          check_in_real?: string | null
          check_out_real?: string | null
          codigo_reserva?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva_enum"] | null
          fecha_entrada: string
          fecha_salida: string
          habitacion_id?: string | null
          huesped_presente?: boolean | null
          id?: string
          moneda_pactada?: Database["public"]["Enums"]["moneda_enum"] | null
          precio_base_tarifa?: number | null
          precio_pactado: number
          updated_at?: string | null
        }
        Update: {
          autorizado_descuento?: boolean | null
          canal_venta_id?: string | null
          check_in_real?: string | null
          check_out_real?: string | null
          codigo_reserva?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_reserva_enum"] | null
          fecha_entrada?: string
          fecha_salida?: string
          habitacion_id?: string | null
          huesped_presente?: boolean | null
          id?: string
          moneda_pactada?: Database["public"]["Enums"]["moneda_enum"] | null
          precio_base_tarifa?: number | null
          precio_pactado?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_canal_venta_id_fkey"
            columns: ["canal_venta_id"]
            isOneToOne: false
            referencedRelation: "canales_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "vw_habitaciones_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["habitacion_id"]
          },
        ]
      }
      series_comprobante: {
        Row: {
          caja_id: string | null
          correlativo_actual: number
          id: string
          serie: string
          tipo_comprobante: Database["public"]["Enums"]["tipo_comprobante_enum"]
        }
        Insert: {
          caja_id?: string | null
          correlativo_actual?: number
          id?: string
          serie: string
          tipo_comprobante: Database["public"]["Enums"]["tipo_comprobante_enum"]
        }
        Update: {
          caja_id?: string | null
          correlativo_actual?: number
          id?: string
          serie?: string
          tipo_comprobante?: Database["public"]["Enums"]["tipo_comprobante_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "series_comprobante_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas: {
        Row: {
          activa: boolean | null
          categoria_habitacion_id: string | null
          created_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre_tarifa: string
          precio_base: number
          precio_minimo: number
          tipo_habitacion_id: string | null
        }
        Insert: {
          activa?: boolean | null
          categoria_habitacion_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_tarifa: string
          precio_base: number
          precio_minimo: number
          tipo_habitacion_id?: string | null
        }
        Update: {
          activa?: boolean | null
          categoria_habitacion_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_tarifa?: string
          precio_base?: number
          precio_minimo?: number
          tipo_habitacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_categoria_habitacion_id_fkey"
            columns: ["categoria_habitacion_id"]
            isOneToOne: false
            referencedRelation: "categorias_habitacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifas_tipo_habitacion_id_fkey"
            columns: ["tipo_habitacion_id"]
            isOneToOne: false
            referencedRelation: "tipos_habitacion"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_habitacion: {
        Row: {
          capacidad_personas: number
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          capacidad_personas?: number
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          capacidad_personas?: number
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apellidos: string | null
          created_at: string | null
          estado: boolean | null
          id: string
          nombres: string
          rol: Database["public"]["Enums"]["rol_usuario_enum"]
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          estado?: boolean | null
          id: string
          nombres: string
          rol?: Database["public"]["Enums"]["rol_usuario_enum"]
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          estado?: boolean | null
          id?: string
          nombres?: string
          rol?: Database["public"]["Enums"]["rol_usuario_enum"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_habitaciones_disponibles: {
        Row: {
          capacidad_personas: number | null
          categoria: string | null
          estado_visual: string | null
          id: string | null
          numero: string | null
          piso: string | null
          precio_sugerido: number | null
          tipo: string | null
        }
        Relationships: []
      }
      vw_historial_comprobantes: {
        Row: {
          caja_id: string | null
          cdr_url: string | null
          cliente_doc: string | null
          cliente_nombre: string | null
          created_at: string | null
          emisor_nombre: string | null
          emisor_rol: Database["public"]["Enums"]["rol_usuario_enum"] | null
          estado_sunat: Database["public"]["Enums"]["estado_sunat_enum"] | null
          external_id: string | null
          fecha_emision: string | null
          hash_cpe: string | null
          id: string | null
          moneda: Database["public"]["Enums"]["moneda_enum"] | null
          monto_icbper: number | null
          monto_igv: number | null
          nota_credito_ref_id: string | null
          numero: number | null
          op_exoneradas: number | null
          op_gravadas: number | null
          op_inafectas: number | null
          receptor_direccion: string | null
          receptor_tipo_doc: string | null
          reserva_id: string | null
          serie: string | null
          tipo_cambio: number | null
          tipo_comprobante:
            | Database["public"]["Enums"]["tipo_comprobante_enum"]
            | null
          total_venta: number | null
          turno_caja_id: string | null
          usuario_id: string | null
          xml_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caja_turnos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_turnos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_nota_credito_ref_id_fkey"
            columns: ["nota_credito_ref_id"]
            isOneToOne: false
            referencedRelation: "comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_nota_credito_ref_id_fkey"
            columns: ["nota_credito_ref_id"]
            isOneToOne: false
            referencedRelation: "vw_historial_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "vw_reservas_con_datos_basicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprobantes_turno_caja_id_fkey"
            columns: ["turno_caja_id"]
            isOneToOne: false
            referencedRelation: "caja_turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_reservas_con_datos_basicos: {
        Row: {
          categoria_habitacion: string | null
          check_in_real: string | null
          check_out_real: string | null
          codigo_reserva: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_reserva_enum"] | null
          fecha_entrada: string | null
          fecha_salida: string | null
          habitacion_id: string | null
          habitacion_numero: string | null
          habitacion_piso: string | null
          huesped_presente: boolean | null
          id: string | null
          moneda_pactada: Database["public"]["Enums"]["moneda_enum"] | null
          precio_pactado: number | null
          tipo_habitacion: string | null
          titular_correo: string | null
          titular_id: string | null
          titular_nacionalidad: string | null
          titular_nombre: string | null
          titular_numero_doc: string | null
          titular_telefono: string | null
          titular_tipo_doc: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_movimientos_turno: {
        Args: { p_turno_id: string }
        Returns: {
          total_egresos_pen: number
          total_egresos_usd: number
          total_ingresos_pen: number
          total_ingresos_usd: number
        }[]
      }
      obtener_siguiente_correlativo: {
        Args: { p_serie: string }
        Returns: number
      }
    }
    Enums: {
      estado_limpieza_enum: "LIMPIA" | "SUCIA" | "EN_LIMPIEZA"
      estado_ocupacion_enum: "LIBRE" | "OCUPADA"
      estado_reserva_enum:
        | "RESERVADA"
        | "CHECKED_IN"
        | "CHECKED_OUT"
        | "CANCELADA"
        | "NO_SHOW"
      estado_servicio_enum: "OPERATIVA" | "MANTENIMIENTO" | "FUERA_SERVICIO"
      estado_sunat_enum: "PENDIENTE" | "ACEPTADO" | "RECHAZADO" | "ANULADO"
      moneda_enum: "PEN" | "USD"
      rol_usuario_enum: "ADMIN" | "RECEPCION" | "HOUSEKEEPING"
      tipo_comprobante_enum:
        | "BOLETA"
        | "FACTURA"
        | "NOTA_CREDITO"
        | "TICKET_INTERNO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_limpieza_enum: ["LIMPIA", "SUCIA", "EN_LIMPIEZA"],
      estado_ocupacion_enum: ["LIBRE", "OCUPADA"],
      estado_reserva_enum: [
        "RESERVADA",
        "CHECKED_IN",
        "CHECKED_OUT",
        "CANCELADA",
        "NO_SHOW",
      ],
      estado_servicio_enum: ["OPERATIVA", "MANTENIMIENTO", "FUERA_SERVICIO"],
      estado_sunat_enum: ["PENDIENTE", "ACEPTADO", "RECHAZADO", "ANULADO"],
      moneda_enum: ["PEN", "USD"],
      rol_usuario_enum: ["ADMIN", "RECEPCION", "HOUSEKEEPING"],
      tipo_comprobante_enum: [
        "BOLETA",
        "FACTURA",
        "NOTA_CREDITO",
        "TICKET_INTERNO",
      ],
    },
  },
} as const
