import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Archive, Search } from 'lucide-react'
import { Link } from 'react-router'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { CourseModal } from './CourseModal'
import { coursesApi, type CourseRow } from './api'

const col = createColumnHelper<CourseRow>()

const typeLabel: Record<string, string> = { CURSO: 'Curso', DIPLOMADO: 'Diplomado' }
const modalityLabel: Record<string, string> = { PRESENCIAL: 'Presencial', EN_LINEA: 'En línea', HIBRIDO: 'Híbrido' }

const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Abierto', className: 'bg-green-600 text-white' },
  CLOSED: { label: 'Cerrado', className: 'bg-yellow-600 text-white' },
  ARCHIVED: { label: 'Archivado', className: 'bg-gray-500 text-white' },
}

export function CoursesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<CourseRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<CourseRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, typeFilter, page],
    queryFn: () => coursesApi.list({ search, type: typeFilter || undefined, page, pageSize: 20 }).then((r) => r.data),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => coursesApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      setArchiveTarget(null)
      toast.success('Curso archivado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al archivar'
      toast.error(msg)
    },
  })

  const columns = [
    col.accessor('code', {
      header: 'Clave',
      cell: (info) => <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">{info.getValue()}</span>,
    }),
    col.accessor('name', {
      header: 'Nombre',
      cell: (info) => (
        <Link to={`/cursos/${info.row.original.id}`} className="font-medium text-[#FF6E00] hover:text-[#FF8A3D] hover:underline">
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor('type', {
      header: 'Tipo',
      cell: (info) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.getValue() === 'DIPLOMADO' ? 'bg-purple-600 text-white' : 'bg-[#006EBF] text-white'}`}>
          {typeLabel[info.getValue()]}
        </span>
      ),
    }),
    col.accessor('modality', {
      header: 'Modalidad',
      cell: (info) => <span className="text-[var(--text-secondary)]">{modalityLabel[info.getValue()] ?? info.getValue()}</span>,
    }),
    col.accessor('status', {
      header: 'Estado',
      cell: (info) => {
        const cfg = statusConfig[info.getValue()] ?? { label: info.getValue(), className: 'bg-gray-500 text-white' }
        return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
      },
    }),
    col.accessor('_count', {
      header: 'Inscritos',
      cell: (info) => <span className="text-[var(--text-secondary)]">{info.getValue().enrollments}</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" title="Editar curso" onClick={() => { setEditCourse(c); setModalOpen(true) }} disabled={c.status === 'ARCHIVED'}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="sm" title="Archivar curso" onClick={() => setArchiveTarget(c)} disabled={c.status === 'ARCHIVED'}>
              <Archive className="size-3.5" />
            </Button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 0,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Cursos y Diplomados</h1>
          <p className="text-sm text-[var(--text-secondary)]">{data?.meta.total ?? 0} registros</p>
        </div>
        <Button variant="brand" onClick={() => { setEditCourse(null); setModalOpen(true) }}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#FF6E00] focus:ring-2 focus:ring-[#FF6E00]/20"
            placeholder="Buscar por nombre o clave…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#FF6E00]"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
        >
          <option value="">Todos los tipos</option>
          <option value="CURSO">Cursos</option>
          <option value="DIPLOMADO">Diplomados</option>
        </select>
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
                <tr key={row.id} className={`hover:bg-[var(--hover-surface)] ${row.original.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
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

      <CourseModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditCourse(null) }}
        course={editCourse}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['courses'] }); setModalOpen(false) }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(v) => !v && setArchiveTarget(null)}
        title="Archivar curso"
        description={`¿Deseas archivar "${archiveTarget?.name}"? No podrás editarlo mientras esté archivado.`}
        confirmLabel="Archivar"
        loading={archiveMut.isPending}
        onConfirm={() => archiveTarget && archiveMut.mutate(archiveTarget.id)}
      />
    </div>
  )
}
