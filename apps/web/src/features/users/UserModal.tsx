import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { usersApi, type UserRow } from './api'

// Contraseña solo requerida para SUPER_ADMIN; Coordinador y Docente usan Google OAuth
const createSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    email: z.string().email('Email inválido'),
    role: z.enum(['SUPER_ADMIN', 'COORDINADOR', 'DOCENTE']),
    password: z.string().optional(),
  })
  .refine((d) => d.role !== 'SUPER_ADMIN' || (!!d.password && d.password.length >= 12), {
    message: 'Mínimo 12 caracteres (requerida para Super Admin)',
    path: ['password'],
  })

const editSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.enum(['SUPER_ADMIN', 'COORDINADOR', 'DOCENTE']),
  isActive: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

interface UserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow | null
  onSuccess: () => void
}

export function UserModal({ open, onOpenChange, user, onSuccess }: UserModalProps) {
  const isEdit = !!user

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    if (user) {
      // ALUMNO no se gestiona con este modal (se liga a un Student en otro flujo)
      editForm.reset({ name: user.name, role: user.role as 'SUPER_ADMIN' | 'COORDINADOR' | 'DOCENTE', isActive: user.isActive })
    } else {
      // Se fija el rol por defecto para que coincida con la opción visible en el <select>
      createForm.reset({ role: 'SUPER_ADMIN' })
    }
  }, [user, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: (data: CreateForm) => usersApi.create({ ...data, password: data.role === 'SUPER_ADMIN' ? data.password : undefined }),
    onSuccess: () => { toast.success('Usuario creado'); onSuccess() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al crear usuario'
      toast.error(msg)
    },
  })

  const editMut = useMutation({
    mutationFn: (data: EditForm) => usersApi.update(user!.id, data),
    onSuccess: () => { toast.success('Usuario actualizado'); onSuccess() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al actualizar usuario'
      toast.error(msg)
    },
  })

  const roleOptions: { value: 'SUPER_ADMIN' | 'COORDINADOR' | 'DOCENTE'; label: string }[] = [
    { value: 'SUPER_ADMIN', label: 'Super Administrador' },
    { value: 'COORDINADOR', label: 'Coordinador' },
    { value: 'DOCENTE', label: 'Docente' },
  ]

  if (!isEdit) {
    const { register, handleSubmit, watch, formState: { errors } } = createForm
    const selectedRole = watch('role')
    const isSuperAdmin = selectedRole === 'SUPER_ADMIN'
    return (
      <Modal open={open} onOpenChange={onOpenChange} title="Nuevo usuario">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="flex flex-col gap-4">
          <Input dark label="Nombre completo" error={errors.name?.message} {...register('name')} />
          <Input dark label="Email" type="email" error={errors.email?.message} {...register('email')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Rol</label>
            <select className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none focus:ring-1 focus:ring-[#FF6E00]" {...register('role')}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.role && <p className="text-xs text-red-400">{errors.role.message}</p>}
          </div>

          {/* Contraseña solo para Super Admin; Coordinador y Docente usan Google OAuth */}
          {isSuperAdmin ? (
            <Input dark label="Contraseña temporal" type="password" placeholder="Mínimo 12 caracteres" error={errors.password?.message} {...register('password')} />
          ) : (
            <p className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[#FF9159]">
              Iniciará sesión con su cuenta de Google. No se requiere contraseña.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="brand" type="submit" loading={createMut.isPending}>Crear usuario</Button>
          </div>
        </form>
      </Modal>
    )
  }

  const { register, handleSubmit, formState: { errors } } = editForm
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Editar usuario">
      <form onSubmit={handleSubmit((d) => editMut.mutate(d))} className="flex flex-col gap-4">
        <Input dark label="Nombre completo" error={errors.name?.message} {...register('name')} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Rol</label>
          <select className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none focus:ring-1 focus:ring-[#FF6E00]" {...register('role')}>
            {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" className="size-4 accent-[#E9511D]" {...register('isActive')} />
          <label htmlFor="isActive" className="text-sm text-[var(--text-secondary)]">Usuario activo</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="submit" loading={editMut.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
