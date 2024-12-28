import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function removeNonAsciiChar(input: string) {
  // removing any non anscii characters
  return input.replace(/[^\x00-\x7F]/g, "");
}
