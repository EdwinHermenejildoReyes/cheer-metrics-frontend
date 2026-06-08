'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/contexts/PlatformSettingsContext';
import settingsRepository from '@/repositories/settingsRepository';
import { DEFAULT_PLATFORM_SETTINGS } from '@/types/settings';
import type { PlatformSettings } from '@/types/settings';

// ── Color field ───────────────────────────────────────────────────────────────
function ColorField({ label, description, value, onChange }: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-plt-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-plt-text">{label}</p>
        {description && <p className="text-xs text-plt-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-8 rounded-lg border border-plt-border shadow-sm" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-plt-border bg-plt-bg p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="h-8 w-24 rounded-lg border border-plt-border bg-plt-bg px-2 text-sm font-mono text-plt-text focus:outline-none focus:ring-2 focus:ring-[var(--plt-primary)]"
        />
      </div>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────
function Preview({ form }: { form: PlatformSettings }) {
  return (
    <div className="rounded-xl border border-plt-border overflow-hidden text-sm shadow-sm">
      {/* Mini sidebar strip */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 font-semibold"
        style={{ backgroundColor: form.primary_color, color: form.primary_fg_color }}
      >
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: form.primary_fg_color, opacity: 0.6 }} />
        <span className="text-xs">Cheer Metrics</span>
      </div>

      {/* Surface */}
      <div style={{ backgroundColor: form.surface_color, borderBottom: `1px solid ${form.border_color}` }}
           className="px-4 py-2.5 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: form.primary_color }} />
        <span className="text-xs font-medium" style={{ color: form.text_color }}>Competencias</span>
        <div className="ml-auto h-2 w-12 rounded-full opacity-30" style={{ backgroundColor: form.text_color }} />
      </div>

      {/* Card */}
      <div style={{ backgroundColor: form.bg_color }} className="p-4 flex flex-col gap-3">
        <div className="rounded-lg border p-3" style={{ borderColor: form.border_color, backgroundColor: form.bg_color }}>
          <p className="text-xs font-semibold mb-1" style={{ color: form.text_color }}>Título de ejemplo</p>
          <p className="text-[11px]" style={{ color: form.text_muted_color }}>
            Texto secundario y descripción breve de la sección.
          </p>
          <div className="mt-2.5 flex gap-2">
            <div
              className="rounded-md px-3 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: form.primary_color, color: form.primary_fg_color }}
            >
              Acción
            </div>
            <div
              className="rounded-md px-3 py-1 text-[11px] font-semibold border"
              style={{ borderColor: form.border_color, color: form.text_muted_color }}
            >
              Cancelar
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: form.accent_color }} />
          <span className="text-[11px]" style={{ color: form.text_muted_color }}>Acento: {form.accent_color}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BrandingSettingsPage() {
  const { settings, applySettings } = usePlatformSettings();
  const [form, setForm] = useState<PlatformSettings>(settings);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PlatformSettings>(k: K, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(updated);
    applySettings(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsRepository.updateSettings(form);
      applySettings(res.data);
      setForm(res.data);
      toast.success('Paleta guardada');
    } catch {
      toast.error('No se pudo guardar la paleta');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_PLATFORM_SETTINGS);
    applySettings(DEFAULT_PLATFORM_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-plt-surface pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-plt-bg border-b border-plt-border px-6 py-3 shadow-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-plt-muted font-medium">Configuración</p>
          <p className="text-sm font-semibold text-plt-text">Paleta de colores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} type="button">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar
          </Button>
          <Button onClick={handleSave} loading={saving} size="sm">
            Guardar paleta
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — pickers */}
        <div className="flex flex-col gap-4">

          <div className="rounded-xl border border-plt-border bg-plt-bg p-5">
            <h2 className="text-sm font-semibold text-plt-text mb-1">Marca</h2>
            <p className="text-xs text-plt-muted mb-3">Color principal y de acento de la plataforma.</p>
            <ColorField
              label="Color primario"
              description="Sidebar activo, botones principales"
              value={form.primary_color}
              onChange={(v) => set('primary_color', v)}
            />
            <ColorField
              label="Texto sobre primario"
              description="Texto e íconos sobre el color primario"
              value={form.primary_fg_color}
              onChange={(v) => set('primary_fg_color', v)}
            />
            <ColorField
              label="Color de acento"
              description="Badges, highlights, indicadores"
              value={form.accent_color}
              onChange={(v) => set('accent_color', v)}
            />
          </div>

          <div className="rounded-xl border border-plt-border bg-plt-bg p-5">
            <h2 className="text-sm font-semibold text-plt-text mb-1">Fondos y superficies</h2>
            <p className="text-xs text-plt-muted mb-3">Base visual de la interfaz.</p>
            <ColorField
              label="Fondo"
              description="Cards, modales, sidebar"
              value={form.bg_color}
              onChange={(v) => set('bg_color', v)}
            />
            <ColorField
              label="Superficie"
              description="Área de contenido principal, hover"
              value={form.surface_color}
              onChange={(v) => set('surface_color', v)}
            />
            <ColorField
              label="Borde"
              description="Líneas divisorias, contornos"
              value={form.border_color}
              onChange={(v) => set('border_color', v)}
            />
          </div>

          <div className="rounded-xl border border-plt-border bg-plt-bg p-5">
            <h2 className="text-sm font-semibold text-plt-text mb-1">Tipografía</h2>
            <p className="text-xs text-plt-muted mb-3">Colores de texto en la interfaz.</p>
            <ColorField
              label="Texto principal"
              description="Títulos, labels, texto de cuerpo"
              value={form.text_color}
              onChange={(v) => set('text_color', v)}
            />
            <ColorField
              label="Texto secundario"
              description="Subtítulos, hints, metadatos"
              value={form.text_muted_color}
              onChange={(v) => set('text_muted_color', v)}
            />
          </div>
        </div>

        {/* Right — preview */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-plt-border bg-plt-bg p-5">
            <h2 className="text-sm font-semibold text-plt-text mb-3">Vista previa</h2>
            <Preview form={form} />
          </div>

          <div className="rounded-xl border border-plt-border bg-plt-bg p-5">
            <h2 className="text-sm font-semibold text-plt-text mb-2">Variables CSS generadas</h2>
            <pre className="text-[11px] text-plt-muted leading-relaxed font-mono overflow-x-auto">
{`--plt-primary:    ${form.primary_color}
--plt-primary-fg: ${form.primary_fg_color}
--plt-accent:     ${form.accent_color}
--plt-bg:         ${form.bg_color}
--plt-surface:    ${form.surface_color}
--plt-border:     ${form.border_color}
--plt-text:       ${form.text_color}
--plt-muted:      ${form.text_muted_color}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
