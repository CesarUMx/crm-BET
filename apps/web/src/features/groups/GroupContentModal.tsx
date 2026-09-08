import { useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Trash2, Download, Link as LinkIcon, Video, Image as ImageIcon,
  FileText, CalendarDays, Pencil, FolderPlus, Check, X, Users, Contact2,
  ClipboardList, ClipboardCheck, ExternalLink,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { materialsApi, type GroupMaterialRow } from '../materials/api'
import { materialSectionsApi, type MaterialSectionRow } from '../material-sections/api'
import { classSessionsApi, type ClassSessionRow } from '../class-sessions/api'
import { deliverablesApi, type DeliverableRow } from '../deliverables/api'
import { evaluationsApi, type EvaluationRow } from '../evaluations/api'
import { groupsApi, type GroupEnrollmentRow } from './api'

interface GroupContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
  canManage: boolean // false para Alumno (solo lectura)
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

function MaterialIcon({ type, fileName }: { type: string; fileName: string | null }) {
  if (type === 'LINK') return <LinkIcon className="size-4 text-[#4FC3F7]" />
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return <Video className="size-4 text-[#FF6E00]" />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <ImageIcon className="size-4 text-green-500" />
  return <FileText className="size-4 text-[var(--text-muted)]" />
}

function calcAge(birthDate: string): number {
  const hoy = new Date()
  const nacimiento = new Date(birthDate)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

interface MaterialItemProps {
  material: GroupMaterialRow
  canManage: boolean
  downloadMut: { mutate: (m: GroupMaterialRow) => void; isPending: boolean }
  onDelete: () => void
}

function MaterialItem({ material: m, canManage, downloadMut, onDelete }: MaterialItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <MaterialIcon type={m.type} fileName={m.fileName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{m.title}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {m.type === 'LINK' ? m.externalUrl : `${m.fileName ?? ''} ${formatBytes(m.fileSize)}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {m.type === 'DOCUMENT' ? (
          <Button variant="ghost" size="sm" title="Descargar" loading={downloadMut.isPending} onClick={() => downloadMut.mutate(m)}>
            <Download className="size-3.5" />
          </Button>
        ) : (
          <a href={m.externalUrl ?? '#'} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" title="Abrir enlace" type="button">
              <LinkIcon className="size-3.5" />
            </Button>
          </a>
        )}
        {canManage && (
          <Button variant="ghost" size="sm" title="Eliminar" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function GroupContentModal({ open, onOpenChange, groupId, groupName, canManage }: GroupContentModalProps) {
  const qc = useQueryClient()

  // ── Material ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<GroupMaterialRow | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: materials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', groupId],
    queryFn: () => materialsApi.listByGroup(groupId).then((r) => r.data.data),
    enabled: open,
  })

  // ── Secciones de material ─────────────────────────────────────────────────
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [editSectionTarget, setEditSectionTarget] = useState<MaterialSectionRow | null>(null)
  const [editSectionTitle, setEditSectionTitle] = useState('')
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<MaterialSectionRow | null>(null)

  const { data: sections } = useQuery({
    queryKey: ['material-sections', groupId],
    queryFn: () => materialSectionsApi.listByGroup(groupId).then((r) => r.data.data),
    enabled: open,
  })

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error inesperado'

  const createSectionMut = useMutation({
    mutationFn: () => materialSectionsApi.create(groupId, newSectionTitle),
    onSuccess: () => {
      toast.success('Sección creada')
      qc.invalidateQueries({ queryKey: ['material-sections', groupId] })
      setNewSectionTitle('')
      setAddingSection(false)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const renameSectionMut = useMutation({
    mutationFn: () => materialSectionsApi.update(editSectionTarget!.id, editSectionTitle),
    onSuccess: () => {
      toast.success('Sección actualizada')
      qc.invalidateQueries({ queryKey: ['material-sections', groupId] })
      setEditSectionTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const deleteSectionMut = useMutation({
    mutationFn: (id: string) => materialSectionsApi.remove(id),
    onSuccess: () => {
      toast.success('Sección eliminada')
      qc.invalidateQueries({ queryKey: ['material-sections', groupId] })
      qc.invalidateQueries({ queryKey: ['materials', groupId] })
      setDeleteSectionTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const uploadMut = useMutation({
    mutationFn: async () => {
      const sectionId = selectedSectionId || undefined
      if (uploadMode === 'link') return materialsApi.createLink(groupId, title, linkUrl, sectionId)
      const file = fileInputRef.current?.files?.[0]
      if (!file) throw new Error('Selecciona un archivo')
      return materialsApi.createDocument(groupId, title, file, setUploadProgress, sectionId)
    },
    onSuccess: () => {
      toast.success('Material agregado')
      qc.invalidateQueries({ queryKey: ['materials', groupId] })
      setTitle('')
      setLinkUrl('')
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err) => { toast.error(errMsg(err)); setUploadProgress(null) },
  })

  const deleteMaterialMut = useMutation({
    mutationFn: (id: string) => materialsApi.remove(id),
    onSuccess: () => {
      toast.success('Material eliminado')
      qc.invalidateQueries({ queryKey: ['materials', groupId] })
      setDeleteMaterialTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const downloadMut = useMutation({
    mutationFn: (m: GroupMaterialRow) => materialsApi.download(m.id).then((r) => ({ res: r, m })),
    onSuccess: ({ res, m }) => {
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = m.fileName ?? m.title
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: () => toast.error('Error al descargar el archivo'),
  })

  // ── Entregables ───────────────────────────────────────────────────────────
  const [deliverableTitle, setDeliverableTitle] = useState('')
  const [deliverableDescription, setDeliverableDescription] = useState('')
  const [deliverableDueDate, setDeliverableDueDate] = useState('')
  const [deleteDeliverableTarget, setDeleteDeliverableTarget] = useState<DeliverableRow | null>(null)

  const { data: deliverables, isLoading: loadingDeliverables } = useQuery({
    queryKey: ['deliverables', groupId],
    queryFn: () => deliverablesApi.listByGroup(groupId).then((r) => r.data.data),
    enabled: open,
  })

  const createDeliverableMut = useMutation({
    mutationFn: () => deliverablesApi.create(groupId, {
      title: deliverableTitle,
      description: deliverableDescription || undefined,
      dueDate: deliverableDueDate || undefined,
    }),
    onSuccess: () => {
      toast.success('Entregable agregado')
      qc.invalidateQueries({ queryKey: ['deliverables', groupId] })
      setDeliverableTitle('')
      setDeliverableDescription('')
      setDeliverableDueDate('')
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const deleteDeliverableMut = useMutation({
    mutationFn: (id: string) => deliverablesApi.remove(id),
    onSuccess: () => {
      toast.success('Entregable eliminado')
      qc.invalidateQueries({ queryKey: ['deliverables', groupId] })
      setDeleteDeliverableTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  // ── Evaluación (liga a Google Forms / Microsoft Forms) ──────────────────────
  const [evaluationTitle, setEvaluationTitle] = useState('')
  const [evaluationDescription, setEvaluationDescription] = useState('')
  const [evaluationUrl, setEvaluationUrl] = useState('')
  const [deleteEvaluationTarget, setDeleteEvaluationTarget] = useState<EvaluationRow | null>(null)

  const { data: evaluations, isLoading: loadingEvaluations } = useQuery({
    queryKey: ['evaluations', groupId],
    queryFn: () => evaluationsApi.listByGroup(groupId).then((r) => r.data.data),
    enabled: open,
  })

  const createEvaluationMut = useMutation({
    mutationFn: () => evaluationsApi.create(groupId, {
      title: evaluationTitle,
      description: evaluationDescription || undefined,
      externalUrl: evaluationUrl,
    }),
    onSuccess: () => {
      toast.success('Evaluación agregada')
      qc.invalidateQueries({ queryKey: ['evaluations', groupId] })
      setEvaluationTitle('')
      setEvaluationDescription('')
      setEvaluationUrl('')
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const deleteEvaluationMut = useMutation({
    mutationFn: (id: string) => evaluationsApi.remove(id),
    onSuccess: () => {
      toast.success('Evaluación eliminada')
      qc.invalidateQueries({ queryKey: ['evaluations', groupId] })
      setDeleteEvaluationTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  // ── Inscritos (roster del grupo; solo Docente/Admin) ────────────────────────
  const [studentDetailTarget, setStudentDetailTarget] = useState<GroupEnrollmentRow | null>(null)

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['group-enrollments', groupId],
    queryFn: () => groupsApi.listEnrollments(groupId).then((r) => r.data.data),
    enabled: open && canManage,
  })

  // ── Sesiones ──────────────────────────────────────────────────────────────
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTopic, setSessionTopic] = useState('')
  const [sessionRecording, setSessionRecording] = useState('')
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<ClassSessionRow | null>(null)
  const [editSessionTarget, setEditSessionTarget] = useState<ClassSessionRow | null>(null)

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', groupId],
    queryFn: () => classSessionsApi.listByGroup(groupId).then((r) => r.data.data),
    enabled: open,
  })

  const createSessionMut = useMutation({
    mutationFn: () => classSessionsApi.create(groupId, {
      date: sessionDate,
      topic: sessionTopic || undefined,
      recordingUrl: sessionRecording || undefined,
    }),
    onSuccess: () => {
      toast.success('Sesión agregada')
      qc.invalidateQueries({ queryKey: ['sessions', groupId] })
      setSessionDate('')
      setSessionTopic('')
      setSessionRecording('')
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const updateSessionMut = useMutation({
    mutationFn: (data: { id: string; recordingUrl: string }) =>
      classSessionsApi.update(data.id, { recordingUrl: data.recordingUrl }),
    onSuccess: () => {
      toast.success('Sesión actualizada')
      qc.invalidateQueries({ queryKey: ['sessions', groupId] })
      setEditSessionTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const deleteSessionMut = useMutation({
    mutationFn: (id: string) => classSessionsApi.remove(id),
    onSuccess: () => {
      toast.success('Sesión eliminada')
      qc.invalidateQueries({ queryKey: ['sessions', groupId] })
      setDeleteSessionTarget(null)
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={`${groupName} — Material y sesiones`} maxWidth="max-w-2xl" preventOutsideClose>
        <Tabs.Root defaultValue="materials">
          <Tabs.List className="flex gap-2 border-b border-[var(--border-soft)]">
            <Tabs.Trigger value="materials" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors">
              Material de apoyo
            </Tabs.Trigger>
            <Tabs.Trigger value="sessions" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors">
              Sesiones de clase
            </Tabs.Trigger>
            <Tabs.Trigger value="deliverables" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors">
              Entregables
            </Tabs.Trigger>
            <Tabs.Trigger value="evaluation" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors">
              Evaluación
            </Tabs.Trigger>
            {canManage && (
              <Tabs.Trigger value="enrolled" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors">
                Inscritos
              </Tabs.Trigger>
            )}
          </Tabs.List>

          {/* ── Material de apoyo ── */}
          <Tabs.Content value="materials" className="flex h-[60vh] flex-col gap-4 overflow-y-auto pt-4">
            {canManage && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <div className="mb-3 flex gap-2">
                  <button type="button" onClick={() => setUploadMode('file')} className={`rounded-full px-3 py-1 text-xs font-medium ${uploadMode === 'file' ? 'bg-[#E9511D] text-white' : 'text-[var(--text-secondary)] border border-[var(--border-soft)]'}`}>
                    Subir archivo
                  </button>
                  <button type="button" onClick={() => setUploadMode('link')} className={`rounded-full px-3 py-1 text-xs font-medium ${uploadMode === 'link' ? 'bg-[#E9511D] text-white' : 'text-[var(--text-secondary)] border border-[var(--border-soft)]'}`}>
                    Solo enlace
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <Input dark label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Presentación tema 1" />
                  {uploadMode === 'file' ? (
                    <input ref={fileInputRef} type="file" className="text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-full file:border-0 file:bg-[#004A87] file:px-3 file:py-1.5 file:text-xs file:text-white" />
                  ) : (
                    <Input dark label="URL externa" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Sección (opcional)</label>
                    <select
                      className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none"
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                    >
                      <option value="">General</option>
                      {(sections ?? []).map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                  {uploadProgress !== null && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--hover-surface-strong)]">
                      <div className="h-full bg-[#FF6E00] transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <Button variant="brand" size="sm" disabled={!title} loading={uploadMut.isPending} onClick={() => uploadMut.mutate()}>
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            )}

            {canManage && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Secciones</p>
                {!addingSection ? (
                  <Button variant="secondary" size="sm" onClick={() => setAddingSection(true)}>
                    <FolderPlus className="size-3.5" />
                    Nueva sección
                  </Button>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      dark
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Ej. Ecuaciones diferenciales"
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" title="Guardar" disabled={!newSectionTitle} loading={createSectionMut.isPending} onClick={() => createSectionMut.mutate()}>
                      <Check className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Cancelar" onClick={() => { setAddingSection(false); setNewSectionTitle('') }}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {loadingMaterials ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : !materials || materials.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-8 text-center text-sm text-[var(--text-muted)]">
                Sin material de apoyo
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {(sections ?? []).map((s) => {
                  const sectionMaterials = materials.filter((m) => m.sectionId === s.id)
                  return (
                    <div key={s.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        {editSectionTarget?.id === s.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input dark value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} className="flex-1" />
                            <Button variant="ghost" size="sm" title="Guardar" disabled={!editSectionTitle} loading={renameSectionMut.isPending} onClick={() => renameSectionMut.mutate()}>
                              <Check className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Cancelar" onClick={() => setEditSectionTarget(null)}>
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
                            {canManage && (
                              <div className="flex shrink-0 items-center gap-1">
                                <Button variant="ghost" size="sm" title="Renombrar sección" onClick={() => { setEditSectionTarget(s); setEditSectionTitle(s.title) }}>
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Eliminar sección" onClick={() => setDeleteSectionTarget(s)}>
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {sectionMaterials.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">Sin material en esta sección</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {sectionMaterials.map((m) => (
                            <MaterialItem key={m.id} material={m} canManage={canManage} downloadMut={downloadMut} onDelete={() => setDeleteMaterialTarget(m)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {(() => {
                  const unsectioned = materials.filter((m) => !sections?.some((s) => s.id === m.sectionId))
                  if (unsectioned.length === 0) return null
                  return (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-[var(--text-muted)]">General</p>
                      <div className="flex flex-col gap-2">
                        {unsectioned.map((m) => (
                          <MaterialItem key={m.id} material={m} canManage={canManage} downloadMut={downloadMut} onDelete={() => setDeleteMaterialTarget(m)} />
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </Tabs.Content>

          {/* ── Sesiones de clase ── */}
          <Tabs.Content value="sessions" className="flex h-[60vh] flex-col gap-4 overflow-y-auto pt-4">
            {canManage && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input dark label="Fecha" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                  <Input dark label="Tema (opcional)" value={sessionTopic} onChange={(e) => setSessionTopic(e.target.value)} />
                </div>
                <div className="mt-3">
                  <Input dark label="Enlace de grabación (opcional)" value={sessionRecording} onChange={(e) => setSessionRecording(e.target.value)} placeholder="https://…" />
                </div>
                <Button variant="brand" size="sm" className="mt-3" disabled={!sessionDate} loading={createSessionMut.isPending} onClick={() => createSessionMut.mutate()}>
                  <Plus className="size-4" />
                  Agregar sesión
                </Button>
              </div>
            )}

            {loadingSessions ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : !sessions || sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-8 text-center text-sm text-[var(--text-muted)]">
                Sin sesiones registradas
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-[#4FC3F7]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {new Date(s.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {s.topic && ` · ${s.topic}`}
                        </p>
                        {s.recordingUrl ? (
                          <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="text-xs text-[#4FC3F7] hover:underline">
                            Ver grabación
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Sin grabación</span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" title="Editar enlace de grabación" onClick={() => setEditSessionTarget(s)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Eliminar sesión" onClick={() => setDeleteSessionTarget(s)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          {/* ── Entregables ── */}
          <Tabs.Content value="deliverables" className="flex h-[60vh] flex-col gap-4 overflow-y-auto pt-4">
            {canManage && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-3">
                  <Input dark label="Título" value={deliverableTitle} onChange={(e) => setDeliverableTitle(e.target.value)} placeholder="Ej. Tarea 1: reporte de práctica" />
                  <Input dark label="Descripción (opcional)" value={deliverableDescription} onChange={(e) => setDeliverableDescription(e.target.value)} />
                  <Input dark label="Fecha límite (opcional, vacío = sin límite)" type="date" value={deliverableDueDate} onChange={(e) => setDeliverableDueDate(e.target.value)} />
                  <Button variant="brand" size="sm" disabled={!deliverableTitle} loading={createDeliverableMut.isPending} onClick={() => createDeliverableMut.mutate()}>
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            )}

            {loadingDeliverables ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : !deliverables || deliverables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-8 text-center text-sm text-[var(--text-muted)]">
                Sin entregables registrados
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {deliverables.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ClipboardList className="size-4 shrink-0 text-[#FF6E00]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{d.title}</p>
                        {d.description && <p className="truncate text-xs text-[var(--text-muted)]">{d.description}</p>}
                        <p className="text-xs text-[var(--text-muted)]">
                          {d.dueDate
                            ? `Fecha límite: ${new Date(d.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : 'Sin fecha límite'}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="sm" title="Eliminar" onClick={() => setDeleteDeliverableTarget(d)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          {/* ── Evaluación (liga externa) ── */}
          <Tabs.Content value="evaluation" className="flex h-[60vh] flex-col gap-4 overflow-y-auto pt-4">
            {canManage && (
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-3">
                  <Input dark label="Título" value={evaluationTitle} onChange={(e) => setEvaluationTitle(e.target.value)} placeholder="Ej. Examen parcial 1" />
                  <Input dark label="Descripción (opcional)" value={evaluationDescription} onChange={(e) => setEvaluationDescription(e.target.value)} />
                  <Input dark label="Liga (Google Forms o Microsoft Forms)" value={evaluationUrl} onChange={(e) => setEvaluationUrl(e.target.value)} placeholder="https://forms.gle/… o https://forms.office.com/…" />
                  <Button variant="brand" size="sm" disabled={!evaluationTitle || !evaluationUrl} loading={createEvaluationMut.isPending} onClick={() => createEvaluationMut.mutate()}>
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            )}

            {loadingEvaluations ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : !evaluations || evaluations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-8 text-center text-sm text-[var(--text-muted)]">
                Sin evaluaciones registradas
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {evaluations.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ClipboardCheck className="size-4 shrink-0 text-[#4FC3F7]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{ev.title}</p>
                        {ev.description && <p className="truncate text-xs text-[var(--text-muted)]">{ev.description}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={ev.externalUrl} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" title="Abrir evaluación" type="button">
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </a>
                      {canManage && (
                        <Button variant="ghost" size="sm" title="Eliminar" onClick={() => setDeleteEvaluationTarget(ev)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          {/* ── Inscritos (solo Docente/Admin) ── */}
          {canManage && (
            <Tabs.Content value="enrolled" className="flex h-[60vh] flex-col gap-2 overflow-y-auto pt-4">
              {loadingEnrollments ? (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
              ) : !enrollments || enrollments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-8 text-center text-sm text-[var(--text-muted)]">
                  Sin alumnos inscritos en este grupo
                </div>
              ) : (
                enrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Users className="size-4 shrink-0 text-[var(--text-muted)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{e.student.lastName}, {e.student.firstName}</p>
                        <p className="truncate font-mono text-xs text-[var(--text-muted)]">{e.student.matricula}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" title="Detalle del alumno" onClick={() => setStudentDetailTarget(e)}>
                      <Contact2 className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Modal>

      {/* Editar grabación de una sesión */}
      <Modal
        open={!!editSessionTarget}
        onOpenChange={(v) => !v && setEditSessionTarget(null)}
        title="Editar enlace de grabación"
        maxWidth="max-w-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const url = (e.currentTarget.elements.namedItem('recordingUrl') as HTMLInputElement).value
            if (editSessionTarget) updateSessionMut.mutate({ id: editSessionTarget.id, recordingUrl: url })
          }}
          className="flex flex-col gap-4"
        >
          <Input dark name="recordingUrl" label="URL de grabación" defaultValue={editSessionTarget?.recordingUrl ?? ''} placeholder="https://…" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setEditSessionTarget(null)}>Cancelar</Button>
            <Button variant="brand" type="submit" loading={updateSessionMut.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Detalle del alumno (solo lectura, sin acciones administrativas) */}
      <Modal
        open={!!studentDetailTarget}
        onOpenChange={(v) => !v && setStudentDetailTarget(null)}
        title="Detalle del alumno"
        maxWidth="max-w-sm"
      >
        {studentDetailTarget && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {studentDetailTarget.student.firstName} {studentDetailTarget.student.lastName}
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)]">{studentDetailTarget.student.matricula}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Correo</p>
                <p className="text-[var(--text-primary)]">{studentDetailTarget.student.email}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Teléfono</p>
                <p className="text-[var(--text-primary)]">{studentDetailTarget.student.phone}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Edad</p>
                <p className="text-[var(--text-primary)]">{calcAge(studentDetailTarget.student.birthDate)} años</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Folio de inscripción</p>
                <p className="font-mono text-[var(--text-primary)]">{studentDetailTarget.folio}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteMaterialTarget}
        onOpenChange={(v) => !v && setDeleteMaterialTarget(null)}
        title="Eliminar material"
        description={`¿Deseas eliminar "${deleteMaterialTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMaterialMut.isPending}
        onConfirm={() => deleteMaterialTarget && deleteMaterialMut.mutate(deleteMaterialTarget.id)}
      />

      <ConfirmDialog
        open={!!deleteSessionTarget}
        onOpenChange={(v) => !v && setDeleteSessionTarget(null)}
        title="Eliminar sesión"
        description="¿Deseas eliminar esta sesión de clase? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteSessionMut.isPending}
        onConfirm={() => deleteSessionTarget && deleteSessionMut.mutate(deleteSessionTarget.id)}
      />

      <ConfirmDialog
        open={!!deleteSectionTarget}
        onOpenChange={(v) => !v && setDeleteSectionTarget(null)}
        title="Eliminar sección"
        description={`¿Deseas eliminar la sección "${deleteSectionTarget?.title}"? El material que contiene NO se elimina, solo queda sin sección.`}
        confirmLabel="Eliminar"
        loading={deleteSectionMut.isPending}
        onConfirm={() => deleteSectionTarget && deleteSectionMut.mutate(deleteSectionTarget.id)}
      />

      <ConfirmDialog
        open={!!deleteDeliverableTarget}
        onOpenChange={(v) => !v && setDeleteDeliverableTarget(null)}
        title="Eliminar entregable"
        description={`¿Deseas eliminar "${deleteDeliverableTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteDeliverableMut.isPending}
        onConfirm={() => deleteDeliverableTarget && deleteDeliverableMut.mutate(deleteDeliverableTarget.id)}
      />

      <ConfirmDialog
        open={!!deleteEvaluationTarget}
        onOpenChange={(v) => !v && setDeleteEvaluationTarget(null)}
        title="Eliminar evaluación"
        description={`¿Deseas eliminar "${deleteEvaluationTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteEvaluationMut.isPending}
        onConfirm={() => deleteEvaluationTarget && deleteEvaluationMut.mutate(deleteEvaluationTarget.id)}
      />
    </>
  )
}
