---
name: goal-tracker
description: Sistema de seguimiento de objetivos basado en Atomic Habits. Hábitos diarios, semanales y metas medibles con streaks, coaching IA y accountability. Usar cuando el usuario reporta progreso, pregunta por objetivos, o necesita motivación.
metadata: {"clawdbot":{"emoji":"🎯"}}
---

# Goal Tracker - Objetivos y Hábitos

Sistema de tracking basado en **Atomic Habits** de James Clear, con IA para detectar patrones y coaching contextual.

## Principios

1. **Hazlo obvio** - Recordatorios en el momento justo
2. **Hazlo atractivo** - Streaks, celebraciones
3. **Hazlo fácil** - Reportar con lenguaje natural
4. **Hazlo satisfactorio** - Progreso visual, WHY siempre presente

## Herramienta: `goals`

### Acciones Principales

| Acción | Descripción | Cuándo usar |
|--------|-------------|-------------|
| `add` | Crear objetivo | Usuario quiere añadir un nuevo objetivo |
| `list` | Listar objetivos | Ver todos los objetivos o filtrar |
| `get` | Ver detalle | Ver info completa de un objetivo |
| `log` | **Registrar progreso de hábito** | Usuario dice "fui al gym", "hice ejercicio" |
| `review` | Check-in con reflexión | Revisión semanal con rating y obstáculos |
| `next` | Siguiente objetivo | ¿Qué necesita atención? |
| `coaching` | Consejo IA | Usuario necesita motivación |
| `insights` | Ver patrones | ¿Qué patrones hay? |
| `history` | Ver historial | Ver logs pasados de un objetivo |

## Registrar Progreso de Hábitos (¡IMPORTANTE!)

Cuando el usuario dice cosas como:
- "He ido al gym"
- "Hoy hice ejercicio"
- "Gym ✓"
- "Entrené piernas"

**USA LA ACCIÓN `log`**, no `review`:

```
goals → action: log
  goalId: "ir-al-gym-3-dias-semana"
  note: "Leg day"
```

Para registrar días pasados:
```
goals → action: log
  goalId: "ir-al-gym-3-dias-semana"
  note: "Upper body"
  date: "2026-01-19"
```

### ¿Cuándo usar `log` vs `review`?

| Situación | Acción |
|-----------|--------|
| "Fui al gym" | `log` |
| "Hice ejercicio hoy" | `log` |
| "Ayer entrené" | `log` con date |
| "¿Cómo voy esta semana?" + reflexión | `review` |
| Check-in semanal completo | `review` |

## Crear Objetivos

```
goals → action: add
  title: "Ir al gym 3 días/semana"
  type: habit
  frequency: weekly
  target: 3
  unit: días
  why: "Estar fuerte para mi futuro hijo"
  identity: "Soy una persona que cuida su salud"
  tags: ["salud", "ejercicio"]
```

## Tipos de Objetivos

### 1. Hábito (habit)
Para acciones recurrentes: gym, meditar, leer
- `frequency`: daily, weekly, monthly
- `target`: número de veces
- Usar `log` para registrar cada vez que se completa

### 2. Milestone
Logros puntuales que desbloquean otros
- `prerequisites`: objetivos previos requeridos
- `unlocks`: lo que se desbloquea al completar

### 3. Medible (measurable)
Para métricas numéricas: revenue, ahorro, peso
- Usar `review` con `value` para registrar valores

## Respuestas del Sistema

### Al hacer log
```
✅ Logged: Ir al gym 3 días/semana
📅 2026-01-20: Leg day

¡Progreso registrado!
Esta semana: 2/3 días
Racha: 🔥 3 semanas

¡Uno más y completas la semana!
```

### Al completar objetivo
```
🎯 ¡SEMANA COMPLETADA!

Ejercicio: 3/3 días ✓
Racha: 🔥 4 semanas

Recuerda por qué lo haces:
"Estar fuerte para mi futuro hijo"
```

## Accountability (Discutir Excusas)

Cuando el usuario pone excusas:

1. **Reconoce** la dificultad
2. **Recuerda** el WHY (está en el objetivo)
3. **Propone** alternativa más fácil
4. **Pregunta** directamente

```
Usuario: "Hoy no puedo ir al gym, estoy cansado"

Claudi: "Entiendo que estés cansado. Pero recuerda:
lo haces para estar fuerte para tu futuro hijo.

¿Y si hoy haces algo más ligero? 15 min de estiramientos
en casa también cuenta.

¿O prefieres comprometerte a ir mañana?"
```

## IA y Patrones

El plugin detecta automáticamente:
- **Días exitosos**: "Cumples mejor L-M-V"
- **Correlaciones**: "Cuando gym ↑, energía ↑"
- **Riesgos**: "3+ días sin check-in"

Usa `insights` para ver patrones y `coaching` para consejos.

## Comandos del Usuario → Acciones

| Usuario dice | Acción |
|--------------|--------|
| "Fui al gym" | `log` |
| "He ido al gym hoy" | `log` |
| "Ayer hice ejercicio" | `log` con date de ayer |
| "Gym lunes y miércoles" | 2x `log` con dates |
| "¿Cómo voy?" | `list` + resumen |
| "¿Qué toca hoy?" | `next` |
| "Necesito motivación" | `coaching` |
| "Añade objetivo X" | `add` |
| "¿Qué días fui al gym?" | `history` |
| "Historial de ejercicio" | `history` |

## Notas Técnicas

- Los datos se guardan en `~/clawd/goals/users/default/`
- El progreso se calcula automáticamente por semana/mes
- Cada `log` crea un review interno con rating "on-track"
