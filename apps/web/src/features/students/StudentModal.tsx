import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createStudentSchema, updateStudentSchema, type CreateStudentInput, type UpdateStudentInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { studentsApi, type StudentRow } from './api'

interface StudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentRow | null
  onSuccess: () => void
}

export function StudentModal({ open, onOpenChange, student, onSuccess }: StudentModalProps) {
  const isEdit = !!student

  const createForm = useForm<CreateStudentInput>({ resolver: zodResolver(createStudentSchema) })
  const editForm = useForm<UpdateStudentInput>({ resolver: zodResolver(updateStudentSchema) })

  useEffect(() => {
    if (student) {
      editForm.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        // birthDate viene como ISO string; tomamos solo YYYY-MM-DD
        birthDate: student.birthDate.slice(0, 10),
      })
    } else {
      createForm.reset()
    }
  }, [student, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error inesperado'

  const createMut = useMutation({
    mutationFn: (data: CreateStudentInput) => studentsApi.create(data),
    onSuccess: () => { toast.success('Alumno registrado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  const editMut = useMutation({
    mutationFn: (data: UpdateStudentInput) => studentsApi.update(student!.id, data),
    onSuccess: () => { toast.success('Alumno actualizado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  const fields = (
    form: ReturnType<typeof useForm<CreateStudentInput>> | ReturnType<typeof useForm<UpdateStudentInput>>,
    errors: Record<string, { message?: string } | undefined>,
  ) => (
    <div className="grid grid-cols-2 gap-4">
      <Input dark label="Nombre(s)" error={errors.firstName?.message} {...form.register('firstName')} />
      <Input dark label="Apellido(s)" error={errors.lastName?.message} {...form.register('lastName')} />
      <Input dark label="Correo electrónico" type="email" error={errors.email?.message} className="col-span-2" {...form.register('email')} />
      <Input dark label="Teléfono" type="tel" error={errors.phone?.message} {...form.register('phone')} />
      <Input dark label="Fecha de nacimiento" type="date" error={errors.birthDate?.message} {...form.register('birthDate')} />
    </div>
  )

  if (!isEdit) {
    const { register, handleSubmit, formState: { errors } } = createForm
    return (
      <Modal open={open} onOpenChange={onOpenChange} title="Nuevo alumno" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="flex flex-col gap-4">
          {fields({ register, formState: { errors } } as never, errors as never)}
          <p className="text-xs text-[var(--text-muted)]">La matrícula se genera automáticamente.</p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="brand" type="submit" loading={createMut.isPending}>Registrar alumno</Button>
          </div>
        </form>
      </Modal>
    )
  }

  const { register, handleSubmit, formState: { errors } } = editForm
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Editar alumno" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit((d) => editMut.mutate(d))} className="flex flex-col gap-4">
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border-soft)] px-3 py-2 text-sm">
          <span className="text-[var(--text-secondary)]">Matrícula: </span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">{student.matricula}</span>
        </div>
        {fields({ register, formState: { errors } } as never, errors as never)}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="submit" loading={editMut.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
