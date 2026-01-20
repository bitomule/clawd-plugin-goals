# clawd-plugin-goals

A goal tracking plugin for clawdbot with AI-powered insights. Inspired by Atomic Habits methodology and SRS (Spaced Repetition System) scheduling.

## Features

- **Hierarchical Goals**: Organize goals with parent-child relationships
- **Multiple Goal Types**: Habits, milestones, and measurable goals
- **Smart Scheduling**: SRS-inspired check-in intervals that adapt to your performance
- **AI Insights**: Pattern detection, risk prediction, and contextual coaching
- **Progress Tracking**: Reviews, streaks, and maturity levels
- **Prerequisites System**: Goals can unlock other goals when achieved
- **Localization**: English and Spanish support
- **Per-User Data**: Isolated storage for each user

## Installation

```bash
npm install clawd-plugin-goals
```

Add to your `clawdbot.toml`:

```toml
[plugins.goals]
dataPath = "~/clawd/goals"
enableAI = true
defaultLocale = "en"
```

## Usage

### Add a Goal

```
goals → action: add
  title: "Go to gym 3 days/week"
  type: habit
  frequency: weekly
  target: 3
  unit: days
  why: "Be strong for my future kid"
  tags: ["health", "fitness"]
```

### Review Progress

```
goals → action: review
  goalId: "go-to-gym-3-days-week"
  rating: on-track
  evidence: "Went Monday, Wednesday and Friday"
  wins: ["New PR on bench press"]
```

### List Goals

```
goals → action: list
  status: active
  tags: ["health"]
```

### Get Next Goal Needing Attention

```
goals → action: next
```

### Get Coaching

```
goals → action: coaching
  goalId: "go-to-gym-3-days-week"
```

### Setup Daily Reminders

```
goals → action: setup_reminders
  morningCron: "0 9 * * *"
  eveningCron: "0 20 * * *"
  timezone: "Europe/Madrid"
```

### Set Preferences

```
goals → action: set_preference
  key: locale
  value: es
```

## Actions Reference

| Action | Description | Key Parameters |
|--------|-------------|----------------|
| `add` | Create a new goal | title, type, frequency, target, unit, why |
| `list` | List goals with filters | status, tags, parentId |
| `get` | Get goal details | id |
| `update` | Update a goal | id, fields to change |
| `delete` | Delete a goal | id |
| `review` | Log progress check-in | goalId, rating, evidence, value |
| `unlock` | Unlock ready goals | - |
| `next` | Get next goal needing attention | - |
| `capture_obstacle` | Log an obstacle | goalId, description |
| `insights` | View detected patterns | - |
| `coaching` | Get contextual advice | goalId |
| `setup_reminders` | Configure cron reminders | morningCron, eveningCron, timezone |
| `remove_reminders` | Remove cron reminders | - |
| `set_preference` | Set user preference | key, value |
| `get_preferences` | Get user preferences | - |

## Goal Types

- **habit**: Recurring actions (e.g., "Go to gym 3 days/week")
- **milestone**: One-time achievements (e.g., "Run a marathon")
- **measurable**: Quantifiable targets (e.g., "Save $5000")

## Review Ratings

| Rating | Description | Next Check-in |
|--------|-------------|---------------|
| `struggling` | Having trouble | 1 day |
| `slow` | Making some progress | 3 days |
| `on-track` | Meeting expectations | 7 days |
| `exceeding` | Doing great | 14 days |

## AI Features

### Pattern Detection
- Analyzes which days/times you perform best
- Identifies correlations between goals
- Detects successful streaks

### Risk Prediction
- Alerts when goals are overdue
- Warns about declining performance trends

### Target Suggestions
- Suggests increasing targets when consistently exceeding
- Suggests decreasing targets when struggling

### Contextual Coaching
- Reminds you of your WHY and identity
- Provides encouragement based on recent performance
- Suggests next actions

## Data Storage

User data is stored at `~/clawd/goals/users/{userId}/`:

```
users/
└── {userId}/
    ├── preferences.json  # User preferences
    ├── goals.json        # Goals
    ├── reviews.json      # Review history
    ├── sessions/         # Daily session logs
    ├── insights/         # AI-generated patterns
    └── obstacles/        # Captured obstacles
```

## Configuration

```typescript
interface GoalsConfig {
  dataPath: string           // Default: "~/clawd/goals"
  defaultCheckInInterval: number  // Default: 7 (days)
  enableAI: boolean          // Default: true
  defaultLocale: "en" | "es" // Default: "en"
}
```

## License

MIT
