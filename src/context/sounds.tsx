import { createContext, use, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Howl, Howler } from "howler";

import { getSound, SOUNDS, type SoundId } from "@/constants/sounds";

export const SOUND_FADE_MS = 200;

type SoundsContextValue = {
  playSound: (id: SoundId) => void;
  fadeOutActiveSound: () => void;
};

const SoundsContext = createContext<SoundsContextValue | null>(null);

// Browsers suspend the audio context until a user gesture. Phase ends are
// usually preceded by Start/Resume, but previews can be the first interaction.
function unlockAudio(): void {
  if (Howler.ctx?.state === "suspended") {
    try {
      void Howler.ctx.resume().catch(() => {});
    } catch {
      // A closed or otherwise unusable context is not recoverable; playback
      // will simply be silent.
    }
  }
}

export function SoundsProvider({ children }: { children: ReactNode }) {
  const howlsRef = useRef<Map<SoundId, Howl>>(new Map());
  const activeIdRef = useRef<SoundId | null>(null);
  const fadeTimersRef = useRef(new Map<SoundId, ReturnType<typeof setTimeout>>());

  // One Howl per catalog entry, created once and unloaded when the provider
  // unmounts. Driving Howler directly keeps the catalog as the single source of
  // truth: adding a sound needs no change here.
  useEffect(() => {
    const howls = new Map(
      SOUNDS.map((sound) => [sound.id, new Howl({ src: [sound.src], volume: sound.volume, preload: true })]),
    );
    howlsRef.current = howls;

    return () => {
      howls.forEach((howl) => howl.unload());
      // Deliberately keep howlsRef populated: child effects (e.g. the settings
      // page fading a preview) clean up after this effect during a full tree
      // unmount, and Howler treats calls on unloaded Howls as no-ops.
    };
  }, []);

  const clearFadeTimer = useCallback((id: SoundId) => {
    const timer = fadeTimersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      fadeTimersRef.current.delete(id);
    }
  }, []);

  const fadeEntry = useCallback(
    (id: SoundId) => {
      const howl = howlsRef.current.get(id);
      if (!howl) return;

      clearFadeTimer(id);

      const volume = getSound(id).volume;
      const timer = setTimeout(() => {
        fadeTimersRef.current.delete(id);
        howl.stop();
        howl.volume(volume);
      }, SOUND_FADE_MS);

      fadeTimersRef.current.set(id, timer);
      howl.fade(howl.volume(), 0, SOUND_FADE_MS);
    },
    [clearFadeTimer],
  );

  const playSound = useCallback(
    (id: SoundId) => {
      const howl = howlsRef.current.get(id);
      if (!howl) return;

      const activeId = activeIdRef.current;

      // Always stop the target first: it may still be playing from before a
      // fade-out, in which case restarting would otherwise overlap two copies.
      clearFadeTimer(id);
      howl.stop();
      howl.volume(getSound(id).volume);

      if (activeId && activeId !== id) {
        fadeEntry(activeId);
      }

      activeIdRef.current = id;
      unlockAudio();
      howl.play();
    },
    [clearFadeTimer, fadeEntry],
  );

  const fadeOutActiveSound = useCallback(() => {
    const activeId = activeIdRef.current;
    activeIdRef.current = null;
    if (activeId) {
      fadeEntry(activeId);
    }
  }, [fadeEntry]);

  useEffect(() => {
    const timers = fadeTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ playSound, fadeOutActiveSound }), [fadeOutActiveSound, playSound]);

  return <SoundsContext value={value}>{children}</SoundsContext>;
}

export function useSounds(): SoundsContextValue {
  const ctx = use(SoundsContext);
  if (!ctx) {
    throw new Error("useSounds must be used within a SoundsProvider");
  }
  return ctx;
}
