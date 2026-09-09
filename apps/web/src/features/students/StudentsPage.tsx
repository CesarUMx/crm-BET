import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, UserX, UserCheck, Search, FileSpreadsheet, KeyRound } from 'lucide-react'
import { Link } from 'react-router'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { StudentModal } from './StudentModal'
import { ImportStudentsModal } from './ImportStudentsModal'
import { studentsApi, type StudentRow } from './api'

const col = createColumnHelper<StudentRow>()

export function StudentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [onlyNoAccess, setOnlyNoAccess] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<StudentRow | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, page, onlyNoAccess],
    queryFn: () => studentsApi.list({ search, page, pageSize: 20, access: onlyNoAccess ? 'none' : undefined }).then((r) => r.data),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => studentsApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setDeactivateTarget(null)
      toast.success('Alumno dado de baja')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al dar de baja'
      toast.error(msg)
    },
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => studentsApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Alumno reactivado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al reactivar'
      toast.error(msg)
    },
  })

  const bulkActivateMut = useMutation({
    mutationFn: (ids: string[]) => studentsApi.activateAccessBulk(ids),
    onSuccess: (res) => {
      const { succeeded, failed } = res.data.data
      qc.invalidateQueries({ queryKey: ['students'] })
      setSelected(new Set())
      if (failed === 0) toast.success(`Acceso activado a ${succeeded} alumno(s)`)
      else toast.warning(`${succeeded} activado(s), ${failed} no se pudieron activar (ya tenían acceso o están dados de baja)`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al activar acceso masivo'
      toast.error(msg)
    },
  })

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rows = data?.data ?? []
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const columns = [
    ...(onlyNoAccess
      ? [
          col.display({
            id: 'select',
            header: () => (
              <input
                type="checkbox"
                className="size-4 accent-[#E9511D]"
                checked={allSelected}
                onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
              />
            ),
            cell: ({ row }: { row: { original: StudentRow } }) => (
              <input
                type="checkbox"
                className="size-4 accent-[#E9511D]"
                checked={selected.has(row.original.id)}
                onChange={() => toggleSelected(row.original.id)}
              />
            ),
          }),
        ]
      : []),
    col.accessor('matricula', {
      header: 'Matrícula',
      cell: (info) => <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">{info.getValue()}</span>,
    }),
    col.accessor((r) => `${r.lastName} ${r.firstName}`, {
      id: 'fullName',
      header: 'Nombre',
      cell: (info) => (
        <Link to={`/alumnos/${info.row.original.id}`} className="font-medium text-[#FF6E00] hover:text-[#FF8A3D] hover:underline">
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor('email', { header: 'Correo' }),
    col.accessor('phone', { header: 'Teléfono' }),
    col.accessor('age', {
      header: 'Edad',
      cell: (info) => <span>{info.getValue()} años</span>,
    }),
    col.accessor('status', {
      header: 'Estado',
      cell: (info) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.getValue() === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {info.getValue() === 'ACTIVE' ? 'Activo' : 'Baja'}
        </span>
      ),
    }),
    col.accessor('hasAccess', {
      header: 'Acceso',
      cell: (info) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.getValue() ? 'bg-[#006EBF] text-white' : 'bg-gray-500 text-white'}`}>
          {info.getValue() ? 'Con acceso' : 'Sin acceso'}
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" title="Editar alumno" onClick={() => { setEditStudent(s); setModalOpen(true) }}>
              <Pencil className="size-3.5" />
            </Button>
            {s.status === 'INACTIVE' ? (
              <Button variant="ghost" size="sm" title="Reactivar alumno" loading={activateMut.isPending} onClick={() => activateMut.mutate(s.id)}>
                <UserCheck className="size-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" title="Dar de baja" onClick={() => setDeactivateTarget(s)}>
                <UserX className="size-3.5" />
              </Button>
            )}
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 0,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Alumnos</h1>
          <p className="text-sm text-[var(--text-secondary)]">{data?.meta.total ?? 0} alumnos registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
            <FileSpreadsheet className="size-4" />
            Importar
          </Button>
          <Button variant="brand" onClick={() => { setEditStudent(null); setModalOpen(true) }}>
            <Plus className="size-4" />
            Nuevo alumno
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#FF6E00] focus:ring-2 focus:ring-[#FF6E00]/20"
            placeholder="Buscar por nombre, email o matrícula…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#FF6E00]"
          value={onlyNoAccess ? 'none' : ''}
          onChange={(e) => { setOnlyNoAccess(e.target.value === 'none'); setPage(1); setSelected(new Set()) }}
        >
          <option value="">Acceso: todos</option>
          <option value="none">Sin acceso</option>
        </select>

        {selected.size > 0 && (
          <Button
            variant="brand"
            size="sm"
            loading={bulkActivateMut.isPending}
            onClick={() => bulkActivateMut.mutate(Array.from(selected))}
          >
            <KeyRound className="size-4" />
            Activar acceso ({selected.size})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[#004A87]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#004A87]">
            {isLoading ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--text-muted)]">Cargando…</td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--text-muted)]">Sin resultados</td></tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--hover-surface)]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[var(--text-secondary)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)]">Página {page} de {data.meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <StudentModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditStudent(null) }}
        student={editStudent}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['students'] }); setModalOpen(false) }}
      />

      <ImportStudentsModal open={importModalOpen} onOpenChange={setImportModalOpen} />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(v) => !v && setDeactivateTarget(null)}
        title="Dar de baja al alumno"
        description={`¿Deseas dar de baja a ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? Se conservará su matrícula e historial, y todas sus inscripciones activas pasarán a baja automáticamente (libera cupo de grupo). Podrás reactivarlo más adelante.`}
        confirmLabel="Dar de baja"
        loading={deactivateMut.isPending}
        onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
      />
    </div>
  )
}
