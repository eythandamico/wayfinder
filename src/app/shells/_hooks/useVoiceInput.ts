import { useRef, useState, useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
const getSpeechRecognitionSupport = () => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
};

export function useVoiceInput(onResult: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const supported = useSyncExternalStore(
    subscribeNoop,
    getSpeechRecognitionSupport,
    () => false,
  );

  const toggle = () => {
    if (recording) {
      (recognitionRef.current as { stop?: () => void })?.stop?.();
      setRecording(false);
      return;
    }
    const Recognition =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: (e: {
        results: Array<Array<{ transcript: string }>>;
      }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    };
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  return { recording, toggle, supported };
}
