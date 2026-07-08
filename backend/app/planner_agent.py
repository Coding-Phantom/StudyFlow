"""Conversational Planning Agent.

This agent lets the user design a study plan through back-and-forth
conversation, then finalizes it into a structured plan that the backend
can persist.
"""

import json
import re
from datetime import date, datetime
from typing import List, Optional

import ollama
from pydantic import BaseModel

from .config import LLAMA_MODEL
from .curriculum import Topic


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class PlannerChatRequest(BaseModel):
    messages: List[ChatMessage]
    message: str


class PlannerChatResponse(BaseModel):
    reply: str
    plan_ready: bool
    plan_data: Optional[dict] = None


SYSTEM_PROMPT = """You are StudyFlow's Planning Assistant. Your job is to help the user
design a personalized study plan through conversation.

## Your goals
1. Understand what subject they want to learn.
2. Understand their deadline and how many hours per day they can study.
3. Assess their prior knowledge level.
4. Propose a curriculum (topics with subtopics) tailored to their needs.
5. Refine the curriculum based on their feedback — they may want to add,
   remove, or reorder topics.
6. Keep the conversation focused and productive — ask one question at a time.

## Guidelines
- Be conversational, encouraging, and concise.
- Do NOT answer general knowledge questions — politely redirect to planning.
- Once you have enough information, propose a curriculum with specific topics
  and subtopics.
- If the user asks for changes, adjust the curriculum and re-propose it.
- The user may want to set a deadline and daily study hours — ask about these
  if they haven't mentioned them yet.
- Today's date is {today}. Use it to calculate reasonable deadlines.

## Finalizing
When the user is ready to finalize (they say things like "finalize",
"looks good", "create plan", "let's go", "sounds good", etc.), include
EXACTLY this at the end of your message:

===FINALIZE===
{{"subject": "...", "deadline": "YYYY-MM-DD", "daily_hours": 2.0, "curriculum": [{{"title": "Topic", "subtopics": ["Subtopic 1"]}}]}}
===END===

Rules for the plan data:
- "subject": the subject name (string).
- "deadline": date in YYYY-MM-DD format. Must be after today ({today}).
- "daily_hours": number between 0.5 and 8.
- "curriculum": array of topic objects. Each has "title" (string) and
  "subtopics" (array of strings, can be empty).
- Make the curriculum comprehensive but realistic for the available time.

Do NOT include the FINALIZE block unless the user has explicitly agreed
to create the plan. Never finalize unprompted.
"""


def _build_system_prompt() -> str:
    """Inject today's date so the LLM can reason about deadlines."""
    today_str = date.today().isoformat()
    return SYSTEM_PROMPT.format(today=today_str)


def process_chat(
    messages: List[ChatMessage],
    new_message: str,
) -> PlannerChatResponse:
    """Process a new chat message and return the assistant's reply.

    If the assistant decides the plan is finalized, ``plan_ready`` will be
    ``True`` and ``plan_data`` will contain the structured plan.
    """

    # Build the message list for Ollama
    ollama_messages = [{"role": "system", "content": _build_system_prompt()}]

    for msg in messages:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    ollama_messages.append({"role": "user", "content": new_message})

    response = ollama.chat(
        model=LLAMA_MODEL,
        messages=ollama_messages,
        options={"temperature": 0.7},
    )

    reply = response["message"]["content"]

    # Try to extract a FINALIZE block
    match = re.search(
        r"===FINALIZE===\n(.*?)\n===END===",
        reply,
        re.DOTALL,
    )
    if match:
        raw_json = match.group(1).strip()
        try:
            plan_data = json.loads(raw_json)
            # Validate required fields
            required = {"subject", "deadline", "daily_hours", "curriculum"}
            if not required.issubset(plan_data.keys()):
                raise ValueError("Missing required fields in plan data")

            # Remove the FINALIZE block from the visible reply
            clean_reply = re.sub(
                r"\n?===FINALIZE===\n.*?\n===END===\n?",
                "",
                reply,
                flags=re.DOTALL,
            ).strip()

            # Parse curriculum into Topic objects for validation
            topics = [Topic(**t) for t in plan_data["curriculum"]]

            return PlannerChatResponse(
                reply=clean_reply,
                plan_ready=True,
                plan_data={
                    "subject": plan_data["subject"],
                    "deadline": plan_data["deadline"],
                    "daily_hours": float(plan_data["daily_hours"]),
                    "curriculum": [t.model_dump() for t in topics],
                },
            )
        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            # Malformed JSON — ignore the FINALIZE block and continue
            reply = re.sub(
                r"\n?===FINALIZE===\n.*?\n===END===\n?",
                "",
                reply,
                flags=re.DOTALL,
            ).strip()
            reply += (
                "\n\n(I tried to finalize but ran into a formatting issue. "
                "Could you confirm your plan one more time?)"
            )

    return PlannerChatResponse(reply=reply, plan_ready=False, plan_data=None)
