import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, UserPlus } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { studentsApi, type StudentRow } from '../students/api'
import { enrollmentsApi } from './api'
import type { GroupRow } from '../groups/api'

interface EnrollModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  groups: GroupRow[]
  onSuccess: () => void
}

export function EnrollModal({ open, onOpenChange, courseId, groups, onSuccess }: EnrollModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StudentRow | null>(null)
  const [groupId, setGroupId] = useState<string>('')

  const { data: results, isLoading } = useQuery({
    queryKey: ['students-search', search],
    queryFn: () => studentsApi.list({ search, page: 1, pageSize: 8, status: 'ACTIVE' }).then((r) => r.data.data),
    enabled: search.length >= 2 && !selected,
  })

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error inesperado'

  const enrollMut = useMutation({
    mutationFn: () =>
      enrollmentsApi.create({ studentId: selected!.id, courseId, groupId: groupId || undefined }),
    onSuccess: () => {
      toast.success('Alumno inscrito')
      reset()
      onSuccess()
    },
    onError: (err) => toast.error(errMsg(err)),
  })

  const reset = () => {
    setSearch('')
    setSelected(null)
    setGroupId('')
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}
      title="Inscribir alumno"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        {!selected ? (
          <div className="flex flex-col gap-2">
            <Input
              dark
              label="Buscar alumno"
              placeholder="Nombre, email o matrícula…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.length >= 2 && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--border-soft)] bg-[var(--surface)]">
                {isLoading ? (
                  <p className="p-3 text-sm text-[var(--text-muted)]">Buscando…</p>
                ) : !results || results.length === 0 ? (
                  <p className="p-3 text-sm text-[var(--text-muted)]">Sin resultados</p>
                ) : (
                  results.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s)}
                      className="flex w-full items-center gap-3 border-b border-[var(--border-faint)] px-3 py-2 text-left last:border-0 hover:bg-[var(--hover-surface)]"
                    >
                      <Search className="size-3.5 shrink-0 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{s.lastName}, {s.firstName}</p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">{s.matricula} · {s.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-[#FF6E00]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{selected.lastName}, {selected.firstName}</p>
                <p className="font-mono text-xs text-[var(--text-muted)]">{selected.matricula}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Cambiar</Button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Grupo (opcional)</label>
          <select
            className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none focus:ring-1 focus:ring-[#FF6E00]"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Sin grupo asignado</option>
            {groups.filter((g) => !g.isExpired).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}{g.capacity !== null ? ` (${g._count.enrollments}/${g.capacity})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="button" disabled={!selected} loading={enrollMut.isPending} onClick={() => enrollMut.mutate()}>
            Inscribir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
