import type { ClawdbotPluginApi, Locale } from "../types.js"
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

export async function setupUserCrons(
  api: ClawdbotPluginApi,
  params: CronSetupParams
): Promise<{ success: boolean; message: string }> {
  const {
    userId,
    channel,
    morningCron = "0 9 * * *",
    eveningCron = "0 20 * * *",
    timezone = "UTC",
    locale = "en",
    name = "",
  } = params

  try {
    await api.callGatewayMethod("cron.add", {
      jobId: `goals-morning-${userId}`,
      schedule: {
        cron: morningCron,
        timezone,
      },
      payload: {
        kind: "agentTurn",
        message: t(locale, "cron.morningReview"),
        channel,
        to: userId,
      },
    })

    const nameStr = name ? `, ${name}` : ""
    await api.callGatewayMethod("cron.add", {
      jobId: `goals-evening-${userId}`,
      schedule: {
        cron: eveningCron,
        timezone,
      },
      payload: {
        kind: "agentTurn",
        message: t(locale, "cron.eveningCheckin", { name: nameStr }),
        channel,
        to: userId,
      },
    })

    return {
      success: true,
      message: t(locale, "reminders.setupSuccess", {
        morning: morningCron,
        evening: eveningCron,
        timezone,
      }),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: t(locale, "reminders.setupFailed", { error: errorMsg }),
    }
  }
}

export async function removeUserCrons(
  api: ClawdbotPluginApi,
  userId: string,
  locale: Locale = "en"
): Promise<{ success: boolean; message: string }> {
  try {
    await api.callGatewayMethod("cron.remove", { jobId: `goals-morning-${userId}` })
    await api.callGatewayMethod("cron.remove", { jobId: `goals-evening-${userId}` })

    return {
      success: true,
      message: t(locale, "reminders.removeSuccess"),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: t(locale, "reminders.setupFailed", { error: errorMsg }),
    }
  }
}
