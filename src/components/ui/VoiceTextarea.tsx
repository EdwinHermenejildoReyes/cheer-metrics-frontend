'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/utils/cn';

type AnyWindow = Window & { webkitSpeechRecognition?: typeof SpeechRecognition };

function getSpeechSupport() {
  return !!(window.SpeechRecognition ?? (window as AnyWindow).webkitSpeechRecognition);
}
function getServerSpeechSupport() { return false; }
function noopSubscribe() { return () => {}; }

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseValueRef = useRef('');

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? (window as AnyWindow).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    baseValueRef.current = value;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'es-EC';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (!transcript) return;
      const base = baseValueRef.current;
      onChange(base ? `${base} ${transcript}` : transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
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
