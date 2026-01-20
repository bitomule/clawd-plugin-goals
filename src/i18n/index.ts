import type { Locale } from "../types.js"
import { en } from "./en.js"
import { es } from "./es.js"

type TranslationMessages = typeof en
type TranslationPath = string

const translations: Record<Locale, TranslationMessages> = {
  en,
  es,
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".")
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === "string" ? current : undefined
}

export function t(
  locale: Locale,
  path: TranslationPath,
  params?: Record<string, string | number>
): string {
  const messages = translations[locale] || translations.en
  let message = getNestedValue(messages, path)

  if (!message) {
    message = getNestedValue(translations.en, path)
  }

  if (!message) {
    return path
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, "g"), String(value))
    }
  }

  return message
}

export function getLocale(userLocale?: string, defaultLocale: Locale = "en"): Locale {
  if (userLocale && (userLocale === "en" || userLocale === "es")) {
    return userLocale
  }
  return defaultLocale
}
