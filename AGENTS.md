# StudyFlow — Project Brief

> An adaptive AI study system that turns learning into a closed-loop process: plan → study → quiz → evaluate → adapt.

---

## Core Idea

StudyFlow is not a chatbot tutor.

It is an **adaptive learning loop system** that:
- builds a study plan from a subject + deadline
- generates daily study tasks
- quizzes the user on material
- evaluates performance
- dynamically adjusts future study plans based on weak areas

The system behaves like a **learning optimizer**, not a Q&A assistant.

---

## Core Principle

> Learning is a feedback loop, not a static plan.

The system continuously updates:
- what the user should study
- how much time they should spend on each topic
- which concepts need reinforcement
- what to quiz next

---

## System Overview

User input:
- subject
- deadline
- available study time per day

System output:
- full curriculum breakdown
- daily study schedule
- quizzes per topic
- performance evaluation
- updated plan over time

---

## Core Learning Loop

1. User provides subject + constraints
2. Curriculum Planner Agent creates structured topics
3. Study Planner Agent builds daily plan
4. User studies content
5. Quiz Agent tests understanding
6. Evaluation Agent scores performance
7. Adaptation Agent updates future study plan
8. Loop repeats until deadline

---

## Core Agents

### 1. Curriculum Agent
Breaks a subject into structured topics and subtopics.

Output:
- hierarchical curriculum structure

---

### 2. Study Planner Agent
Converts curriculum into a time-based schedule.

Constraints:
- deadline
- hours per day
- topic difficulty

Output:
- daily study plan

---

### 3. Quiz Agent
Generates questions per topic.

Question types:
- multiple choice
- short answer
- conceptual questions

Must ensure:
- questions map to specific curriculum topics

---

### 4. Evaluation Agent
Scores quiz responses and tracks mastery.

Output:
- topic-level mastery scores (0–100)
- weak areas
- improvement suggestions

---

### 5. Adaptation Agent
Updates future study plans based on performance.

Responsibilities:
- prioritize weak topics
- reschedule remaining curriculum
- adjust study intensity dynamically

This is the core intelligence layer of the system.

---

## Data Model (Core State)

The system maintains persistent state:

```json
{
  "subject": "Data Structures",
  "deadline": "2026-06-20",
  "daily_hours": 2,
  "curriculum": [
    {
      "topic": "Trees",
      "subtopics": ["BST", "AVL", "Traversal"],
      "mastery": 45
    }
  ],
  "schedule": [
    {
      "day": 1,
      "tasks": ["Arrays", "Linked Lists"]
    }
  ],
  "performance": {
    "Trees": 45,
    "Graphs": 70
  }
}

## System Constraints

### 1. State is truth
All progress is stored externally. The LLM does not store persistent memory.

---

### 2. No stateless tutoring
The system must not behave like a simple chat tutor. Every interaction should reference or update system state.

---

### 3. Adaptation is required
Study plans must change based on quiz performance. If no adaptation occurs, the system is not functioning correctly.

---

### 4. Structured outputs only
Agents should return structured data where possible. Avoid free-form outputs for anything that affects system state.

---

## MVP Scope

### Must have
- Subject + deadline input
- Curriculum generation
- Daily study plan generation
- Quiz generation
- Basic evaluation scoring
- Simple adaptation logic (next-day adjustment)
- Persistent state (JSON or SQLite)
- Minimal UI (chat or dashboard)

---

## Optional Extensions (Post-MVP)

- Spaced repetition system
- Difficulty prediction
- Calendar integration
- PDF / syllabus ingestion (RAG layer)
- Progress visualization dashboard
- Multi-subject support
- Study streak tracking
- Performance analytics over time

---

## Tech Stack

### Frontend
- React (Vite)
- Simple UI:
  - study plan view
  - quiz view
  - progress view

---

### Backend
- Python FastAPI
- LLM integration:
  - Ollama (local) primary
  - optional API fallback (OpenAI / Gemini)

### Storage
- SQLite (recommended)
- JSON fallback acceptable for early MVP

---

## LLM Usage Rules

LLMs are used ONLY for:
- curriculum generation
- quiz generation
- explanation of concepts
- evaluation reasoning support

LLMs are NOT allowed to:
- directly mutate state
- define final system truth
- bypass evaluation or scoring logic

---

## Success Criteria

The system is successful if:

- A user can input a subject + deadline
- A structured study plan is generated
- Quizzes are generated per topic
- Performance is tracked over time
- Study plan adapts based on weak areas
- System improves focus automatically over time without manual intervention

---

## Core Value Proposition

StudyFlow is an **adaptive learning loop system**, not a study chatbot.

It demonstrates:

- agent orchestration
- structured reasoning systems
- feedback loop design
- stateful AI architecture
- evaluation-driven adaptation

---

## Development Principle

Start simple:

- one subject
- one loop
- one adaptation cycle

Do not overbuild early. The goal is a working adaptive learning loop, not a full education platform.