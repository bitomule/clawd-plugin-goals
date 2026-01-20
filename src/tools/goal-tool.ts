import type {
  GoalsConfig,
  ClawdbotPluginToolContext,
  ClawdbotPluginApi,
  Locale,
  Obstacle,
} from "../types.js"
import { GoalsParams, type GoalsParamsType } from "../schemas.js"
import { addGoal, getGoal, listGoals, updateGoal, deleteGoal, getNextGoalNeedingAttention } from "../core/goals.js"
import { addReview } from "../core/reviews.js"
import { unlockReadyGoals } from "../core/unlock.js"
import { readPreferences, writePreferences, readObstacles, writeObstacles, appendSessionLog } from "../storage/file-io.js"
import { readPatterns } from "../storage/file-io.js"
import { t, getLocale } from "../i18n/index.js"
import { expandPath } from "../storage/paths.js"
import { generateCoaching } from "../ai/coaching.js"
import { randomUUID } from "node:crypto"

export function createGoalsTool(api: ClawdbotPluginApi) {
  const config = api.pluginConfig as GoalsConfig
  const basePath = expandPath(config.dataPath || "~/clawd/goals")

  return (ctx: ClawdbotPluginToolContext) => ({
    name: "goals",
    description:
      "Track personal goals with AI-powered insights. Actions: add, list, get, update, delete, review, unlock, next, capture_obstacle, insights, coaching, setup_reminders, remove_reminders, set_preference, get_preferences",
    parameters: GoalsParams,
    async execute(_id: string, params: unknown): Promise<string> {
      const p = params as GoalsParamsType
      const userId = ctx.agentAccountId || "anonymous"
      const prefs = await readPreferences(basePath, userId, config.defaultLocale || "en")
      const locale = getLocale(prefs.locale, config.defaultLocale || "en")

      switch (p.action) {
        case "add": {
          const result = await addGoal(
            basePath,
            userId,
            {
              title: p.title,
              type: p.type,
              frequency: p.frequency,
              target: p.target,
              unit: p.unit,
              why: p.why,
              description: p.description,
              identity: p.identity,
              parentId: p.parentId,
              tags: p.tags,
              prerequisites: p.prerequisites,
            },
            config.defaultCheckInInterval || 7,
            locale
          )
          if (result.goal) {
            return `${result.message}\n\nGoal ID: ${result.goal.id}\nStatus: ${t(locale, `status.${result.goal.status}`)}\nNext check-in: ${result.goal.nextCheckIn}`
          }
          return result.message
        }

        case "list": {
          const result = await listGoals(
            basePath,
            userId,
            {
              status: p.status,
              tags: p.tags,
              parentId: p.parentId,
            },
            locale
          )

          if (result.goals.length === 0) {
            return result.message
          }

          const lines = [result.message, ""]
          for (const goal of result.goals) {
            const status = t(locale, `status.${goal.status}`)
            const progress = goal.type === "measurable" ? ` (${goal.progress}/${goal.target} ${goal.unit})` : ""
            lines.push(`• ${goal.title} [${goal.id}] - ${status}${progress}`)
            if (goal.tags.length > 0) {
              lines.push(`  Tags: ${goal.tags.join(", ")}`)
            }
          }
          return lines.join("\n")
        }

        case "get": {
          const result = await getGoal(basePath, userId, p.id, locale)
          if (!result.goal) {
            return result.message
          }

          const g = result.goal
          const lines = [
            `# ${g.title}`,
            "",
            `**ID:** ${g.id}`,
            `**Status:** ${t(locale, `status.${g.status}`)}`,
            `**Type:** ${g.type} (${g.frequency})`,
            `**Target:** ${g.target} ${g.unit}`,
            `**Progress:** ${g.progress}`,
            `**Maturity:** ${g.maturity}/5`,
            "",
            `**Why:** ${g.why}`,
          ]

          if (g.identity) {
            lines.push(`**Identity:** ${g.identity}`)
          }
          if (g.description) {
            lines.push(`**Description:** ${g.description}`)
          }
          if (g.tags.length > 0) {
            lines.push(`**Tags:** ${g.tags.join(", ")}`)
          }
          if (g.lastReview) {
            lines.push(`**Last Review:** ${g.lastReview}`)
          }
          if (g.nextCheckIn) {
            lines.push(`**Next Check-in:** ${g.nextCheckIn}`)
          }
          if (g.prerequisites.length > 0) {
            lines.push(`**Prerequisites:** ${g.prerequisites.join(", ")}`)
          }
          if (g.unlocks.length > 0) {
            lines.push(`**Unlocks:** ${g.unlocks.join(", ")}`)
          }

          return lines.join("\n")
        }

        case "update": {
          const { id, ...updates } = p
          const result = await updateGoal(basePath, userId, id, updates, locale)
          return result.message
        }

        case "delete": {
          const result = await deleteGoal(basePath, userId, p.id, locale)
          return result.message
        }

        case "review": {
          const result = await addReview(
            basePath,
            userId,
            {
              goalId: p.goalId,
              rating: p.rating,
              evidence: p.evidence,
              value: p.value,
              obstacles: p.obstacles,
              wins: p.wins,
            },
            locale
          )
          return result.message
        }

        case "unlock": {
          const result = await unlockReadyGoals(basePath, userId, locale)
          return result.message
        }

        case "next": {
          const result = await getNextGoalNeedingAttention(basePath, userId, locale)
          if (!result.goal) {
            return result.message
          }

          const g = result.goal
          const lines = [
            result.message,
            "",
            `**${g.title}** [${g.id}]`,
            `Target: ${g.target} ${g.unit} (${g.frequency})`,
            `Why: ${g.why}`,
          ]

          if (g.lastReview) {
            lines.push(`Last review: ${g.lastReview}`)
          }

          return lines.join("\n")
        }

        case "capture_obstacle": {
          const obstaclesData = await readObstacles(basePath, userId)
          const goalResult = await getGoal(basePath, userId, p.goalId, locale)

          if (!goalResult.goal) {
            return goalResult.message
          }

          const obstacle: Obstacle = {
            id: randomUUID(),
            goalId: p.goalId,
            description: p.description,
            createdAt: new Date().toISOString(),
            resolved: false,
          }

          obstaclesData.obstacles.push(obstacle)
          await writeObstacles(basePath, userId, obstaclesData)

          await appendSessionLog(basePath, userId, {
            ts: obstacle.createdAt,
            action: "capture_obstacle",
            goalId: p.goalId,
            data: { description: p.description },
          })

          return t(locale, "obstacles.captured", { goal: goalResult.goal.title })
        }

        case "insights": {
          const patternsData = await readPatterns(basePath, userId)

          if (patternsData.patterns.length === 0) {
            return t(locale, "insights.noPatterns")
          }

          const lines = [t(locale, "insights.patternsHeader", { count: patternsData.patterns.length }), ""]

          for (const pattern of patternsData.patterns) {
            const key = `insights.${pattern.type}Pattern`
            lines.push(t(locale, key, { description: pattern.description }))
            if (pattern.suggestion) {
              lines.push(`  → ${pattern.suggestion}`)
            }
          }

          return lines.join("\n")
        }

        case "coaching": {
          if (!config.enableAI) {
            return "AI features are disabled."
          }
          const coaching = await generateCoaching(basePath, userId, p.goalId, locale)
          return coaching
        }

        case "setup_reminders": {
          const channel = ctx.messageChannel
          if (!channel) {
            return t(locale, "reminders.setupFailed", { error: "No channel context available" })
          }

          try {
            const morning = p.morningCron || "0 9 * * *"
            const evening = p.eveningCron || "0 20 * * *"
            const timezone = p.timezone || prefs.timezone || "UTC"
            const name = prefs.name ? `, ${prefs.name}` : ""

            await api.callGatewayMethod("cron.add", {
              jobId: `goals-morning-${userId}`,
              schedule: {
                cron: morning,
                timezone,
              },
              payload: {
                kind: "agentTurn",
                message: t(locale, "cron.morningReview"),
                channel,
                to: userId,
              },
            })

            await api.callGatewayMethod("cron.add", {
              jobId: `goals-evening-${userId}`,
              schedule: {
                cron: evening,
                timezone,
              },
              payload: {
                kind: "agentTurn",
                message: t(locale, "cron.eveningCheckin", { name }),
                channel,
                to: userId,
              },
            })

            prefs.timezone = timezone
            await writePreferences(basePath, userId, prefs)

            return t(locale, "reminders.setupSuccess", { morning, evening, timezone })
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return t(locale, "reminders.setupFailed", { error: errorMsg })
          }
        }

        case "remove_reminders": {
          try {
            await api.callGatewayMethod("cron.remove", { jobId: `goals-morning-${userId}` })
            await api.callGatewayMethod("cron.remove", { jobId: `goals-evening-${userId}` })
            return t(locale, "reminders.removeSuccess")
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return t(locale, "reminders.setupFailed", { error: errorMsg })
          }
        }

        case "set_preference": {
          const key = p.key as keyof typeof prefs
          if (key === "locale") {
            prefs.locale = p.value as Locale
          } else if (key === "timezone") {
            prefs.timezone = p.value
          } else if (key === "reminderTime") {
            prefs.reminderTime = p.value
          } else if (key === "name") {
            prefs.name = p.value
          }

          await writePreferences(basePath, userId, prefs)
          return t(locale, "preferences.updated", { key: p.key, value: p.value })
        }

        case "get_preferences": {
          const lines = [
            t(locale, "preferences.current"),
            "",
            `locale: ${prefs.locale}`,
            `timezone: ${prefs.timezone}`,
          ]
          if (prefs.reminderTime) {
            lines.push(`reminderTime: ${prefs.reminderTime}`)
          }
          if (prefs.name) {
            lines.push(`name: ${prefs.name}`)
          }
          return lines.join("\n")
        }

        default:
          return "Unknown action"
      }
    },
  })
}
