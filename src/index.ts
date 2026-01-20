import type { GoalsConfig, ClawdbotPluginApi } from "./types.js"
import { createGoalsTool } from "./tools/goal-tool.js"

export * from "./types.js"
export * from "./schemas.js"

export const defaultConfig: GoalsConfig = {
  dataPath: "~/clawd/goals",
  defaultCheckInInterval: 7,
  enableAI: true,
  defaultLocale: "en",
}

export function activate(api: ClawdbotPluginApi) {
  const config = {
    ...defaultConfig,
    ...(api.pluginConfig as Partial<GoalsConfig>),
  }

  Object.assign(api.pluginConfig as object, config)

  return {
    tools: [createGoalsTool(api)],
  }
}
