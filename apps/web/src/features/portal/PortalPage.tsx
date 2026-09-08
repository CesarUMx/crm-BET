import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Users, CalendarDays, Video } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { GroupContentModal } from '../groups/GroupContentModal'
import { groupsApi, type MyGroupRow } from '../groups/api'
import { useAuthStore } from '../../lib/auth.store'

const enrollmentStatusLabel: Record<string, string> = {
  ENROLLED: 'Inscrito',
  WITHDRAWN: 'Baja',
  COMPLETED: 'Completado',
}

export function PortalPage() {
  const user = useAuthStore((s) => s.user)
  const isTeacher = user?.role === 'DOCENTE'
  const [contentGroup, setContentGroup] = useState<MyGroupRow | null>(null)

  const { data: groups, isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupsApi.listMine().then((r) => r.data.data),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Mis grupos</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {isTeacher
            ? 'Grupos donde impartes clase. Gestiona su material de apoyo y sesiones.'
            : 'Grupos donde estás inscrito. Consulta su material de apoyo y sesiones.'}
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
      ) : !groups || groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] py-10 text-center text-sm text-[var(--text-muted)]">
          {isTeacher ? 'No tienes grupos asignados todavía' : 'No estás inscrito en ningún grupo todavía'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className={`rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 ${g.isExpired ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{g.course.code}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{g.course.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{g.name}</p>
                </div>
                <Button variant="ghost" size="sm" title="Material y sesiones" onClick={() => setContentGroup(g)}>
                  <FolderOpen className="size-3.5" />
                </Button>
              </div>

              {g.schedule && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <CalendarDays className="size-3.5" />
                  {g.schedule}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {g.enrollmentStatus && (
                  <span className="rounded-full bg-[#006EBF] px-2 py-0.5 text-white">
                    {enrollmentStatusLabel[g.enrollmentStatus] ?? g.enrollmentStatus}
                  </span>
                )}
                {g.isExpired && (
                  <span className="rounded-full bg-gray-500 px-2 py-0.5 text-white">Vencido</span>
                )}
                {isTeacher && (
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Users className="size-3.5" />
                    Docente asignado
                  </span>
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
          ))}
        </div>
      )}

      {contentGroup && (
        <GroupContentModal
          open={!!contentGroup}
          onOpenChange={(v) => !v && setContentGroup(null)}
          groupId={contentGroup.id}
          groupName={contentGroup.name}
          canManage={isTeacher}
        />
      )}
    </div>
  )
}
