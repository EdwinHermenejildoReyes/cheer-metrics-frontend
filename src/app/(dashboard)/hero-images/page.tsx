'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Trash2, Upload, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { HeroImage } from '@/types/competitions';

export default function HeroImagesPage() {
  const [images, setImages]   = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await competitionsRepository.listHeroImages();
      setImages(res.data.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('order', String(images.length));
        await competitionsRepository.createHeroImage(fd);
      }
      toast.success(`${files.length > 1 ? `${files.length} imágenes subidas` : 'Imagen subida'} correctamente`);
      await load();
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta imagen del carrusel?')) return;
    try {
      await competitionsRepository.deleteHeroImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      toast.success('Imagen eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleOrderChange = async (id: number, newOrder: number) => {
    try {
      await competitionsRepository.updateHeroImage(id, { order: newOrder });
      setImages(prev =>
        [...prev.map(img => img.id === id ? { ...img, order: newOrder } : img)]
          .sort((a, b) => a.order - b.order),
      );
    } catch {
      toast.error('No se pudo actualizar el orden');
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Imágenes del carrusel</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Imágenes que aparecen en el fondo de la página principal</p>
        </div>
        <Button
          onClick={() => fileRef.current?.click()}
          loading={uploading}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Subir imagen
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-16 flex flex-col items-center gap-3 text-center">
          <ImageIcon className="w-10 h-10 text-zinc-200" />
          <p className="text-sm text-zinc-400">No hay imágenes. Sube la primera para activar el carrusel.</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Subir imagen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, idx) => (
            <div key={img.id} className="group relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50">
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>

              <div className="px-3 py-2 flex items-center justify-between gap-2 bg-white border-t border-zinc-100">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <GripVertical className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Orden:</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={img.order}
                    className="w-14 rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400"
                    onBlur={e => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val !== img.order) handleOrderChange(img.id, val);
                    }}
                  />
                </div>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute top-2 left-2 rounded bg-zinc-900/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
