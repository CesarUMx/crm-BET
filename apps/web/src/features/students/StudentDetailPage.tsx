import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Phone, Calendar, Hash, KeyRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { studentsApi } from './api'

const statusLabel: Record<string, string> = {
  ENROLLED: 'Inscrito',
  WITHDRAWN: 'Baja',
  COMPLETED: 'Completado',
}

const statusColor: Record<string, string> = {
  ENROLLED: 'bg-green-600 text-white',
  WITHDRAWN: 'bg-red-600 text-white',
  COMPLETED: 'bg-[#006EBF] text-white',
}

const courseTypeLabel: Record<string, string> = {
  CURSO: 'Curso',
  DIPLOMADO: 'Diplomado',
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  const activateMut = useMutation({
    mutationFn: () => studentsApi.activateAccess(id!),
    onSuccess: (res) => {
      setTempPassword(res.data.data.tempPassword)
      qc.invalidateQueries({ queryKey: ['student', id] })
      toast.success('Acceso activado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al activar acceso'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="size-6 animate-spin rounded-full border-2 border-[#FF6E00] border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Alumno no encontrado.{' '}
        <button className="text-[#FF6E00] underline" onClick={() => navigate('/alumnos')}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/alumnos')}>
          <ArrowLeft className="size-4" />
          Alumnos
        </Button>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {data.lastName}, {data.firstName}
        </h1>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
            data.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {data.status === 'ACTIVE' ? 'Activo' : 'Baja'}
        </span>
      </div>

      {/* Datos del alumno */}
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Hash className="size-4 text-[var(--text-muted)]" />
          <span className="font-mono text-lg font-bold text-[#FF6E00]">{data.matricula}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Mail className="size-4 text-[var(--text-muted)]" />
            {data.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Phone className="size-4 text-[var(--text-muted)]" />
            {data.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="size-4 text-[var(--text-muted)]" />
            {data.age} años ({new Date(data.birthDate).toLocaleDateString('es-MX')})
          </div>
        </div>

        {/* Acceso al sistema (rol ALUMNO) */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border-faint)] pt-4">
          <div className="flex items-center gap-2 text-sm">
            <KeyRound className="size-4 text-[var(--text-muted)]" />
            {data.user ? (
              <span className={data.user.isActive ? 'text-green-500' : 'text-red-500'}>
                {data.user.isActive ? 'Tiene acceso al sistema' : 'Acceso desactivado'}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">Sin cuenta de acceso</span>
            )}
          </div>
          {!data.user && (
            <Button variant="brand" size="sm" loading={activateMut.isPending} onClick={() => activateMut.mutate()}>
              Activar acceso
            </Button>
          )}
        </div>
      </div>

      {/* Inscripciones */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Inscripciones ({data.enrollments.length})
        </h2>
        {data.enrollments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-soft)] py-10 text-center text-sm text-[var(--text-muted)]">
            Sin inscripciones registradas
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead className="bg-[#004A87]">
                <tr>
                  {['Folio', 'Curso', 'Tipo', 'Grupo', 'Estado', 'Fecha'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#004A87]">
                {data.enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--hover-surface)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{e.folio}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{e.course.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{e.course.code}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{courseTypeLabel[e.course.type] ?? e.course.type}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{e.group?.name ?? <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[e.status] ?? 'bg-gray-500 text-white'}`}>
                        {statusLabel[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {new Date(e.enrolledAt).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!tempPassword}
        onOpenChange={(v) => !v && setTempPassword(null)}
        title="Acceso activado"
        description="Entrégale esta contraseña temporal al alumno. También puede iniciar sesión con Google si su correo lo permite."
      >
        <div className="mt-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] select-all">
          {tempPassword}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="brand" onClick={() => setTempPassword(null)}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  )
}
