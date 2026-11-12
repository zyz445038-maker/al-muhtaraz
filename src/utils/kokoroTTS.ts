'use client';

export function isKokoroSupported(): boolean {
  return typeof window !== 'undefined';
}

export async function speakWithKokoro(text: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!text || !text.trim()) return;

  // 1. Web Speech API — Arabic voice from OS (zero download, works offline)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      await speakWithWebSpeech(text, 'ar-SA');
      return;
    } catch (error) {
      console.warn('Web Speech API Arabic failed, trying kokoro-js:', error);
    }
  }

  // 2. Kokoro-js fallback (local model, no external service)
  try {
    await speakWithKokoroLocal(text);
    return;
  } catch (error) {
    console.error('All TTS methods failed:', error);
    throw error;
  }
}

function speakWithWebSpeech(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = (event) =>
      reject(new Error(`Web Speech API error: ${event.error}`));
    window.speechSynthesis.speak(utterance);
  });
}

async function speakWithKokoroLocal(text: string): Promise<void> {
  const { KokoroTTS } = await import('kokoro-js');

  const kokoroInstance = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    { dtype: 'q8', device: 'wasm' }
  );

  if (!kokoroInstance) {
    throw new Error('Kokoro TTS not available');
  }

  const audio = (await kokoroInstance.generate(text, {
    voice: 'af_bella',
    speed: 1.0,
  })) as unknown as { arrayBuffer(): Promise<ArrayBuffer> };

  if (!audio) {
    throw new Error('Kokoro returned no audio');
  }

  const arrayBuffer = await audio.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  const audioEl = new Audio(url);
  audioEl.play();

  audioEl.onended = () => {
    URL.revokeObjectURL(url);
  };
  audioEl.onerror = () => {
    URL.revokeObjectURL(url);
  };
}

export async function stopKokoro(): Promise<void> {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
