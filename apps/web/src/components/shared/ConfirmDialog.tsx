import * as AlertDialog from '@radix-ui/react-dialog'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-in fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-3 bg-[#004A87] px-6 py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E9511D]">
              <TriangleAlert className="size-5 text-slate-100" />
            </div>
            <AlertDialog.Title className="text-base font-semibold text-slate-100">{title}</AlertDialog.Title>
          </div>
          <div className="p-6">
            <AlertDialog.Description className="text-sm text-[var(--text-secondary)]">{description}</AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Close asChild>
                <Button variant="secondary">Cancelar</Button>
              </AlertDialog.Close>
              <Button variant="danger" loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
