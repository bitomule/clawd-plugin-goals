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

Usa la herramienta `goals` con diferentes acciones:

### Acciones Principales

| Acción | Descripción | Parámetros clave |
|--------|-------------|------------------|
| `add` | Crear objetivo | title, type, frequency, target, unit, why |
| `list` | Listar objetivos | status, tags |
| `get` | Ver detalle | id |
| `update` | Modificar | id, campos a cambiar |
| `delete` | Eliminar | id |
| `review` | Registrar progreso | goalId, rating, evidence, value |
| `next` | Siguiente que necesita atención | - |
| `coaching` | Consejo contextual IA | goalId |
| `insights` | Ver patrones detectados | - |
| `setup_reminders` | Configurar crons | morningCron, eveningCron, timezone |

### Ejemplos de Uso

**Crear objetivo:**
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

**Registrar progreso:**
```
goals → action: review
  goalId: "ir-al-gym-3-dias-semana"
  rating: on-track
  evidence: "Fui lunes y miércoles"
  wins: ["Nuevo PR en press banca"]
```

**Ver siguiente objetivo:**
```
goals → action: next
```

**Pedir coaching:**
```
goals → action: coaching
  goalId: "ir-al-gym-3-dias-semana"
```

## Tipos de Objetivos

### 1. Hábito (habit)
Para acciones recurrentes: gym, meditar, leer
- `frequency`: daily, weekly, monthly
- `target`: número de veces
- `unit`: días, veces, minutos

### 2. Milestone
Logros puntuales que desbloquean otros objetivos
- `prerequisites`: objetivos que deben completarse antes
- `unlocks`: objetivos que se desbloquean al completar

### 3. Medible (measurable)
Para métricas numéricas: revenue, ahorro, peso
- `target`: valor objetivo
- `unit`: €, kg, etc.
- En reviews usar `value` para el valor actual

## Sistema de Ratings

Al registrar progreso, usar estos ratings:

| Rating | Significado | Próximo check-in |
|--------|-------------|------------------|
| `struggling` | Con dificultad | 1 día |
| `slow` | Progreso lento | 3 días |
| `on-track` | En camino | 7 días |
| `exceeding` | Superando | 14 días |

## Cómo Reportar (Lenguaje Natural)

El usuario dice:
- "He ido al gym"
- "Hecho ejercicio"
- "Hoy gym ✓"
- "Revenue este mes: 450€"

Tú:
1. Identificas el objetivo (usa `list` si no estás seguro)
2. Registras con `review` usando el rating apropiado
3. Celebras + muestras progreso
4. Recuerdas el WHY si es hito importante

## Respuestas del Sistema

### Al reportar progreso
```
💪 ¡Ejercicio registrado!

Esta semana: ██░░░ 2/3 días
Streak: 🔥 3 semanas

¡Uno más y completas la semana!
```

### Al completar objetivo
```
🎯 ¡SEMANA COMPLETADA!

Ejercicio: 3/3 días ✓
Racha: 🔥 4 semanas

Recuerda por qué lo haces:
"Estar fuerte para mi futuro hijo"

Eres una persona que cuida su salud. 💪
```

### Al detectar riesgo
Usa `coaching` para obtener consejos contextuales:
```
⚠️ Llevas 3 días sin check-in.
¿Y si hoy haces algo más ligero?

Recuerda: lo haces para estar fuerte para tu futuro hijo.
```

## Accountability (Discutir Excusas)

Cuando el usuario pone excusas:

1. **Reconoce** la dificultad
2. **Recuerda** el WHY (está en el objetivo)
3. **Propone** alternativa más fácil
4. **Pregunta** directamente

Ejemplo:
```
Usuario: "Hoy no puedo ir al gym, estoy cansado"

Claudi: "Entiendo que estés cansado. Pero recuerda:
lo haces para estar fuerte para tu futuro hijo.

¿Y si hoy haces algo más ligero? 15 min de estiramientos
en casa también cuenta como ejercicio.

¿O prefieres comprometerte a ir mañana seguro?"
```

Nivel de insistencia: **razonable pero firme**.

## IA y Patrones

El plugin detecta automáticamente:
- **Días exitosos**: "Cumples mejor L-M-V"
- **Correlaciones**: "Cuando gym ↑, sueño ↑"
- **Riesgos**: "3+ días sin check-in"

Usa `insights` para ver patrones y `coaching` para consejos personalizados.

## Configurar Recordatorios

```
goals → action: setup_reminders
  morningCron: "0 9 * * *"
  eveningCron: "0 20 * * *"
  timezone: "Europe/Madrid"
```

Para quitar:
```
goals → action: remove_reminders
```

## Preferencias de Usuario

```
goals → action: set_preference
  key: locale
  value: es

goals → action: set_preference
  key: name
  value: David
```

## Comandos Útiles del Usuario

- "¿cómo voy con mis objetivos?" → `list` + resumen
- "progreso de ejercicio" → `get` del objetivo
- "¿qué racha llevo?" → `get` mostrando maturity/streak
- "añade objetivo: X" → `add`
- "coaching para gym" → `coaching`
- "¿qué patrones ves?" → `insights`

## Notas

- Los objetivos son **privados** (por usuario via ctx.agentAccountId)
- Los recordatorios van al canal actual del usuario
- Separado de home-tasks (diferente propósito)
- Datos en `~/clawd/goals/users/{userId}/`
