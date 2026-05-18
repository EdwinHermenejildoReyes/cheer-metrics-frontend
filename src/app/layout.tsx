import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'sonner';
import ReduxProvider from '@/core/provider';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Cheer Metrics',
    template: '%s | Cheer Metrics',
  },
  description: 'Plataforma de métricas para cheerleading',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ReduxProvider>
          {children}
          <Toaster />
        </ReduxProvider>
      </body>
    </html>
  );
}
