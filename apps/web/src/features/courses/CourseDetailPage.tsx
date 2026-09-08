import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Users, UserPlus, UserMinus, FolderOpen, Video } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { GroupModal } from '../groups/GroupModal'
import { GroupContentModal } from '../groups/GroupContentModal'
import { groupsApi, type GroupRow } from '../groups/api'
import { EnrollModal } from '../enrollments/EnrollModal'
import { enrollmentsApi, type EnrollmentRow } from '../enrollments/api'
import { coursesApi } from './api'

const typeLabel: Record<string, string> = { CURSO: 'Curso', DIPLOMADO: 'Diplomado' }
const modalityLabel: Record<string, string> = { PRESENCIAL: 'Presencial', EN_LINEA: 'En línea', HIBRIDO: 'Híbrido' }

const statusLabel: Record<string, string> = { ENROLLED: 'Inscrito', WITHDRAWN: 'Baja', COMPLETED: 'Completado' }
const statusColor: Record<string, string> = {
  ENROLLED: 'bg-green-600 text-white',
  WITHDRAWN: 'bg-red-600 text-white',
  COMPLETED: 'bg-[#006EBF] text-white',
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [contentGroup, setContentGroup] = useState<GroupRow | null>(null)
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState<EnrollmentRow | null>(null)

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.listByCourse(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => enrollmentsApi.list({ courseId: id!, pageSize: 100 }).then((r) => r.data.data),
    enabled: !!id,
  })

  const deleteMut = useMutation({
    mutationFn: (groupId: string) => groupsApi.remove(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', id] })
      setDeleteTarget(null)
      toast.success('Grupo eliminado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al eliminar'
      toast.error(msg)
    },
  })

  const withdrawMut = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.updateStatus(enrollmentId, 'WITHDRAWN'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] })
      qc.invalidateQueries({ queryKey: ['groups', id] })
      qc.invalidateQueries({ queryKey: ['course', id] })
      setWithdrawTarget(null)
      toast.success('Alumno dado de baja del curso')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al dar de baja'
      toast.error(msg)
    },
  })

  const changeGroupMut = useMutation({
    mutationFn: ({ enrollmentId, groupId }: { enrollmentId: string; groupId: string }) =>
      enrollmentsApi.assignGroup(enrollmentId, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] })
      qc.invalidateQueries({ queryKey: ['groups', id] })
      toast.success('Grupo actualizado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al asignar grupo'
      toast.error(msg)
    },
  })

  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="size-6 animate-spin rounded-full border-2 border-[#FF6E00] border-t-transparent" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Curso no encontrado.{' '}
        <button className="text-[#FF6E00] underline" onClick={() => navigate('/cursos')}>Volver</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" title="Volver a cursos" onClick={() => navigate('/cursos')}>
          <ArrowLeft className="size-4" />
          Cursos
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{course.name}</h1>
          <p className="text-xs text-[var(--text-muted)] font-mono">{course.code}</p>
        </div>
      </div>

      {/* Datos del curso */}
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Tipo</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{typeLabel[course.type] ?? course.type}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Modalidad</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{modalityLabel[course.modality] ?? course.modality}</p>
          </div>
          {course.hours && (
            <div>
              <p className="text-xs text-[var(--text-muted)]">Horas</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{course.hours}</p>
            </div>
          )}
          {course.duration && (
            <div>
              <p className="text-xs text-[var(--text-muted)]">Duración</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{course.duration}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Grupos / Inscritos */}
      <Tabs.Root defaultValue="groups">
        <Tabs.List className="flex gap-2 border-b border-[var(--border-soft)]">
          <Tabs.Trigger
            value="groups"
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors"
          >
            Grupos
          </Tabs.Trigger>
          <Tabs.Trigger
            value="enrolled"
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border-b-2 border-transparent data-[state=active]:border-[#FF6E00] data-[state=active]:text-[#FF6E00] transition-colors"
          >
            Inscritos ({course._count.enrollments})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="groups" className="pt-4">
          <div className="mb-4 flex justify-end">
            <Button variant="brand" onClick={() => { setEditGroup(null); setModalOpen(true) }}>
              <Plus className="size-4" />
              Nuevo grupo
            </Button>
          </div>

          {loadingGroups ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
          ) : !groups || groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] py-10 text-center text-sm text-[var(--text-muted)]">
              Sin grupos registrados en este curso
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => {
                const full = g.capacity !== null && g._count.enrollments >= g.capacity
                return (
                  <div key={g.id} className={`rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 ${g.isExpired ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{g.name}</p>
                        {g.schedule && <p className="text-xs text-[var(--text-muted)]">{g.schedule}</p>}
                        {(g.startDate || g.endDate) && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {g.startDate ? new Date(g.startDate).toLocaleDateString('es-MX') : '—'}
                            {' → '}
                            {g.endDate ? new Date(g.endDate).toLocaleDateString('es-MX') : '—'}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Material y sesiones" onClick={() => setContentGroup(g)}>
                          <FolderOpen className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title={g.isExpired ? 'Grupo vencido: no editable' : 'Editar grupo'} disabled={g.isExpired} onClick={() => { setEditGroup(g); setModalOpen(true) }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Eliminar grupo" onClick={() => setDeleteTarget(g)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <Users className="size-4 text-[var(--text-muted)]" />
                      <span className={full ? 'font-medium text-red-500' : 'text-[var(--text-secondary)]'}>
                        {g._count.enrollments}{g.capacity !== null ? ` / ${g.capacity}` : ''} inscritos
                      </span>
                      {g.capacity === null && (
                        <span className="rounded-full bg-[#006EBF] px-2 py-0.5 text-xs text-white">Ilimitado</span>
                      )}
                      {full && !g.isExpired && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">Lleno</span>
                      )}
                      {g.isExpired && (
                        <span className="rounded-full bg-gray-500 px-2 py-0.5 text-xs text-white">Vencido</span>
                      )}
                    </div>
                    {g.onlineMeetingUrl && !g.isExpired && (
                      <a
                        href={g.onlineMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-[#004A87] px-3 py-1 text-xs font-medium text-white hover:bg-[#006EBF]"
                      >
                        <Video className="size-3.5" />
                        Unirse a la clase
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="enrolled" className="pt-4">
          <div className="mb-4 flex justify-end">
            <Button variant="brand" onClick={() => setEnrollModalOpen(true)}>
              <UserPlus className="size-4" />
              Inscribir alumno
            </Button>
          </div>

          {loadingEnrollments ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
          ) : !enrollments || enrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] py-10 text-center text-sm text-[var(--text-muted)]">
              Sin alumnos inscritos en este curso
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[#004A87]">
                  <tr>
                    {['Folio', 'Alumno', 'Grupo', 'Estado', 'Fecha', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/80">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-faint)]">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--hover-surface)]">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{e.folio}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{e.student.lastName}, {e.student.firstName}</p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">{e.student.matricula}</p>
                      </td>
                      <td className="px-4 py-3">
                        {e.status === 'ENROLLED' ? (
                          <select
                            className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none"
                            value={e.group?.id ?? ''}
                            onChange={(ev) => changeGroupMut.mutate({ enrollmentId: e.id, groupId: ev.target.value })}
                            disabled={changeGroupMut.isPending}
                          >
                            <option value="">Sin grupo</option>
                            {(groups ?? [])
                              .filter((g) => !g.isExpired || g.id === e.group?.id)
                              .map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-[var(--text-secondary)]">{e.group?.name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[e.status] ?? 'bg-gray-500 text-white'}`}>
                          {statusLabel[e.status] ?? e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {new Date(e.enrolledAt).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.status === 'ENROLLED' && (
                          <Button variant="ghost" size="sm" title="Dar de baja del curso" onClick={() => setWithdrawTarget(e)}>
                            <UserMinus className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <GroupModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditGroup(null) }}
        courseId={id!}
        courseModality={course.modality}
        group={editGroup}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['groups', id] }); setModalOpen(false) }}
      />

      {contentGroup && (
        <GroupContentModal
          open={!!contentGroup}
          onOpenChange={(v) => !v && setContentGroup(null)}
          groupId={contentGroup.id}
          groupName={contentGroup.name}
          canManage
        />
      )}

      <EnrollModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        courseId={id!}
        groups={groups ?? []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['enrollments', id] })
          qc.invalidateQueries({ queryKey: ['groups', id] })
          qc.invalidateQueries({ queryKey: ['course', id] })
          setEnrollModalOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Eliminar grupo"
        description={`¿Deseas eliminar "${deleteTarget?.name}"? Las inscripciones de este grupo quedarán sin grupo asignado.`}
        confirmLabel="Eliminar"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />

      <ConfirmDialog
        open={!!withdrawTarget}
        onOpenChange={(v) => !v && setWithdrawTarget(null)}
        title="Dar de baja del curso"
        description={`¿Deseas dar de baja a ${withdrawTarget?.student.firstName} ${withdrawTarget?.student.lastName} de este curso? Podrá volver a inscribirse más adelante.`}
        confirmLabel="Dar de baja"
        loading={withdrawMut.isPending}
        onConfirm={() => withdrawTarget && withdrawMut.mutate(withdrawTarget.id)}
      />
    </div>
  )
}
