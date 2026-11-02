export type SoundCall = {
  src: string;
  action: "play" | "stop" | "fade" | "volume";
  args: unknown[];
};

const calls: SoundCall[] = [];

export function resetSoundMock(): void {
  calls.length = 0;
  HowlerStub.ctx = undefined;
}

export function soundCalls(): readonly SoundCall[] {
  return calls;
}

export function playedSoundSrcs(): string[] {
  return calls.filter((call) => call.action === "play").map((call) => call.src);
}

function record(src: string, action: SoundCall["action"], args: unknown[]): void {
  calls.push({ src, action, args });
}

type FakeHowlOptions = {
  src?: string[];
  volume?: number;
};

// Replaces howler in jsdom, where there is no audio backend. Each Howl records
// the calls the SoundsProvider makes so tests can assert which clip played,
// when it faded, and that its volume was restored.
export class FakeHowl {
  private src: string;
  private volumeValue: number;

  constructor(options: FakeHowlOptions = {}) {
    this.src = options.src?.[0] ?? "";
    this.volumeValue = options.volume ?? 1;
  }

  play(): number {
    record(this.src, "play", []);
    return 1;
  }

  stop(): this {
    record(this.src, "stop", []);
    return this;
  }

  fade(from: number, to: number, duration: number): this {
    record(this.src, "fade", [from, to, duration]);
    return this;
  }

  volume(value?: number): number | this {
    if (value === undefined) {
      return this.volumeValue;
    }
    record(this.src, "volume", [value]);
    this.volumeValue = value;
    return this;
  }

  unload(): null {
    return null;
  }
}

export const HowlerStub: {
  autoUnlock: boolean;
  ctx: { state: string; resume: () => Promise<void> } | undefined;
} = {
  autoUnlock: true,
  ctx: undefined,
};
