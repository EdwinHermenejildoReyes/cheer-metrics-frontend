'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Organization, PaginatedResponse } from '@/types/competitions';

// ── Color field ───────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-300 bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="h-9 w-24 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <div className="h-9 w-9 rounded-lg border border-zinc-200" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

// ── Palette preview ───────────────────────────────────────────────────────────
function PalettePreview({ org }: { org: Organization }) {
  return (
    <div className="flex items-center gap-1">
      {[org.primary_color, org.secondary_color, org.accent_color].map((c, i) => (
        <div key={i} className="h-5 w-5 rounded-full border border-zinc-200" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
interface OrgForm {
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_on_primary: string;
  logoFile: File | null;
  logoPreview: string | null;
}

const DEFAULT_FORM: OrgForm = {
  name: '',
  primary_color: '#6d28d9',
  secondary_color: '#4c1d95',
  accent_color: '#f59e0b',
  text_on_primary: '#ffffff',
  logoFile: null,
  logoPreview: null,
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function OrgModal({ editing, onClose, onSaved }: {
  editing: Organization | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<OrgForm>(() =>
    editing
      ? {
          name: editing.name,
          primary_color: editing.primary_color,
          secondary_color: editing.secondary_color,
          accent_color: editing.accent_color,
          text_on_primary: editing.text_on_primary,
          logoFile: null,
          logoPreview: editing.logo,
        }
      : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof OrgForm>(k: K, v: OrgForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('logoFile', file);
    set('logoPreview', URL.createObjectURL(file));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('primary_color', form.primary_color);
    fd.append('secondary_color', form.secondary_color);
    fd.append('accent_color', form.accent_color);
    fd.append('text_on_primary', form.text_on_primary);
    if (form.logoFile) fd.append('logo', form.logoFile);
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await competitionsRepository.updateOrganization(editing.id, buildFormData());
        toast.success('Organización actualizada');
      } else {
        await competitionsRepository.createOrganization(buildFormData());
        toast.success('Organización creada');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('No se pudo guardar la organización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            {editing ? 'Editar organización' : 'Nueva organización'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Nombre *</label>
            <input
              type="text"
              required
              placeholder="Ej. UCA Ecuador, UDA"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1.5 block">Logo</label>
            <div className="flex items-center gap-3">
              {form.logoPreview ? (
                <div className="relative h-16 w-16 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => { set('logoFile', null); set('logoPreview', null); }}
                    className="absolute top-0.5 right-0.5 rounded-full bg-white p-0.5 text-zinc-500 hover:text-red-500 shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {form.logoPreview ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <p className="mt-1 text-[11px] text-zinc-400">PNG, SVG · máx. 2 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Color primario" value={form.primary_color} onChange={(v) => set('primary_color', v)} />
            <ColorField label="Texto sobre primario" value={form.text_on_primary} onChange={(v) => set('text_on_primary', v)} />
            <ColorField label="Color secundario" value={form.secondary_color} onChange={(v) => set('secondary_color', v)} />
            <ColorField label="Color de acento" value={form.accent_color} onChange={(v) => set('accent_color', v)} />
          </div>

          {/* Preview strip */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: form.primary_color, color: form.text_on_primary }}
          >
            {form.logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoPreview} alt="" className="h-7 w-auto object-contain" />
            )}
            <span className="text-sm font-semibold">{form.name || 'Vista previa'}</span>
            <div className="ml-auto flex gap-1.5">
              {[form.secondary_color, form.accent_color].map((c, i) => (
                <div key={i} className="h-4 w-4 rounded-full border border-white/30" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 bg-white py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear organización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const confirm = useConfirm();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await competitionsRepository.listOrganizations({ page_size: '100' });
      setOrgs((res.data as PaginatedResponse<Organization>).results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (org: Organization) => { setEditing(org); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleDelete = async (org: Organization) => {
    if (!await confirm({ title: 'Eliminar organización', message: `¿Seguro que deseas eliminar "${org.name}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar' })) return;
    setDeleting(org.id);
    try {
      await competitionsRepository.deleteOrganization(org.id);
      toast.success('Organización eliminada');
      await load();
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Configuración</p>
          <p className="text-sm font-semibold text-zinc-900">Organizaciones</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva organización
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {orgs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500 mb-1">Sin organizaciones</p>
            <p className="text-xs text-zinc-400 mb-4">Crea una organización para asignarle logo y paleta de colores a tus eventos.</p>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Crear primera organización
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4"
              >
                {/* Logo */}
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: org.primary_color }}
                >
                  {org.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo} alt={org.name} className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <span
                      className="text-lg font-black"
                      style={{ color: org.text_on_primary }}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + palette */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{org.name}</p>
                  <div className="mt-1.5">
                    <PalettePreview org={org} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(org)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(org)}
                    disabled={deleting === org.id}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <OrgModal editing={editing} onClose={closeModal} onSaved={load} />
      )}
    </div>
  );
}
