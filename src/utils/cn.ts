import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// from https://github.com/tailwindlabs/prettier-plugin-tailwindcss#sorting-classes-in-template-literals
export const tw = (strings: TemplateStringsArray, ...values: string[]) => String.raw({ raw: strings }, ...values);
