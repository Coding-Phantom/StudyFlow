from pydantic import BaseModel
from typing import List
import ollama
import json
from .config import LLAMA_MODEL


class AdaptationResult(BaseModel):
    """Recommendations for what to study next."""
    review_topics: List[str]
    next_focus: str
    suggested_intensity: str  # "light", "normal", or "intense"
    reasoning: str


def recommend_adaptation(
    subject: str,
    topic: str,
    score: int,
    weak_concepts: List[str],
    total_questions: int = 0,
) -> AdaptationResult:
    """Recommend study adjustments based on evaluation results."""

    prompt_text = (
        f"You are an adaptive learning coach for {subject}.\n"
        f"The user just completed a quiz on '{topic}'.\n"
        f"They scored {score} out of {total_questions if total_questions else 'some'}.\n"
        f"Weak concepts identified: {', '.join(weak_concepts) if weak_concepts else 'none'}.\n\n"
        "Based on this performance, recommend what to do next.\n\n"
        "Return ONLY valid JSON with these exact keys:\n"
        '"review_topics": a list of strings, topics the user should review (can include weak concepts + related topics)\n'
        '"next_focus": a string, the single most important topic to focus on next\n'
        '"suggested_intensity": one of "light", "normal", or "intense" '
        "(light = quick review, normal = standard study, intense = deep focus)\n"
        '"reasoning": a string explaining the recommendation\n\n'
        "Do NOT include any text outside the JSON."
    )

    response = ollama.chat(
        model=LLAMA_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an adaptive learning coach. You analyze quiz performance and recommend study adjustments."
            },
            {
                "role": "user",
                "content": prompt_text,
            }
        ],
    )

    raw_text = response["message"]["content"].strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1].rsplit("\n```", 1)[0].strip()

    if not raw_text:
        raise ValueError("LLM returned empty response")

    data = json.loads(raw_text)
    return AdaptationResult(**data)
