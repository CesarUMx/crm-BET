import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { studentsApi, type ImportResult } from './api'
import { coursesApi } from '../courses/api'
import { groupsApi } from '../groups/api'

interface ImportStudentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportStudentsModal({ open, onOpenChange }: ImportStudentsModalProps) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [enrollEnabled, setEnrollEnabled] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [groupId, setGroupId] = useState('')

  const { data: courses } = useQuery({
    queryKey: ['courses-for-import'],
    queryFn: () => coursesApi.list({ status: 'OPEN', pageSize: 100 }).then((r) => r.data.data),
    enabled: enrollEnabled,
  })

  const { data: groups } = useQuery({
    queryKey: ['groups-for-import', courseId],
    queryFn: () => groupsApi.listByCourse(courseId).then((r) => r.data.data),
    enabled: enrollEnabled && !!courseId,
  })

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error al importar el archivo'

  const downloadMut = useMutation({
    mutationFn: () => studentsApi.downloadTemplate(),
    onSuccess: (res) => {
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'plantilla-alumnos.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: () => toast.error('Error al descargar la plantilla'),
  })

  const importMut = useMutation({
    mutationFn: (file: File) => studentsApi.import(file, enrollEnabled ? courseId : undefined, enrollEnabled ? groupId || undefined : undefined),
    onSuccess: (res) => {
      setResult(res.data.data)
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      const { studentsCreated, enrolled, errors } = res.data.data
      if (studentsCreated > 0) toast.success(`${studentsCreated} alumno(s) nuevo(s) creado(s)`)
      if (enrolled > 0) toast.success(`${enrolled} inscripción(es) realizada(s)`)
      if (errors.length > 0) toast.warning(`${errors.length} fila(s) con errores`)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedFile(null)
      setResult(null)
      setEnrollEnabled(false)
      setCourseId('')
      setGroupId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    onOpenChange(v)
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title="Importar alumnos desde Excel" maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        {/* Paso 1: descargar plantilla */}
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">1. Descarga la plantilla</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Llena las columnas con los datos de cada alumno. No cambies el orden ni los encabezados.
          </p>
          <Button variant="secondary" size="sm" loading={downloadMut.isPending} onClick={() => downloadMut.mutate()}>
            <Download className="size-4" />
            Descargar plantilla (.xlsx)
          </Button>
        </div>

        {/* Paso 2: inscripción opcional al importar */}
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              className="size-4 accent-[#E9511D]"
              checked={enrollEnabled}
              onChange={(e) => { setEnrollEnabled(e.target.checked); setCourseId(''); setGroupId('') }}
            />
            <Users className="size-4" />
            Inscribir a todos en un curso/grupo
          </label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Si un alumno ya existe (mismo correo), se reutiliza sin duplicarlo; solo se crea si es nuevo.
          </p>

          {enrollEnabled && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Curso</label>
                <select
                  className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none"
                  value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setGroupId('') }}
                >
                  <option value="">Selecciona un curso…</option>
                  {(courses ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Grupo (opcional)</label>
                <select
                  className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none disabled:opacity-50"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={!courseId}
                >
                  <option value="">Sin grupo asignado</option>
                  {(groups ?? []).filter((g) => !g.isExpired).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Paso 3: subir archivo */}
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">3. Sube el archivo lleno</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setSelectedFile(file)
              setResult(null)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-md border border-dashed border-[var(--border-soft)] px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-surface)]"
          >
            <FileSpreadsheet className="size-5 shrink-0 text-[var(--text-muted)]" />
            {selectedFile ? selectedFile.name : 'Selecciona un archivo .xlsx…'}
          </button>

          <Button
            variant="brand"
            size="sm"
            className="mt-3 w-full"
            disabled={!selectedFile || (enrollEnabled && !courseId)}
            loading={importMut.isPending}
            onClick={() => selectedFile && importMut.mutate(selectedFile)}
          >
            <Upload className="size-4" />
            Subir e importar
          </Button>
        </div>

        {/* Resultado */}
        {result && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-md bg-green-600/15 px-3 py-2 text-sm text-green-500">
              <CheckCircle2 className="size-4 shrink-0" />
              {result.studentsCreated} nuevo(s) · {result.studentsReused} existente(s) reutilizado(s)
              {enrollEnabled && ` · ${result.enrolled} inscrito(s)`}
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-md bg-red-600/15 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  {result.errors.length} fila(s) con errores
                </div>
                <ul className="max-h-32 overflow-y-auto text-xs text-red-400/90">
                  {result.errors.map((e, i) => (
                    <li key={i}>Fila {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={() => handleClose(false)}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
