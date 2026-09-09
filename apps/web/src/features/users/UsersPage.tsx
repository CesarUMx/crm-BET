import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, RotateCcw, Pencil, UserX } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { UserModal } from './UserModal'
import { usersApi, type UserRow } from './api'

const col = createColumnHelper<UserRow>()

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COORDINADOR: 'Coordinador',
  DOCENTE: 'Docente',
  ALUMNO: 'Alumno',
}

const roleColor: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#006EBF] text-white',
  COORDINADOR: 'bg-gray-500 text-white',
  DOCENTE: 'bg-[#E9511D] text-white',
  ALUMNO: 'bg-purple-600 text-white',
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => usersApi.list({ search, page, pageSize: 20 }).then((r) => r.data),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeactivateTarget(null)
      toast.success('Usuario desactivado')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al desactivar'
      toast.error(msg)
    },
  })

  const resetMut = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id).then((r) => r.data.data.tempPassword),
    onSuccess: (password) => {
      setTempPassword(password)
      toast.success('Contraseña reseteada')
    },
    onError: () => toast.error('Error al resetear contraseña'),
  })

  const columns = [
    col.accessor('name', { header: 'Nombre' }),
    col.accessor('email', { header: 'Email' }),
    col.accessor('role', {
      header: 'Rol',
      cell: (info) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColor[info.getValue()] ?? 'bg-gray-500 text-white'}`}>
          {roleLabel[info.getValue()] ?? info.getValue()}
        </span>
      ),
    }),
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
        const user = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" title="Editar usuario" onClick={() => { setEditUser(user); setModalOpen(true) }}>
              <Pencil className="size-3.5" />
            </Button>
            {/* Reset de contraseña solo aplica a Super Admin */}
            {user.role === 'SUPER_ADMIN' && (
              <Button variant="ghost" size="sm" title="Resetear contraseña" onClick={() => resetMut.mutate(user.id)} loading={resetMut.isPending && resetMut.variables === user.id}>
                <RotateCcw className="size-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" title="Desactivar usuario" onClick={() => setDeactivateTarget(user)} disabled={!user.isActive}>
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
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Usuarios del sistema</h1>
        <Button variant="brand" onClick={() => { setEditUser(null); setModalOpen(true) }}>
          <Plus className="size-4" />
          Nuevo usuario
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

        {/* Paginación */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)]">
              {data.meta.total} usuario{data.meta.total !== 1 ? 's' : ''}
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

      <UserModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditUser(null) }}
        user={editUser}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['users'] })
          // El selector de docentes en "Nuevo grupo" cachea esta key aparte
          qc.invalidateQueries({ queryKey: ['teachers'] })
          setModalOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(v) => !v && setDeactivateTarget(null)}
        title="Desactivar usuario"
        description={`¿Deseas desactivar a ${deactivateTarget?.name}? Perderá acceso al sistema.`}
        confirmLabel="Desactivar"
        loading={deactivateMut.isPending}
        onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
      />

      {/* Modal contraseña temporal */}
      <Modal
        open={!!tempPassword}
        onOpenChange={(v) => !v && setTempPassword(null)}
        title="Contraseña temporal generada"
        description="Entrégala al usuario. Deberá cambiarla en su próximo inicio de sesión."
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
