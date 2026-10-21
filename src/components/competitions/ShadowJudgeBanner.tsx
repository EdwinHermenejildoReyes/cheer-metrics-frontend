'use client';

import { EyeOff } from 'lucide-react';

export function ShadowJudgeBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 print:hidden">
      <EyeOff className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-violet-800 leading-tight">Estás calificando como juez sombra</p>
        <p className="text-xs text-violet-600 mt-0.5 leading-relaxed">
          Tus puntuaciones y observaciones se guardan pero <strong>no afectan el resultado oficial</strong> de la competencia. Usa el campo de comentarios para registrar tus observaciones detalladas.
        </p>
      </div>
    </div>
  );
}
