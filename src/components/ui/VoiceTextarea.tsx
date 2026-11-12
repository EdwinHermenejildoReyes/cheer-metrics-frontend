'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type AnyWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechSupport() {
  const w = window as AnyWindow;
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}
function getServerSpeechSupport() { return false; }
function noopSubscribe() { return () => {}; }

// Errors that indicate a real problem — stop recording and notify user.
// no-speech and aborted are transient; let onend restart the session.
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network']);

const ERROR_MSGS: Record<string, string> = {
  'network':             'Error de red — no se puede conectar con el servicio de voz.',
  'not-allowed':         'Permiso de micrófono denegado.',
  'service-not-allowed': 'El servicio de voz no está disponible en este navegador.',
  'audio-capture':       'No se encontró micrófono.',
};

interface VoiceTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
  disabled,
  readOnly,
}: VoiceTextareaProps) {
  const isSupported = useSyncExternalStore(noopSubscribe, getSpeechSupport, getServerSpeechSupport);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef  = useRef<SpeechRecognitionInstance | null>(null);
  const baseValueRef    = useRef('');
  // Tracks user intent: true = keep recording, false = user clicked stop (or error)
  const shouldListenRef = useRef(false);

  // Cleanup on unmount — stop any ongoing session silently
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const stopListening = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    const w = window as AnyWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    shouldListenRef.current = true;
    baseValueRef.current = value;  // capture base text once at session start

    const startSession = () => {
      if (!shouldListenRef.current) return;

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const parts: string[] = [];
        for (let i = 0; i < results.length; i++) parts.push(results[i][0].transcript);
        const transcript = parts.join(' ').trim();
        if (!transcript) return;
        const base = baseValueRef.current;
        const next = base ? `${base} ${transcript}` : transcript;
        baseValueRef.current = next;
        onChange(next);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (shouldListenRef.current) {
          // Auto-restart after each utterance — user is still in dictation mode.
          // 150 ms gap prevents rapid-fire restart loops on consecutive errors.
          setTimeout(() => {
            if (shouldListenRef.current) startSession();
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (FATAL_ERRORS.has(event.error)) {
          shouldListenRef.current = false;
          setIsListening(false);
          toast.error(ERROR_MSGS[event.error] ?? `Error de reconocimiento: ${event.error}`);
        }
        // no-speech / aborted: non-fatal — onend will fire next and restart the session
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    startSession();
    setIsListening(true);
  };

  const toggle = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const showMic = isSupported && !disabled && !readOnly;

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(className, showMic && 'pb-9')}
      />
      {showMic && (
        <button
          type="button"
          onClick={toggle}
          title={isListening ? 'Detener grabación' : 'Dictar comentario con voz'}
          className={cn(
            'absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            isListening
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700',
          )}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Grabando…
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              Dictar
            </>
          )}
        </button>
      )}
    </div>
  );
}
