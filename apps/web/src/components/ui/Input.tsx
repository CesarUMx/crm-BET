import { type InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Estilo oscuro para las pantallas del sistema (login/cambio de contraseña usan el claro por defecto) */
  dark?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, dark, className = '', id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className={`text-sm font-medium ${dark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={[
            dark
              ? 'rounded-md border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6E00] focus:outline-none focus:ring-1 focus:ring-[#FF6E00] disabled:bg-[var(--surface)] disabled:text-[var(--text-muted)]'
              : 'rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500',
            error ? (dark ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : 'border-red-400 focus:border-red-500 focus:ring-red-500') : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className={`text-xs ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
