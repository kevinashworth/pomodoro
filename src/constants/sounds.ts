// Sound catalog. Entries are grouped by where they can be selected, then
// concatenated into one flat list so the provider can create a Howl per sound
// and `getSound` can resolve any id.
type SoundEntry = {
  id: string;
  label: string;
  src: string;
  volume: number;
};

export const PHASE_END_SOUNDS = [
  { id: "909-drums", label: "909 Drums", src: "/sounds/909-drums.mp3", volume: 0.4 },
  { id: "boop", label: "Boop", src: "/sounds/boop.mp3", volume: 0.35 },
  { id: "dun-dun-dun", label: "Dun Dun Dun", src: "/sounds/dun-dun-dun.mp3", volume: 0.5 },
  { id: "fanfare", label: "Fanfare", src: "/sounds/fanfare.mp3", volume: 0.5 },
  { id: "guitar-loop", label: "Guitar Loop", src: "/sounds/guitar-loop.mp3", volume: 0.25 },
  { id: "meow", label: "Meow", src: "/sounds/meow.mp3", volume: 0.3 },
  { id: "pfff", label: "Pfff", src: "/sounds/pfff.mp3", volume: 0.4 },
  { id: "rising-pops", label: "Rising Pops", src: "/sounds/rising-pops.mp3", volume: 0.35 },
] as const satisfies readonly SoundEntry[];

export const TICK_SOUNDS = [
  { id: "pop", label: "Pop", src: "/sounds/pop.mp3", volume: 0.3 },
  { id: "tick-tock", label: "Tick Tock", src: "/sounds/tick-tock.mp3", volume: 0.25 },
] as const satisfies readonly SoundEntry[];

export const SOUNDS = [...PHASE_END_SOUNDS, ...TICK_SOUNDS] as const;

export type Sound = (typeof SOUNDS)[number];
export type SoundId = Sound["id"];

export const DEFAULT_WORK_END_SOUND: SoundId = "fanfare";
export const DEFAULT_BREAK_END_SOUND: SoundId = "guitar-loop";
export const DEFAULT_TICK_SOUND: SoundId = "tick-tock";

export const NONE_SOUND_VALUE = "none";

export function isSoundId(value: unknown): value is SoundId {
  return typeof value === "string" && SOUNDS.some((sound) => sound.id === value);
}

export function isPhaseEndSoundId(value: unknown): value is (typeof PHASE_END_SOUNDS)[number]["id"] {
  return typeof value === "string" && PHASE_END_SOUNDS.some((sound) => sound.id === value);
}

export function isTickSoundId(value: unknown): value is (typeof TICK_SOUNDS)[number]["id"] {
  return typeof value === "string" && TICK_SOUNDS.some((sound) => sound.id === value);
}

export function getSound(id: SoundId): Sound {
  const sound = SOUNDS.find((candidate) => candidate.id === id);
  if (!sound) {
    throw new Error(`Unknown sound id: ${id}`);
  }
  return sound;
}
