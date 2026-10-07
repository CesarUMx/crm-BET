import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, UserX } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { DocenteModal } from './DocenteModal'
import { docentesApi, type DocenteRow } from './api'

const col = createColumnHelper<DocenteRow>()

export function DocentesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<DocenteRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['docentes', search, page],
    queryFn: () => docentesApi.list({ search, page, pageSize: 20 }).then((r) => r.data),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => docentesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docentes'] })
      setDeactivateTarget(null)
      toast.success('Docente desactivado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al desactivar'
      toast.error(msg)
    },
  })

  const columns = [
    col.accessor('name', { header: 'Nombre' }),
    col.accessor('email', { header: 'Email' }),
    col.accessor('isActive', {
      header: 'Estado',
      cell: (info) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.getValue() ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {info.getValue() ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const docente = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" title="Desactivar docente" onClick={() => setDeactivateTarget(docente)} disabled={!docente.isActive}>
              <UserX className="size-3.5" />
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
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Docentes</h1>
        <Button variant="brand" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Nuevo docente
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          dark
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-72"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[#004A87]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
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
            <p className="text-xs text-[var(--text-secondary)]">
              {data.meta.total} docente{data.meta.total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <DocenteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['docentes'] })
          // El selector de docentes en "Nuevo grupo" cachea esta key aparte
          qc.invalidateQueries({ queryKey: ['teachers'] })
          setModalOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(v) => !v && setDeactivateTarget(null)}
        title="Desactivar docente"
        description={`¿Deseas desactivar a ${deactivateTarget?.name}? Perderá acceso al sistema.`}
        confirmLabel="Desactivar"
        loading={deactivateMut.isPending}
        onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
      />
    </div>
  )
}
