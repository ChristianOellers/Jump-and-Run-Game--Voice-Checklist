import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/services/speech";

interface Options {
  language: string;
  onFinal?: (text: string) => void;
}

export interface SpeechState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition({ language, onFinal }: Options): SpeechState {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");

    const rec = new Ctor();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let liveInterim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else liveInterim += r[0].transcript;
      }
      setTranscript(finalText.trim());
      setInterim(liveInterim);
    };
    rec.onerror = (e) => {
      const err = e.error || "unknown";
      const map: Record<string, string> = {
        "not-allowed": "Microphone permission was denied.",
        "service-not-allowed": "Microphone permission was denied.",
        "no-speech": "No speech detected. Try again.",
        "audio-capture": "No microphone was found.",
        network: "Network error during speech recognition.",
      };
      setError(map[err] ?? `Speech error: ${err}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const trimmed = finalText.trim();
      if (trimmed) onFinalRef.current?.(trimmed);
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (err) {
      setError((err as Error).message);
      setListening(false);
    }
  }, [language]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    },
    [],
  );

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
