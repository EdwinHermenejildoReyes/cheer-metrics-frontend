'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, type, ...props }: InputProps) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (showPwd ? 'text' : 'password') : type}
          className={cn(
            'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400',
            'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent',
            isPassword && 'pr-9',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 hover:text-zinc-600"
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
