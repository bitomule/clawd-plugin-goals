import type { Locale } from "../types.js"
import { t } from "../i18n/index.js"

export interface CronSetupParams {
  userId: string
  channel: string
  morningCron?: string
  eveningCron?: string
  timezone?: string
  locale?: Locale
  name?: string
}

export function getMorningCronMessage(locale: Locale = "en"): string {
  return t(locale, "cron.morningReview")
}

export function getEveningCronMessage(locale: Locale = "en", name?: string): string {
  const nameStr = name ? `, ${name}` : ""
  return t(locale, "cron.eveningCheckin", { name: nameStr })
}

export function formatReminderSuccess(
  locale: Locale,
  morningCron: string,
  eveningCron: string,
  timezone: string
): string {
  return t(locale, "reminders.setupSuccess", {
    morning: morningCron,
    evening: eveningCron,
    timezone,
  })
}

export function formatReminderRemoved(locale: Locale): string {
  return t(locale, "reminders.removeSuccess")
}
