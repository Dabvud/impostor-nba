type AudioCtor = typeof AudioContext;

let context: AudioContext | null = null;

function audioCtor(): AudioCtor | undefined {
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioCtor }).webkitAudioContext;
}

/**
 * iOS spielt Web-Audio nur ab, wenn der Kontext bei einem Fingertipp erzeugt bzw.
 * fortgesetzt wurde. Deshalb wird er bei jedem Tippen freigeschaltet (siehe App).
 */
export function unlockAudio(): void {
  try {
    const Ctor = audioCtor();
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    // kein Audio verfügbar
  }
}

/** Kurzer Piepton plus Vibration – das iPhone kann aus Web-Apps nicht vibrieren, Android schon. */
export function alarm(): void {
  try {
    unlockAudio();
    if (context) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    }
  } catch {
    // Ton ist nur ein Zusatz
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration ist nur ein Zusatz
  }
}
