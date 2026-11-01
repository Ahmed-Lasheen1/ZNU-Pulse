import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Joins class names and resolves conflicting Tailwind classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
