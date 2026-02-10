'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  getAuditLogs, 
  getAuditStats,
  getTablesWithAudit,
  getUsuariosConActividad,
  type AuditLogEntry,
  type AuditFiltros
} from '@/lib/actions/auditoria'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Activity,
  TrendingUp,
  Users,
  Database,
  FileText,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<any>(null)
  const [tablas, setTablas] = useState<string[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null)

  // Filtros
  const [filtros, setFiltros] = useState<AuditFiltros>({
    fecha_inicio: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    limite: 100
  })

  useEffect(() => {
    cargarDatos()
    cargarOpciones()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [resultLogs, resultStats] = await Promise.all([
      getAuditLogs(filtros),
      getAuditStats(filtros.fecha_inicio, filtros.fecha_fin)
    ])

    if (resultLogs.success) {
      setLogs(resultLogs.data || [])
    }

    if (resultStats.success) {
      setStats(resultStats.stats)
    }

    setLoading(false)
  }

  const cargarOpciones = async () => {
    const [resultTablas, resultUsuarios] = await Promise.all([
      getTablesWithAudit(),
      getUsuariosConActividad()
    ])

    setTablas(resultTablas)
    setUsuarios(resultUsuarios)
  }

  const aplicarFiltros = () => {
    cargarDatos()
  }

  const limpiarFiltros = () => {
    setFiltros({
      fecha_inicio: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      fecha_fin: format(new Date(), 'yyyy-MM-dd'),
      limite: 100
    })
  }

  const exportarCSV = () => {
    const headers = ['Fecha/Hora', 'Usuario', 'Operación', 'Tabla', 'Registro ID']
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      log.usuario_nombre || 'Sistema',
      log.operacion,
      log.tabla,
      log.registro_id
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    link.click()

    toast.success('Auditoría exportada correctamente')
  }

  const getOperationBadge = (operacion: string) => {
    const variants = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive'
    } as const

    const colors = {
      INSERT: 'text-green-600',
      UPDATE: 'text-blue-600',
      DELETE: 'text-red-600'
    } as const

    return (
      <Badge variant={variants[operacion as keyof typeof variants] || 'outline'}>
        <span className={colors[operacion as keyof typeof colors]}>
          {operacion}
        </span>
      </Badge>
    )
  }

  const verDetalle = (log: AuditLogEntry) => {
    setDetailLog(log)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Auditoría del Sistema</h2>
          <p className="text-muted-foreground">
            Registro completo de todas las operaciones realizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
              <CardTitle className="text-xs font-medium">Total</CardTitle>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold">{stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
              <CardTitle className="text-xs font-medium">Inserciones</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-green-600">
                {stats.porOperacion.INSERT || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
              <CardTitle className="text-xs font-medium">Actualizaciones</CardTitle>
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-blue-600">
                {stats.porOperacion.UPDATE || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
              <CardTitle className="text-xs font-medium">Eliminaciones</CardTitle>
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-red-600">
                {stats.porOperacion.DELETE || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="fecha_inicio" className="text-xs">Desde</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={filtros.fecha_inicio || ''}
                onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fecha_fin" className="text-xs">Hasta</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={filtros.fecha_fin || ''}
                onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1 min-w-[140px]">
              <Label htmlFor="tabla" className="text-xs">Tabla</Label>
              <Select
                value={filtros.tabla || 'todas'}
                onValueChange={(value) => setFiltros({ ...filtros, tabla: value === 'todas' ? undefined : value })}
              >
                <SelectTrigger id="tabla" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {tablas.map((tabla) => (
                    <SelectItem key={tabla} value={tabla}>
                      {tabla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[140px]">
              <Label htmlFor="usuario" className="text-xs">Usuario</Label>
              <Select
                value={filtros.usuario_id || 'todos'}
                onValueChange={(value) => setFiltros({ ...filtros, usuario_id: value === 'todos' ? undefined : value })}
              >
                <SelectTrigger id="usuario" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[120px]">
              <Label htmlFor="operacion" className="text-xs">Operación</Label>
              <Select
                value={filtros.operacion || 'todas'}
                onValueChange={(value) => setFiltros({ ...filtros, operacion: value === 'todas' ? undefined : value })}
              >
                <SelectTrigger id="operacion" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={aplicarFiltros} disabled={loading} size="sm" className="h-8">
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Buscar
            </Button>
            <Button variant="outline" onClick={limpiarFiltros} size="sm" className="h-8">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoría</CardTitle>
          <CardDescription>
            Mostrando {logs.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No hay registros</h3>
              <p className="text-sm text-muted-foreground">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Tabla</TableHead>
                    <TableHead>Registro ID</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {log.usuario_nombre || 'Sistema'}
                        </div>
                      </TableCell>
                      <TableCell>{getOperationBadge(log.operacion)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.tabla}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.registro_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verDetalle(log)}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Operación</DialogTitle>
            <DialogDescription>
              {detailLog && format(new Date(detailLog.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Operación</Label>
                  <div className="mt-1">{getOperationBadge(detailLog.operacion)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Usuario</Label>
                  <p className="mt-1">{detailLog.usuario_nombre || 'Sistema'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tabla</Label>
                  <p className="mt-1 font-mono text-sm">{detailLog.tabla}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Registro ID</Label>
                  <p className="mt-1 font-mono text-xs break-all">{detailLog.registro_id}</p>
                </div>
                {detailLog.ip_address && (
                  <div>
                    <Label className="text-xs text-muted-foreground">IP</Label>
                    <p className="mt-1 font-mono text-sm">{detailLog.ip_address}</p>
                  </div>
                )}
              </div>

              {detailLog.datos_antes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Datos Anteriores</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(detailLog.datos_antes, null, 2)}
                  </pre>
                </div>
              )}

              {detailLog.datos_despues && (
                <div>
                  <Label className="text-xs text-muted-foreground">Datos Nuevos</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(detailLog.datos_despues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
