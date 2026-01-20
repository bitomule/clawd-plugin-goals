import { Type, type Static } from "@sinclair/typebox"

const GoalType = Type.Union([
  Type.Literal("habit"),
  Type.Literal("milestone"),
  Type.Literal("measurable"),
])

const GoalFrequency = Type.Union([
  Type.Literal("daily"),
  Type.Literal("weekly"),
  Type.Literal("monthly"),
  Type.Literal("quarterly"),
  Type.Literal("yearly"),
])

const ReviewRating = Type.Union([
  Type.Literal("struggling"),
  Type.Literal("slow"),
  Type.Literal("on-track"),
  Type.Literal("exceeding"),
])

const AddGoalParams = Type.Object({
  action: Type.Literal("add"),
  title: Type.String({ description: "Goal title" }),
  type: GoalType,
  frequency: GoalFrequency,
  target: Type.Number({ description: "Target value (e.g., 3 for '3 days/week')" }),
  unit: Type.String({ description: "Unit of measurement (e.g., 'days', '€', 'kg')" }),
  why: Type.String({ description: "Why this goal matters (Atomic Habits)" }),
  description: Type.Optional(Type.String()),
  identity: Type.Optional(Type.String({ description: "Identity statement (e.g., 'I am someone who...')" })),
  parentId: Type.Optional(Type.String({ description: "Parent goal ID for hierarchy" })),
  tags: Type.Optional(Type.Array(Type.String())),
  prerequisites: Type.Optional(Type.Array(Type.String({ description: "Goal IDs that must be achieved first" }))),
})

const ListGoalsParams = Type.Object({
  action: Type.Literal("list"),
  status: Type.Optional(Type.Union([
    Type.Literal("locked"),
    Type.Literal("available"),
    Type.Literal("active"),
    Type.Literal("paused"),
    Type.Literal("achieved"),
    Type.Literal("all"),
  ])),
  tags: Type.Optional(Type.Array(Type.String())),
  parentId: Type.Optional(Type.String()),
})

const GetGoalParams = Type.Object({
  action: Type.Literal("get"),
  id: Type.String({ description: "Goal ID" }),
})

const UpdateGoalParams = Type.Object({
  action: Type.Literal("update"),
  id: Type.String({ description: "Goal ID" }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  why: Type.Optional(Type.String()),
  identity: Type.Optional(Type.String()),
  target: Type.Optional(Type.Number()),
  unit: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([
    Type.Literal("locked"),
    Type.Literal("available"),
    Type.Literal("active"),
    Type.Literal("paused"),
    Type.Literal("achieved"),
  ])),
  tags: Type.Optional(Type.Array(Type.String())),
})

const DeleteGoalParams = Type.Object({
  action: Type.Literal("delete"),
  id: Type.String({ description: "Goal ID" }),
})

const LogParams = Type.Object({
  action: Type.Literal("log"),
  goalId: Type.String({ description: "Goal ID" }),
  note: Type.Optional(Type.String({ description: "What you did (e.g., 'Upper body workout', 'Leg day')" })),
  date: Type.Optional(Type.String({ description: "Date in YYYY-MM-DD format (defaults to today)" })),
})

const ReviewParams = Type.Object({
  action: Type.Literal("review"),
  goalId: Type.String({ description: "Goal ID to review" }),
  rating: ReviewRating,
  evidence: Type.String({ description: "What you did (e.g., 'Went to gym Mon and Wed')" }),
  value: Type.Optional(Type.Number({ description: "For measurable goals: actual value achieved" })),
  obstacles: Type.Optional(Type.Array(Type.String())),
  wins: Type.Optional(Type.Array(Type.String())),
})

const UnlockParams = Type.Object({
  action: Type.Literal("unlock"),
})

const NextParams = Type.Object({
  action: Type.Literal("next"),
})

const CaptureObstacleParams = Type.Object({
  action: Type.Literal("capture_obstacle"),
  goalId: Type.String(),
  description: Type.String(),
})

const HistoryParams = Type.Object({
  action: Type.Literal("history"),
  goalId: Type.String({ description: "Goal ID to see history for" }),
  limit: Type.Optional(Type.Number({ description: "Number of entries to show (default: 10)" })),
})

const InsightsParams = Type.Object({
  action: Type.Literal("insights"),
})

const CoachingParams = Type.Object({
  action: Type.Literal("coaching"),
  goalId: Type.String(),
})

const SetupRemindersParams = Type.Object({
  action: Type.Literal("setup_reminders"),
  morningCron: Type.Optional(Type.String({ description: "Cron expression for morning reminder (default: '0 9 * * *')" })),
  eveningCron: Type.Optional(Type.String({ description: "Cron expression for evening reminder (default: '0 20 * * *')" })),
  timezone: Type.Optional(Type.String({ description: "Timezone (default: 'UTC')" })),
})

const RemoveRemindersParams = Type.Object({
  action: Type.Literal("remove_reminders"),
})

const SetPreferenceParams = Type.Object({
  action: Type.Literal("set_preference"),
  key: Type.Union([
    Type.Literal("locale"),
    Type.Literal("timezone"),
    Type.Literal("reminderTime"),
    Type.Literal("name"),
  ]),
  value: Type.String(),
})

const GetPreferencesParams = Type.Object({
  action: Type.Literal("get_preferences"),
})

export const GoalsParams = Type.Union([
  AddGoalParams,
  ListGoalsParams,
  GetGoalParams,
  UpdateGoalParams,
  DeleteGoalParams,
  LogParams,
  ReviewParams,
  HistoryParams,
  UnlockParams,
  NextParams,
  CaptureObstacleParams,
  InsightsParams,
  CoachingParams,
  SetupRemindersParams,
  RemoveRemindersParams,
  SetPreferenceParams,
  GetPreferencesParams,
])

export type GoalsParamsType = Static<typeof GoalsParams>
export type AddGoalParamsType = Static<typeof AddGoalParams>
export type ListGoalsParamsType = Static<typeof ListGoalsParams>
export type GetGoalParamsType = Static<typeof GetGoalParams>
export type UpdateGoalParamsType = Static<typeof UpdateGoalParams>
export type DeleteGoalParamsType = Static<typeof DeleteGoalParams>
export type LogParamsType = Static<typeof LogParams>
export type ReviewParamsType = Static<typeof ReviewParams>
export type SetupRemindersParamsType = Static<typeof SetupRemindersParams>
export type SetPreferenceParamsType = Static<typeof SetPreferenceParams>
export type CaptureObstacleParamsType = Static<typeof CaptureObstacleParams>
export type CoachingParamsType = Static<typeof CoachingParams>
