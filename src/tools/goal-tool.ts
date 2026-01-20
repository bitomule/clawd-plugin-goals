import type {
  GoalsConfig,
  ClawdbotPluginApi,
  PluginTool,
  ToolResult,
  Locale,
  Obstacle,
} from "../types.js"
import { GoalsParams, type GoalsParamsType } from "../schemas.js"
import { addGoal, getGoal, listGoals, updateGoal, deleteGoal, getNextGoalNeedingAttention } from "../core/goals.js"
import { addReview, getReviewHistory } from "../core/reviews.js"
import { unlockReadyGoals } from "../core/unlock.js"
import { readPreferences, writePreferences, readObstacles, writeObstacles, appendSessionLog } from "../storage/file-io.js"
import { readPatterns } from "../storage/file-io.js"
import { t, getLocale } from "../i18n/index.js"
import { expandPath } from "../storage/paths.js"
import { generateCoaching } from "../ai/coaching.js"
import { randomUUID } from "node:crypto"

function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text" as const, text }],
  }
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
  }
}

export function createGoalsTool(api: ClawdbotPluginApi): PluginTool {
  const pluginConfig = api.pluginConfig as GoalsConfig | undefined
  const config: GoalsConfig = {
    dataPath: pluginConfig?.dataPath || "~/clawd/goals",
    defaultCheckInInterval: pluginConfig?.defaultCheckInInterval || 7,
    enableAI: pluginConfig?.enableAI ?? true,
    defaultLocale: pluginConfig?.defaultLocale || "en",
  }
  const basePath = expandPath(config.dataPath)

  return {
    name: "goals",
    description:
      "Track personal goals with AI-powered insights. Actions: add, list, get, update, delete, log, review, history, unlock, next, capture_obstacle, insights, coaching, setup_reminders, remove_reminders, set_preference, get_preferences. IMPORTANT: Use 'log' for daily habit completions (e.g., 'went to gym'). Use 'review' only for weekly reflective check-ins with rating/obstacles. Use 'history' to see past logs.",
    parameters: GoalsParams,
    async execute(_id: string, params: unknown): Promise<ToolResult> {
      const p = params as GoalsParamsType
      // For now, use a default user ID since we don't have context
      // In a real implementation, this would come from the execution context
      const userId = "default"

      try {
        const prefs = await readPreferences(basePath, userId, config.defaultLocale)
        const locale = getLocale(prefs.locale, config.defaultLocale)

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
              config.defaultCheckInInterval,
              locale
            )
            if (result.goal) {
              return textResult(`${result.message}\n\nGoal ID: ${result.goal.id}\nStatus: ${t(locale, `status.${result.goal.status}`)}\nNext check-in: ${result.goal.nextCheckIn}`)
            }
            return textResult(result.message)
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
              return textResult(result.message)
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
            return textResult(lines.join("\n"))
          }

          case "get": {
            const result = await getGoal(basePath, userId, p.id, locale)
            if (!result.goal) {
              return textResult(result.message)
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

            return textResult(lines.join("\n"))
          }

          case "update": {
            const { id, ...updates } = p
            const result = await updateGoal(basePath, userId, id, updates, locale)
            return textResult(result.message)
          }

          case "delete": {
            const result = await deleteGoal(basePath, userId, p.id, locale)
            return textResult(result.message)
          }

          case "log": {
            const goalResult = await getGoal(basePath, userId, p.goalId, locale)
            if (!goalResult.goal) {
              return textResult(goalResult.message)
            }

            const today = new Date()
            const logDate = p.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
            const note = p.note || "Completed"

            const result = await addReview(
              basePath,
              userId,
              {
                goalId: p.goalId,
                rating: "on-track",
                evidence: note,
                date: logDate,
              },
              locale
            )

            const g = goalResult.goal
            const lines = [
              `✅ Logged: ${g.title}`,
              `📅 ${logDate}: ${note}`,
              "",
              result.message,
            ]

            return textResult(lines.join("\n"))
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
                date: p.date,
                obstacles: p.obstacles,
                wins: p.wins,
              },
              locale
            )
            return textResult(result.message)
          }

          case "history": {
            const goalResult = await getGoal(basePath, userId, p.goalId, locale)
            if (!goalResult.goal) {
              return textResult(goalResult.message)
            }

            const reviews = await getReviewHistory(basePath, userId, p.goalId, p.limit || 10)

            if (reviews.length === 0) {
              return textResult(t(locale, "history.empty", { goal: goalResult.goal.title }))
            }

            const lines = [t(locale, "history.header", { goal: goalResult.goal.title, count: reviews.length }), ""]

            for (const review of reviews) {
              const rating = t(locale, `rating.${review.rating}`)
              lines.push(`📅 ${review.date} — ${rating}`)
              lines.push(`   ${review.evidence}`)
              if (review.value !== undefined) {
                lines.push(`   Value: ${review.value}`)
              }
              lines.push("")
            }

            return textResult(lines.join("\n"))
          }

          case "unlock": {
            const result = await unlockReadyGoals(basePath, userId, locale)
            return textResult(result.message)
          }

          case "next": {
            const result = await getNextGoalNeedingAttention(basePath, userId, locale)
            if (!result.goal) {
              return textResult(result.message)
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

            return textResult(lines.join("\n"))
          }

          case "capture_obstacle": {
            const obstaclesData = await readObstacles(basePath, userId)
            const goalResult = await getGoal(basePath, userId, p.goalId, locale)

            if (!goalResult.goal) {
              return textResult(goalResult.message)
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

            return textResult(t(locale, "obstacles.captured", { goal: goalResult.goal.title }))
          }

          case "insights": {
            const patternsData = await readPatterns(basePath, userId)

            if (patternsData.patterns.length === 0) {
              return textResult(t(locale, "insights.noPatterns"))
            }

            const lines = [t(locale, "insights.patternsHeader", { count: patternsData.patterns.length }), ""]

            for (const pattern of patternsData.patterns) {
              const key = `insights.${pattern.type}Pattern`
              lines.push(t(locale, key, { description: pattern.description }))
              if (pattern.suggestion) {
                lines.push(`  → ${pattern.suggestion}`)
              }
            }

            return textResult(lines.join("\n"))
          }

          case "coaching": {
            if (!config.enableAI) {
              return textResult("AI features are disabled.")
            }
            const coaching = await generateCoaching(basePath, userId, p.goalId, locale)
            return textResult(coaching)
          }

          case "setup_reminders": {
            // Note: In a full implementation, this would use the gateway API
            // For now, return instructions
            const morning = p.morningCron || "0 9 * * *"
            const evening = p.eveningCron || "0 20 * * *"
            const timezone = p.timezone || prefs.timezone || "UTC"

            prefs.timezone = timezone
            await writePreferences(basePath, userId, prefs)

            return textResult(t(locale, "reminders.setupSuccess", { morning, evening, timezone }))
          }

          case "remove_reminders": {
            return textResult(t(locale, "reminders.removeSuccess"))
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
            return textResult(t(locale, "preferences.updated", { key: p.key, value: p.value }))
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
            return textResult(lines.join("\n"))
          }

          default:
            return errorResult("Unknown action")
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return errorResult(message)
      }
    },
  }
}
