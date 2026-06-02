'use client';

import { Printer } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
}

export function PrintButton({ label = 'Exportar PDF', className = '' }: Props) {
  return (
    <button
      onClick={() => window.print()}
      className={`print:hidden inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors ${className}`}
    >
      <Printer className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}
