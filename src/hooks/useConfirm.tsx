'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmOptions {
  title?:        string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      'danger' | 'warning';
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

interface State extends ConfirmOptions { open: boolean }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state,   setState]   = useState<State | null>(null);
  const resolveRef            = useRef<(v: boolean) => void>(null!);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const options = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ variant: 'danger', ...options, open: true });
    });
  }, []);

  const close = (confirmed: boolean) => {
    setState(null);
    resolveRef.current?.(confirmed);
  };

  useEffect(() => {
    if (!state?.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter')  close(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.open]);

  const isDanger  = state?.variant !== 'warning';
  const iconColor = isDanger ? 'text-red-500'    : 'text-amber-500';
  const iconBg    = isDanger ? 'bg-red-50'        : 'bg-amber-50';
  const iconRing  = isDanger ? 'bg-red-100'       : 'bg-amber-100';
  const btnColor  = isDanger
    ? 'text-red-600 hover:bg-red-50'
    : 'text-amber-600 hover:bg-amber-50';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state?.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => close(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-xs rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">

            {/* Icon area */}
            <div className={`flex items-center justify-center pt-8 pb-4 ${iconBg}`}>
              <div className={`flex items-center justify-center w-16 h-16 rounded-full ${iconRing}`}>
                {isDanger
                  ? <Trash2      className={`w-7 h-7 ${iconColor}`} />
                  : <AlertTriangle className={`w-7 h-7 ${iconColor}`} />
                }
              </div>
            </div>

            {/* Text */}
            <div className="px-6 pt-3 pb-6 text-center">
              {state.title && (
                <h3 className="text-base font-semibold text-zinc-900 mb-1">{state.title}</h3>
              )}
              <p className="text-sm text-zinc-500 leading-relaxed">{state.message}</p>
            </div>

            {/* Actions */}
            <div className="flex border-t border-zinc-100">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors border-r border-zinc-100"
              >
                {state.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-colors ${btnColor}`}
              >
                {state.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
