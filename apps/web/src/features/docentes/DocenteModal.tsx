import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createDocenteSchema, type CreateDocenteInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { docentesApi } from './api'

interface DocenteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DocenteModal({ open, onOpenChange, onSuccess }: DocenteModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateDocenteInput>({
    resolver: zodResolver(createDocenteSchema),
  })

  const createMut = useMutation({
    mutationFn: (data: CreateDocenteInput) => docentesApi.create(data),
    onSuccess: () => { toast.success('Docente creado'); reset(); onSuccess() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al crear docente'
      toast.error(msg)
    },
  })

  return (
    <Modal open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }} title="Nuevo docente">
      <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="flex flex-col gap-4">
        <Input dark label="Nombre completo" error={errors.name?.message} {...register('name')} />
        <Input dark label="Email" type="email" error={errors.email?.message} {...register('email')} />

        <p className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[#FF9159]">
          Iniciará sesión con su cuenta de Google. No se requiere contraseña.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="submit" loading={createMut.isPending}>Crear docente</Button>
        </div>
      </form>
    </Modal>
  )
}
