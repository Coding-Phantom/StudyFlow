from pydantic import BaseModel
from typing import List, Optional
import ollama
import json
from .config import QWEN_MODEL


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

    mc_count = max(1, num_questions - 1)  # all but one are MC
    sa_count = 1 if num_questions > 1 else 0  # at most 1 short answer

    few_shot_example = '''Example of a correct quiz on "Algebra Basics":
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "What is the value of x in the equation 2x + 3 = 7?",
      "options": ["x = 1", "x = 2", "x = 3", "x = 4"],
      "correct_answer": "x = 2",
      "topic": "Algebra Basics",
      "subtopic": "Linear Equations"
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "prompt": "If a = 5 and b = 3, what is a + b?",
      "options": ["5", "8", "15", "2"],
      "correct_answer": "8",
      "topic": "Algebra Basics",
      "subtopic": "Variables"
    }
  ]
}'''

    prompt_text = (
        f"You are generating a quiz for {target} "
        f"as part of learning {subject}. "
        f"{content_instruction}\n\n"
        "Here is an example of the correct format:\n"
        f"{few_shot_example}\n\n"
        "IMPORTANT RULES:\n"
        f"- Generate EXACTLY {num_questions} questions.\n"
        f"- Make {mc_count} multiple_choice and {sa_count} short_answer.\n"
        "- Do NOT generate 'conceptual' type questions.\n"
        "- For multiple_choice: correct_answer MUST be the full option text, NOT a letter (A/B/C/D).\n"
        "- For example, if options are [\"x = 1\", \"x = 2\", \"x = 3\"], correct_answer is \"x = 2\", not \"B\".\n"
        "- Double-check that every correct_answer is factually correct for its question.\n"
        "- Double-check math: 2 + 2 should NOT have correct_answer \"5\".\n\n"
        "Return ONLY valid JSON with a 'questions' array. "
        "Each question object has:\n"
        '"id": unique string like "q1", "q2"\n'
        '"type": "multiple_choice" or "short_answer"\n'
        '"prompt": the question text\n'
        '"options": an array of 4 answer choices (for multiple_choice only, otherwise null)\n'
        '"correct_answer": the correct answer text (NOT a letter)\n'
        '"topic": the topic name\n'
        '"subtopic": the subtopic name (or null)\n\n'
        f"I repeat: generate exactly {num_questions} questions. "
        f"Exactly {mc_count} multiple_choice and {sa_count} short_answer. "
        "Do NOT include any text outside the JSON."
    )

    response = ollama.chat(
        model=QWEN_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You create quizzes. Always generate exactly the requested number of questions."
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
    if isinstance(data, list):
        raw_questions = data
    else:
        raw_questions = data["questions"]

    # Parse and enforce count — take only first num_questions
    questions = [Question(**q) for q in raw_questions][:num_questions]

    # If we got fewer than requested, pad with generated MC questions (rare)
    while len(questions) < num_questions:
        questions.append(Question(
            id=f"q{len(questions)+1}",
            type="multiple_choice",
            prompt=f"Additional question about {target}",
            options=["Option A", "Option B", "Option C", "Option D"],
            correct_answer="Option A",
            topic=topic,
            subtopic=subtopic,
        ))

    return Quiz(
        topic=topic,
        subtopic=subtopic,
        questions=questions,
    )
