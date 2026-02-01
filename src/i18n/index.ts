import type { Locale, Messages } from "./types.js";
import { en } from "./en.js";
import { fr } from "./fr.js";

export type { Locale, Messages };

const locales: Record<Locale, Messages> = { en, fr };

export function getMessages(locale: Locale): Messages {
  return locales[locale];
}

/** Simple string interpolation: replaces {key} with values */
export function interpolate(template: string, values: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
