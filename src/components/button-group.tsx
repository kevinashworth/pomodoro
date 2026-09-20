import type { ComponentPropsWithRef } from "react";

import cn from "@/utils/cn";

const orientationClassNames = {
  horizontal: "inline-grid grid-flow-col auto-cols-fr",
  vertical: "inline-grid grid-flow-row auto-rows-[minmax(max-content,1fr)]",
} as const;

export type ButtonGroupOrientation = keyof typeof orientationClassNames;
export type ButtonGroupProps = ComponentPropsWithRef<"div"> & {
  orientation?: ButtonGroupOrientation;
};

export default function ButtonGroup({ className, orientation = "horizontal", ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn("w-max max-w-full gap-2 [&>button]:w-full", orientationClassNames[orientation], className)}
      {...props}
    />
  );
}
