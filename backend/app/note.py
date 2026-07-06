from pydantic import BaseModel
from typing import List, Optional
import ollama
import json
from .config import LLAMA_MODEL


class StudyNotes(BaseModel):
    topic: str
    summary: str
    key_concepts: List[str]
    important_terms: List[str]
    common_mistakes: List[str]
    recommended_practice: List[str]
    estimated_study_time: int  # in minutes


def generate_notes(
    subject: str,
    topic_title: str,
    subtopic: Optional[str] = None
) -> StudyNotes:
    """Generate concise study notes for a given topic/subtopic."""

    if subtopic:
        target = f"{topic_title} - {subtopic}"
    else:
        target = topic_title

    response = ollama.chat(
        model=LLAMA_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a study aid that creates concise, focused notes."
            },
            {
                "role": "user",
                "content": (
                    f"Create concise study notes for '{target}' "
                    f"as part of learning {subject}. "
                    "Return ONLY valid JSON with these exact fields:\n"
                    '"topic": a string, the topic name\n'
                    '"summary": a string, 2-3 sentence overview\n'
                    '"key_concepts": an array of plain strings (NOT objects), 3-5 key ideas\n'
                    '"important_terms": an array of plain strings (NOT objects), 3-5 terms with brief definitions\n'
                    '"common_mistakes": an array of plain strings (NOT objects), 2-3 frequent errors\n'
                    '"recommended_practice": an array of plain strings (NOT objects), 2-3 practice exercises\n'
                    '"estimated_study_time": an integer, minutes\n'
                    'Make sure every item in every array is a string, not an object. '
                    "Do NOT include any other text outside the JSON."
                )
            }
        ])

    raw_text = response["message"]["content"]
    data = json.loads(raw_text)
    return StudyNotes(**data)
