from pydantic import BaseModel
from typing import List, Optional
import ollama
import json


class Question(BaseModel):
    id: str
    type: str  # "multiple_choice", "short_answer", "conceptual"
    prompt: str
    options: Optional[List[str]] = None  # only for multiple_choice
    correct_answer: str
    topic: str
    subtopic: Optional[str] = None


class Quiz(BaseModel):
    topic: str
    subtopic: Optional[str] = None
    questions: List[Question]


def generate_quiz(
    subject: str,
    topic: str,
    subtopic: Optional[str] = None,
    notes_content: Optional[str] = None,
    num_questions: int = 5,
) -> Quiz:
    """Generate quiz questions based on study notes content."""

    target = f"{topic} - {subtopic}" if subtopic else topic

    # Build the prompt, include the notes if provided
    if notes_content:
        content_instruction = (
            f"Base all questions STRICTLY on the following study notes:\n"
            f"{notes_content}\n\n"
            "Do NOT include anything outside these notes."
        )
    else:
        content_instruction = f"Generate questions about {target}."

    prompt_text = (
        f"You are generating a quiz for {target} "
        f"as part of learning {subject}. "
        f"{content_instruction}\n\n"
        "Return ONLY valid JSON with a 'questions' array. "
        "Each question object has:\n"
        '"id": unique string like "q1", "q2"\n'
        '"type": one of "multiple_choice", "short_answer", "conceptual"\n'
        '"prompt": the question text\n'
        '"options": an array of strings (ONLY for multiple_choice, otherwise null)\n'
        '"correct_answer": the correct answer\n'
        '"topic": the topic name\n'
        '"subtopic": the subtopic name (or null)\n\n'
        "Include exactly 2 multiple_choice, 2 short_answer, and 1 conceptual question. "
        f"Do NOT include any text outside the JSON."
    )

    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {
                "role": "system",
                "content": "You create quizzes based on study notes."
            },
            {
                "role": "user",
                "content": prompt_text
            }
        ]
    )

    raw_text = response["message"]["content"].strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1].rsplit("\n```", 1)[0].strip()

    if not raw_text:
        raise ValueError("LLM returned empty response")

    data = json.loads(raw_text)
    # LLM may return a bare array or an object with a "questions" key
    if isinstance(data, list):
        questions = [Question(**q) for q in data]
    else:
        questions = [Question(**q) for q in data["questions"]]

    return Quiz(
        topic=topic,
        subtopic=subtopic,
        questions=questions,
    )
