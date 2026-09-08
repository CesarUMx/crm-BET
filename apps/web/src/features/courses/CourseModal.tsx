import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCourseSchema, updateCourseSchema, type CreateCourseInput, type UpdateCourseInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { coursesApi, type CourseRow } from './api'

interface CourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: CourseRow | null
  onSuccess: () => void
}

const typeOptions = [
  { value: 'CURSO', label: 'Curso' },
  { value: 'DIPLOMADO', label: 'Diplomado' },
]

const modalityOptions = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'EN_LINEA', label: 'En línea' },
  { value: 'HIBRIDO', label: 'Híbrido' },
]

const statusOptions = [
  { value: 'OPEN', label: 'Abierto' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'ARCHIVED', label: 'Archivado' },
]

function SelectField({ label, error, options, ...props }: {
  label: string; error?: string; options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <select
        className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#FF6E00] focus:ring-2 focus:ring-[#FF6E00]/20"
        {...props}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function CourseModal({ open, onOpenChange, course, onSuccess }: CourseModalProps) {
  const isEdit = !!course

  const createForm = useForm<CreateCourseInput>({ resolver: zodResolver(createCourseSchema) })
  const editForm = useForm<UpdateCourseInput>({ resolver: zodResolver(updateCourseSchema) })

  useEffect(() => {
    if (course) {
      editForm.reset({
        code: course.code,
        name: course.name,
        type: course.type,
        modality: course.modality,
        status: course.status,
      })
    } else {
      createForm.reset({ type: 'CURSO', modality: 'PRESENCIAL' })
    }
  }, [course, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error inesperado'

  const createMut = useMutation({
    mutationFn: (data: CreateCourseInput) => coursesApi.create(data),
    onSuccess: () => { toast.success('Curso creado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  const editMut = useMutation({
    mutationFn: (data: UpdateCourseInput) => coursesApi.update(course!.id, data),
    onSuccess: () => { toast.success('Curso actualizado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  if (!isEdit) {
    const { register, handleSubmit, watch, formState: { errors } } = createForm
    const courseType = watch('type')
    return (
      <Modal open={open} onOpenChange={onOpenChange} title="Nuevo curso / diplomado" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input dark label="Clave (código)" placeholder="Ej. DIP-2026-01" error={errors.code?.message} {...register('code')} />
            <Input dark label="Nombre" error={errors.name?.message} className="col-span-1" {...register('name')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SelectField label="Tipo" options={typeOptions} {...register('type')} />
            <SelectField label="Modalidad" options={modalityOptions} {...register('modality')} />
          </div>
          {courseType === 'DIPLOMADO' && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              <p className="col-span-2 text-xs font-medium text-[#FF9159]">Datos adicionales del diplomado</p>
              <Input dark label="Horas totales" type="number" {...register('hours', { valueAsNumber: true })} />
              <Input dark label="Duración" placeholder='Ej. "6 meses"' {...register('duration')} />
              <Input dark label="Requisitos de ingreso" className="col-span-2" {...register('requirements')} />
            </div>
          )}
          <Input dark label="Descripción (opcional)" {...register('description')} />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="brand" type="submit" loading={createMut.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>
    )
  }

  const { register, handleSubmit, watch, formState: { errors } } = editForm
  const courseType = watch('type')
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Editar curso" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit((d) => editMut.mutate(d))} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input dark label="Clave (código)" error={errors.code?.message} {...register('code')} />
          <Input dark label="Nombre" error={errors.name?.message} {...register('name')} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Tipo" options={typeOptions} {...register('type')} />
          <SelectField label="Modalidad" options={modalityOptions} {...register('modality')} />
          <SelectField label="Estado" options={statusOptions} {...register('status')} />
        </div>
        {courseType === 'DIPLOMADO' && (
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p className="col-span-2 text-xs font-medium text-[#FF9159]">Datos adicionales del diplomado</p>
            <Input dark label="Horas totales" type="number" {...register('hours', { valueAsNumber: true })} />
            <Input dark label="Duración" {...register('duration')} />
            <Input dark label="Requisitos de ingreso" className="col-span-2" {...register('requirements')} />
          </div>
        )}
        <Input dark label="Descripción (opcional)" {...register('description')} />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="submit" loading={editMut.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
