import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getSound } from "@/constants/sounds";
import { SoundsProvider, SOUND_FADE_MS, useSounds } from "@/context/sounds";
import { HowlerStub, playedSoundSrcs, soundCalls } from "@/test/sound-mock";

function Harness() {
  const { playSound, fadeOutActiveSound } = useSounds();
  return (
    <div>
      <button data-testid="play-fanfare" onClick={() => playSound("fanfare")} />
      <button data-testid="play-boop" onClick={() => playSound("boop")} />
      <button data-testid="fade-out" onClick={fadeOutActiveSound} />
    </div>
  );
}

function renderHarness() {
  return render(
    <SoundsProvider>
      <Harness />
    </SoundsProvider>,
  );
}

function callsFor(src: string, action: "fade" | "stop" | "volume" | "play") {
  return soundCalls().filter((call) => call.src === src && call.action === action);
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe("SoundsProvider", () => {
  test("plays the requested sound", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));

    expect(playedSoundSrcs()).toEqual([getSound("fanfare").src]);
  });

  test("fades the previous sound when switching", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));
    fireEvent.click(screen.getByTestId("play-boop"));

    expect(callsFor(getSound("fanfare").src, "fade")).toHaveLength(1);
    expect(playedSoundSrcs()).toEqual([getSound("fanfare").src, getSound("boop").src]);
  });

  test("re-playing the same sound restarts it cleanly", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));
    fireEvent.click(screen.getByTestId("play-fanfare"));

    const fanfare = getSound("fanfare").src;
    expect(callsFor(fanfare, "stop")).toHaveLength(2);
    expect(callsFor(fanfare, "fade")).toHaveLength(0);
    expect(playedSoundSrcs()).toEqual([fanfare, fanfare]);
  });

  test("re-playing a fading sound stops it before starting again", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));
    fireEvent.click(screen.getByTestId("fade-out"));
    fireEvent.click(screen.getByTestId("play-fanfare"));

    const fanfare = getSound("fanfare").src;
    // One stop from each play, plus the pending fade timer was cancelled.
    expect(callsFor(fanfare, "stop")).toHaveLength(2);
    expect(callsFor(fanfare, "fade")).toHaveLength(1);
    expect(playedSoundSrcs()).toEqual([fanfare, fanfare]);
  });

  test("fadeOutActiveSound fades, then stops and restores the volume", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));
    fireEvent.click(screen.getByTestId("fade-out"));

    const fanfare = getSound("fanfare");
    expect(callsFor(fanfare.src, "fade").at(-1)?.args).toEqual([fanfare.volume, 0, SOUND_FADE_MS]);
    // One stop from the initial play; the fade schedules another.
    expect(callsFor(fanfare.src, "stop")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(SOUND_FADE_MS);
    });

    expect(callsFor(fanfare.src, "stop")).toHaveLength(2);
    expect(callsFor(fanfare.src, "volume").at(-1)?.args).toEqual([fanfare.volume]);
  });

  test("fading when nothing is active is a no-op", () => {
    renderHarness();

    fireEvent.click(screen.getByTestId("fade-out"));

    expect(soundCalls()).toHaveLength(0);
  });

  test("resumes a suspended audio context before playing", () => {
    const resume = vi.fn(() => Promise.resolve());
    HowlerStub.ctx = { state: "suspended", resume };
    renderHarness();

    fireEvent.click(screen.getByTestId("play-fanfare"));

    expect(resume).toHaveBeenCalledTimes(1);
  });
});
