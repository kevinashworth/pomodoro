import { useCallback, useRef, useState } from "react";

import { getRemainingSecondsFromPointer } from "@/utils/ring";

type UseRingDragOptions = {
  center: number;
  phaseMaxSeconds: number;
  setRemainingSeconds: (seconds: number) => void;
};

export function useRingDrag({ center, phaseMaxSeconds, setRemainingSeconds }: UseRingDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const nextRemaining = getRemainingSecondsFromPointer(clientX, clientY, rect, center, phaseMaxSeconds);

      setRemainingSeconds(nextRemaining);
    },
    [center, phaseMaxSeconds, setRemainingSeconds],
  );

  const onDragStart = (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    (event.currentTarget as SVGCircleElement).setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    updateFromPointer(event.clientX, event.clientY);
  };

  const onDragEnd = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!isDragging) return;
    (event.currentTarget as SVGCircleElement).releasePointerCapture(event.pointerId);
    setIsDragging(false);
    updateFromPointer(event.clientX, event.clientY);
  };

  return { isDragging, svgRef, onDragStart, onDragMove, onDragEnd };
}
