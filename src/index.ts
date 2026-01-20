import type { ClawdbotPluginApi, ClawdbotPluginDefinition } from "./types.js"
import { createGoalsTool } from "./tools/goal-tool.js"

const plugin: ClawdbotPluginDefinition = {
  id: "clawd-plugin-goals",
  name: "Goal Tracker",
  description: "Track personal goals with AI-powered insights, based on Atomic Habits methodology",
  register(api: ClawdbotPluginApi) {
    api.registerTool(createGoalsTool(api))
  },
}

export default plugin
