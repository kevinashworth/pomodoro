import cn, { tw } from "@/utils/cn";

import type { ComponentPropsWithRef } from "react";

const baseClassName = tw`box-border inline-flex items-center justify-center gap-2 rounded-full border font-bold whitespace-nowrap shadow-xs select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed`;

const sizes = {
  xs: tw`px-5 py-1 text-xs`,
  sm: tw`px-6 py-1.5 text-sm`,
  md: tw`px-7 py-2 text-base`,
  lg: tw`px-8 py-2.5 text-lg`,
  xl: tw`px-10 py-3 text-xl`,
} as const;

export const variants = {
  black: tw`border-transparent bg-zinc-950 text-white hover:bg-zinc-700 focus-visible:outline-zinc-950`,
  blue: tw`border-transparent bg-blue-500 text-white hover:bg-blue-600 focus-visible:outline-blue-600`,
  dark: tw`border-zinc-600 bg-zinc-900 text-white hover:border-zinc-400 focus-visible:outline-zinc-600 disabled:pointer-events-none disabled:text-zinc-500 disabled:hover:border-zinc-600`,
  green: tw`border-transparent bg-green-500 text-white focus-visible:outline-green-600`,
  light: tw`border-zinc-300 bg-zinc-200 text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-300`,
  orange: tw`border-transparent bg-orange-500 text-white focus-visible:outline-orange-600`,
  red: tw`border-transparent bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-600`,
  white: tw`border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-500`,
  yellow: tw`border-transparent bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:outline-yellow-600`,
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
