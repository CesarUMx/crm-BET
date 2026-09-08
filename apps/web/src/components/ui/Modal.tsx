import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: string
  /** Evita que un clic fuera del modal lo cierre (solo se cierra con la X o Escape) */
  preventOutsideClose?: boolean
}

export function Modal({ open, onOpenChange, title, description, children, maxWidth = 'max-w-lg', preventOutsideClose }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onPointerDownOutside={(e) => { if (preventOutsideClose) e.preventDefault() }}
          className={[
            'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            maxWidth,
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-4 bg-[#004A87] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-100">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-slate-300">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close title="Cerrar" className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-slate-100">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
