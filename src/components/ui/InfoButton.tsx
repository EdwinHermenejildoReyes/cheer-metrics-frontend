'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from './modal';

interface InfoButtonProps {
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function InfoButton({ title, children, size = 'lg' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-colors shrink-0"
        aria-label="Ver reglas"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size={size}>
        {children}
      </Modal>
    </>
  );
}
