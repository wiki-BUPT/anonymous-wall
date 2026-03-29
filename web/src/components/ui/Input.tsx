import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`w-full h-12 px-4 rounded-2xl border bg-white/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/20 ${
            error 
              ? 'border-red-500 focus:border-red-500' 
              : 'border-zinc-200 focus:border-zinc-400 hover:border-zinc-300'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-500 px-1">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
