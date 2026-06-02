import { isAxiosError } from 'axios';
import { toast } from 'sonner';

const FIELD_LABELS: Record<string, string> = {
  stunts_difficulty:    'Dificultad — Stunts',
  stunts_execution:     'Ejecución — Stunts',
  stunts_drivers:       'Drivers — Stunts',
  pyramids_difficulty:  'Dificultad — Pirámides',
  pyramids_execution:   'Ejecución — Pirámides',
  tosses_difficulty:    'Dificultad — Lanzamientos',
  tosses_execution:     'Ejecución — Lanzamientos',
  standing_difficulty:  'Dificultad — Standing',
  standing_execution:   'Ejecución — Standing',
  standing_drivers:     'Drivers — Standing',
  running_difficulty:   'Dificultad — Running',
  running_execution:    'Ejecución — Running',
  running_drivers:      'Drivers — Running',
  jumps_difficulty:     'Dificultad — Saltos',
  jumps_execution:      'Ejecución — Saltos',
  formations_score:     'Formaciones',
  dance_difficulty:     'Dificultad — Danza',
  dance_execution:      'Ejecución — Danza',
  creativity_building:  'Creatividad — Building',
  creativity_tumbling:  'Creatividad — Tumbling',
  creativity_overall:   'Creatividad — Overall',
  showmanship_building: 'Showmanship — Building',
  showmanship_tumbling: 'Showmanship — Tumbling',
  showmanship_overall:  'Showmanship — Overall',
  pg_technique:         'Técnica — Partner Stunt',
  pg_difficulty:        'Dificultad — Partner Stunt',
  pg_form_appearance:   'Forma y Apariencia — Partner Stunt',
  pg_transitions:       'Transiciones — Partner Stunt',
  pg_expressiveness:    'Expresividad — Partner Stunt',
};

function firstMessage(val: unknown): string {
  if (Array.isArray(val)) return String(val[0]);
  return String(val);
}

export function toastApiError(err: unknown, fallback = 'No se pudo guardar') {
  if (!isAxiosError(err)) {
    toast.error(fallback);
    return;
  }

  const data = err.response?.data;
  if (!data || typeof data !== 'object') {
    toast.error(fallback);
    return;
  }

  // Single detail message
  if ('detail' in data) {
    toast.error(String((data as Record<string, unknown>).detail));
    return;
  }

  // Non-field errors
  if ('non_field_errors' in data) {
    toast.error(firstMessage((data as Record<string, unknown>).non_field_errors));
    return;
  }

  // Field-level errors — show one toast per field (max 4)
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    toast.error(fallback);
    return;
  }

  const shown = entries.slice(0, 4);
  shown.forEach(([field, msg]) => {
    const label = FIELD_LABELS[field] ?? field;
    toast.error(`${label}: ${firstMessage(msg)}`);
  });
}
