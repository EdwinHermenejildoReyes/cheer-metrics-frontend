'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileText,
  FileArchive,
  X,
  Download,
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import competitionsRepository, {
  type ImportInscripcionResult,
} from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import type { ServiceType } from '@/types/competitions';

// ── Drag-drop zone ────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  icon: React.ReactNode;
  hint?: string;
}

function DropZone({ label, accept, file, onChange, icon, hint }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onChange(dropped);
    },
    [onChange],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      className={[
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
        file
          ? 'cursor-default border-zinc-200 bg-zinc-50'
          : 'cursor-pointer hover:border-zinc-400 hover:bg-zinc-50',
        dragging ? 'border-blue-400 bg-blue-50' : 'border-zinc-300',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
      />

      {file ? (
        <>
          <div className="flex items-center gap-3">
            <div className="text-zinc-400">{icon}</div>
            <div>
              <p className="text-sm font-medium text-zinc-900">{file.name}</p>
              <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <div className="text-zinc-300">{icon}</div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">{label}</p>
            {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
          </div>
          <p className="text-xs text-zinc-400">Arrastra aquí o haz clic para seleccionar</p>
        </>
      )}
    </div>
  );
}

// ── Results panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, isJudging }: { result: ImportInscripcionResult; isJudging: boolean }) {
  const isAborted = result.aborted;
  const hasErrors = result.errors.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Status banner */}
      {isAborted ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">Importación abortada</p>
            <p className="text-sm text-red-600">{result.abort_reason}</p>
          </div>
        </div>
      ) : (
        <div className={[
          'flex items-start gap-3 rounded-xl border px-5 py-4',
          hasErrors
            ? 'border-amber-200 bg-amber-50'
            : 'border-green-200 bg-green-50',
        ].join(' ')}>
          {hasErrors
            ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />}
          <div>
            <p className={`text-sm font-semibold ${hasErrors ? 'text-amber-700' : 'text-green-700'}`}>
              {hasErrors
                ? `Importación completada con ${result.errors.length} fila${result.errors.length !== 1 ? 's' : ''} con error`
                : 'Importación completada sin errores'}
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {!isAborted && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {isJudging ? (
            <>
              {[
                { label: 'Equipos inscritos',    value: result.registrations_created },
                { label: 'Divisiones creadas',   value: result.divisions_created },
                { label: 'Filas procesadas',     value: result.rows_ok },
                { label: 'Filas omitidas',       value: result.rows_skipped },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white py-4">
                  <span className="text-2xl font-semibold text-zinc-900">{value}</span>
                  <span className="mt-0.5 text-center text-[11px] text-zinc-500 leading-tight px-2">{label}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Atletas creados',      value: result.athletes_created },
                { label: 'Atletas actualizados', value: result.athletes_updated },
                { label: 'Divisiones creadas',   value: result.divisions_created },
                { label: 'Inscripciones',        value: result.registrations_created },
                { label: 'Membresías',           value: result.memberships_created },
                { label: 'Fotos asignadas',      value: result.photos_matched },
                { label: 'Filas procesadas',     value: result.rows_ok },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white py-4">
                  <span className="text-2xl font-semibold text-zinc-900">{value}</span>
                  <span className="mt-0.5 text-center text-[11px] text-zinc-500 leading-tight px-2">{label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Error table */}
      {result.errors.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200">
          <div className="bg-red-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-red-600">
            Filas con error ({result.errors.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-100 bg-white text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Fila</th>
                <th className="px-4 py-2.5">Campo</th>
                <th className="px-4 py-2.5">Valor</th>
                <th className="px-4 py-2.5">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {result.errors.map((err, i) => (
                <tr key={i} className="bg-white hover:bg-red-50/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{err.row}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-red-600">{err.field}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 max-w-[140px] truncate">{err.value || '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-700">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const competitionId = Number(id);
  const { isJudge } = useJudge();

  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [fotosZip, setFotosZip] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportInscripcionResult | null>(null);

  useEffect(() => {
    competitionsRepository.getCompetition(competitionId).then((res) => {
      setServiceType(res.data.service_type);
    }).catch(() => {});
  }, [competitionId]);

  if (isJudge) {
    router.replace(`/competitions/${competitionId}`);
    return null;
  }

  const isJudging = serviceType === 'judging_only';

  const handleImport = async () => {
    if (!xlsxFile) {
      toast.error('Selecciona el archivo primero.');
      return;
    }

    const formData = new FormData();
    if (isJudging) {
      formData.append('xlsx_file', xlsxFile);
    } else {
      formData.append('csv_file', xlsxFile);
      if (fotosZip) formData.append('fotos_zip', fotosZip);
    }

    setLoading(true);
    setResult(null);
    try {
      const res = isJudging
        ? await competitionsRepository.importJudging(competitionId, formData)
        : await competitionsRepository.importInscripcion(competitionId, formData);
      setResult(res.data);
      if (res.data.aborted) {
        toast.error('Importación abortada. Revisa el resultado.');
      } else if (res.data.errors.length > 0) {
        toast.warning(`Importado con ${res.data.errors.length} fila(s) con error.`);
      } else {
        toast.success('Importación completada sin errores.');
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al importar. Verifica el archivo e intenta de nuevo.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/competitions/${competitionId}`)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {isJudging ? 'Importar equipos (jueceo)' : 'Importar inscripción'}
          </h1>
          <p className="text-sm text-zinc-500">
            {isJudging
              ? 'Carga el Excel de jueceo para registrar equipos y divisiones automáticamente.'
              : 'Carga la planilla CSV de un gimnasio para registrar atletas, equipos e inscripciones automáticamente.'}
          </p>
        </div>
      </div>

      {/* Template download */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            {isJudging ? 'Plantilla de jueceo' : 'Plantilla de inscripción'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isJudging
              ? 'Excel con columnas requeridas y 5 filas de ejemplo. Completa y sube este archivo.'
              : 'Archivo Excel con listas desplegables para evitar errores de tipeo. Envíalo a los gimnasios.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isJudging && (
            <a href="/prueba_jueceo_50equipos.xlsx" download>
              <Button variant="secondary" size="sm">
                <Download className="h-3.5 w-3.5" />
                Datos de prueba (50 equipos)
              </Button>
            </a>
          )}
          <a href={isJudging ? '/plantilla_jueceo2026.xlsx' : '/plantilla_inscripcion2026.xlsx'} download>
            <Button variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla (.xlsx)
            </Button>
          </a>
        </div>
      </div>

      {/* Upload zones */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            {isJudging ? 'Archivo de jueceo' : 'Planilla de inscripción'}{' '}
            <span className="text-red-500">*</span>
          </p>
          <DropZone
            label={isJudging ? 'Archivo de jueceo (.xlsx)' : 'Archivo de inscripción (.xlsx o .csv)'}
            accept=".xlsx,.csv"
            file={xlsxFile}
            onChange={setXlsxFile}
            icon={<FileText className="h-8 w-8" />}
            hint={isJudging ? 'Formato: nombre equipo, gimnasio, categoría, división, NIVEL, PANEL, atletas, WhatsApp, correo' : 'Formato: plantilla_inscripcion2026.xlsx'}
          />
        </div>

        {!isJudging && (
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">
              Fotos de atletas{' '}
              <span className="text-xs font-normal text-zinc-400">(opcional — ZIP con fotos nombradas por cédula)</span>
            </p>
            <DropZone
              label="Archivo ZIP con fotos"
              accept=".zip"
              file={fotosZip}
              onChange={setFotosZip}
              icon={<FileArchive className="h-8 w-8" />}
              hint="Cada foto nombrada como {cédula}.jpg — ej: 1712345678.jpg"
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
        {isJudging ? (
          <>
            <p className="font-medium text-zinc-800 mb-2">Columnas requeridas en el Excel:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-500">
              <li><strong>nombre equipo</strong> — nombre del equipo.</li>
              <li><strong>gimnasio</strong> — nombre del gimnasio (se crea si no existe).</li>
              <li><strong>categoría</strong> — grupo etario: tiny, mini, youth, junior, senior, open.</li>
              <li><strong>división</strong> — prep, novice, elite (o nombre de la división).</li>
              <li><strong>NIVEL</strong> — 1–7 o prep, novice, elite (requerido para divisiones de nivel variable).</li>
              <li><strong>PANEL</strong> o <strong>AG/COED</strong> — all_girl, coed, all_male, non_tumbling.</li>
              <li><strong>NUMERO ATLETAS</strong> — cantidad de atletas.</li>
              <li><strong>WHATSAPP</strong> y <strong>CORREO</strong> — contacto del coach (opcionales).</li>
            </ul>
          </>
        ) : (
          <>
            <p className="font-medium text-zinc-800 mb-2">Antes de importar, verifica que:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-500">
              <li>Usa la plantilla <strong>.xlsx</strong> — tiene listas desplegables que evitan errores de tipeo.</li>
              <li>El campo <strong>nivel</strong> acepta: L1–L7, prep, escolar, novice, novice_plus, elite, icc, star.</li>
              <li>El campo <strong>categoria</strong> acepta: all_girl, coed, all_male, non_tumbling.</li>
              <li>El campo <strong>grupo_etario</strong> acepta: tiny, mini, youth, junior, senior, open.</li>
              <li>El campo <strong>genero</strong> acepta: F o M.</li>
              <li>Los atletas ya existentes se actualizarán por cédula; no se crearán duplicados.</li>
            </ul>
          </>
        )}
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <Button onClick={handleImport} loading={loading} disabled={!xlsxFile || loading}>
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Importando…</>
            : <><Upload className="h-4 w-4" />{isJudging ? 'Importar equipos' : 'Importar inscripción'}</>}
        </Button>
      </div>

      {/* Results */}
      {result && <ResultsPanel result={result} isJudging={isJudging} />}
    </div>
  );
}
