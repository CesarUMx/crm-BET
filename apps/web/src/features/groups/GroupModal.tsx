import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createGroupSchema, updateGroupSchema, type CreateGroupInput, type UpdateGroupInput } from 'shared'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { groupsApi, type GroupRow } from './api'

// Convierte el texto del campo Cupo a número; solo dígitos, vacío = ilimitado
function parseCapacity(v: string): number | undefined {
  const digits = v.replace(/\D/g, '')
  return digits === '' ? undefined : Number(digits)
}

interface GroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseModality: 'PRESENCIAL' | 'EN_LINEA' | 'HIBRIDO'
  group: GroupRow | null
  onSuccess: () => void
}

export function GroupModal({ open, onOpenChange, courseId, courseModality, group, onSuccess }: GroupModalProps) {
  const isEdit = !!group
  const showOnlineUrl = courseModality === 'EN_LINEA' || courseModality === 'HIBRIDO'

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => groupsApi.listTeachers().then((r) => r.data.data),
    enabled: open,
  })

  const createForm = useForm<CreateGroupInput>({ resolver: zodResolver(createGroupSchema) })
  const editForm = useForm<UpdateGroupInput>({ resolver: zodResolver(updateGroupSchema) })

  useEffect(() => {
    if (group) {
      editForm.reset({
        name: group.name,
        capacity: group.capacity,
        schedule: group.schedule ?? undefined,
        startDate: group.startDate?.slice(0, 10) ?? undefined,
        endDate: group.endDate?.slice(0, 10) ?? undefined,
        teacherId: group.teacherId,
        onlineMeetingUrl: group.onlineMeetingUrl ?? undefined,
      })
    } else {
      createForm.reset({ name: '', capacity: undefined, schedule: undefined, startDate: undefined, endDate: undefined, teacherId: undefined, onlineMeetingUrl: undefined })
    }
  }, [group, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const errMsg = (err: unknown) =>
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? 'Error inesperado'

  const createMut = useMutation({
    mutationFn: (data: CreateGroupInput) => groupsApi.create(courseId, data),
    onSuccess: () => { toast.success('Grupo creado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  const editMut = useMutation({
    mutationFn: (data: UpdateGroupInput) => groupsApi.update(group!.id, data),
    onSuccess: () => { toast.success('Grupo actualizado'); onSuccess() },
    onError: (err) => toast.error(errMsg(err)),
  })

  if (!isEdit) {
    const { register, handleSubmit, formState: { errors } } = createForm
    return (
      <Modal open={open} onOpenChange={onOpenChange} title="Nuevo grupo">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="flex flex-col gap-4">
          <Input dark label="Nombre del grupo" placeholder='Ej. "Grupo A", "Sabatino"' error={errors.name?.message} {...register('name')} />
          <Input dark label="Cupo (opcional, vacío = ilimitado)" type="text" inputMode="numeric" pattern="[0-9]*" error={errors.capacity?.message} {...register('capacity', { setValueAs: parseCapacity })} />
          <Input dark label="Horario (opcional)" placeholder='Ej. "Lunes a viernes 7-9pm"' error={errors.schedule?.message} {...register('schedule')} />
          <div className="grid grid-cols-2 gap-4">
            <Input dark label="Fecha de apertura (opcional)" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input dark label="Fecha de cierre (opcional)" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          {showOnlineUrl && (
            <Input dark label="Liga de videollamada (opcional)" placeholder="https://zoom.us/…" error={errors.onlineMeetingUrl?.message} {...register('onlineMeetingUrl')} />
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Docente (opcional)</label>
            <select className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none" {...register('teacherId')}>
              <option value="">Sin asignar</option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="brand" type="submit" loading={createMut.isPending}>Crear grupo</Button>
          </div>
        </form>
      </Modal>
    )
  }

  const { register, handleSubmit, formState: { errors } } = editForm
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Editar grupo">
      <form onSubmit={handleSubmit((d) => editMut.mutate(d))} className="flex flex-col gap-4">
        <Input dark label="Nombre del grupo" error={errors.name?.message} {...register('name')} />
        <Input dark label="Cupo (vacío = ilimitado)" type="text" inputMode="numeric" pattern="[0-9]*" error={errors.capacity?.message} {...register('capacity', { setValueAs: parseCapacity })} />
        <Input dark label="Horario (opcional)" error={errors.schedule?.message} {...register('schedule')} />
        <div className="grid grid-cols-2 gap-4">
          <Input dark label="Fecha de apertura (opcional)" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input dark label="Fecha de cierre (opcional)" type="date" error={errors.endDate?.message} {...register('endDate')} />
        </div>
        {showOnlineUrl && (
          <Input dark label="Liga de videollamada (opcional)" placeholder="https://zoom.us/…" error={errors.onlineMeetingUrl?.message} {...register('onlineMeetingUrl')} />
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Docente (opcional)</label>
          <select className="rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#FF6E00] focus:outline-none" {...register('teacherId')}>
            <option value="">Sin asignar</option>
            {(teachers ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" type="submit" loading={editMut.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}
