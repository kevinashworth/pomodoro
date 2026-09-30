import cn from "@/utils/cn";

import type { ComponentPropsWithRef } from "react";

const baseClassName =
  "box-border rounded-full border font-bold whitespace-nowrap shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2";

const sizes = {
  xs: "px-5 py-1 text-xs",
  sm: "px-6 py-1.5 text-sm",
  md: "px-7 py-2 text-base",
  lg: "px-8 py-2.5 text-lg",
  xl: "px-10 py-3 text-xl",
} as const;

export const variants = {
  black: "border-transparent bg-zinc-950 text-white hover:bg-zinc-700 focus-visible:outline-zinc-950",
  blue: "border-transparent bg-blue-500 text-white hover:bg-blue-600 focus-visible:outline-blue-600",
  dark: "border-zinc-600 bg-zinc-900 text-white hover:border-zinc-400 focus-visible:outline-zinc-600",
  green: "border-transparent bg-green-500 text-white hover:bg-green-600 focus-visible:outline-green-600",
  light: "border-zinc-300 bg-zinc-200 text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-300",
  orange: "border-transparent bg-orange-500 text-white hover:bg-orange-600 focus-visible:outline-orange-600",
  red: "border-transparent bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-600",
  white: "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-500",
  yellow: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:outline-yellow-600",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;
export type ButtonProps = ComponentPropsWithRef<"button"> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export default function Button({ className, size = "xs", variant = "blue", ...props }: ButtonProps) {
  return <button className={cn(baseClassName, sizes[size], variants[variant], className)} {...props} />;
}
