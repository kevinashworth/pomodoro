import { useEffect, useEffectEvent } from "react";

const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useSpacebarToggle(onToggle: () => void): void {
  const toggle = useEffectEvent(onToggle);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && FORM_TAGS.has(target.tagName)) return;
      event.preventDefault();
      toggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
