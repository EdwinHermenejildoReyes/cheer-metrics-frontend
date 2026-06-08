export interface PlatformSettings {
  primary_color:    string;
  primary_fg_color: string;
  accent_color:     string;
  bg_color:         string;
  surface_color:    string;
  border_color:     string;
  text_color:       string;
  text_muted_color: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  primary_color:    '#6d28d9',
  primary_fg_color: '#ffffff',
  accent_color:     '#f59e0b',
  bg_color:         '#ffffff',
  surface_color:    '#f4f4f5',
  border_color:     '#e4e4e7',
  text_color:       '#1e1b4b',
  text_muted_color: '#71717a',
};

export const PLT_VAR_MAP: Record<keyof PlatformSettings, string> = {
  primary_color:    '--plt-primary',
  primary_fg_color: '--plt-primary-fg',
  accent_color:     '--plt-accent',
  bg_color:         '--plt-bg',
  surface_color:    '--plt-surface',
  border_color:     '--plt-border',
  text_color:       '--plt-text',
  text_muted_color: '--plt-muted',
};
