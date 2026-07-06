import re
from pydantic import BaseModel
from typing import List, Optional
import ollama
import json
from .quiz import Question
from .config import QWEN_MODEL


class EvaluateResult(BaseModel):
    score: int
    feedback: str
    weak_concepts: list[str]


def _answers_match(user_answer: str, correct_answer: str, question: Question) -> bool:
    """Smart comparison that handles multiple choice letter labels (A/B/C/D)."""
    ua = user_answer.strip().lower()
    ca = correct_answer.strip().lower()

    # 1. Direct match
    if ua == ca:
        return True

    # 2. One contains the other (e.g. "b. london" vs "london" or "b" vs "b. london")
    if ua in ca or ca in ua:
        return True

    # 3. Multiple choice: if correct_answer is a letter (A/B/C/D), compare by index
    if question.type == "multiple_choice" and question.options:
        # Extract a single letter if the correct answer looks like "a", "b", "option a", etc.
        letter_match = re.match(r"^(?:option\s+)?([a-d])$", ca)
        correct_letter = letter_match.group(1) if letter_match else (ca if len(ca) == 1 and 'a' <= ca <= 'd' else None)

        if correct_letter:
            idx = ord(correct_letter) - ord('a')
            if 0 <= idx < len(question.options):
                return ua == question.options[idx].strip().lower()

        # Check if user answer matches any option whose text matches correct_answer
        for opt in question.options:
            opt_lower = opt.strip().lower()
            if opt_lower == ca and opt_lower == ua:
                return True

    return False


def evaluate_quiz(
    subject: str,
    topic: str,
    questions: List[Question],
    answers: List[dict],
) -> EvaluateResult:
    # id to each question
    question_map = {q.id: q for q in questions}

    # Simple exact-match scoring as a fallback
    correct_count = 0
    weak_concepts = []

    for answer in answers:
        question = question_map.get(answer["question_id"])
        if not question:
            continue
        if _answers_match(answer["user_answer"], question.correct_answer, question):
            correct_count += 1
        else:
            if question.subtopic:
                weak_concepts.append(question.subtopic)
            else:
                weak_concepts.append(question.topic)

    # Try LLM evaluation for more nuanced feedback
    try:
        prompt_text = (
            f"You are evaluating a quiz for {subject} on the topic '{topic}'.\n"
            "The user has provided answers to the following questions:\n\n"
        )

        for answer in answers:
            question = question_map.get(answer["question_id"])
            if not question:
                continue
            prompt_text += (
                f"Question ID: {question.id}\n"
                f"Prompt: {question.prompt}\n"
                f"Correct Answer: {question.correct_answer}\n"
                f"User Answer: {answer['user_answer']}\n\n"
            )

        prompt_text += (
            "Please evaluate each answer and provide:\n"
            "- score: an integer (number of correct answers)\n"
            "- feedback: a single string summarizing performance and highlighting mistakes\n"
            "- weak_concepts: a list of strings, each being a topic/subtopic the user got wrong\n\n"
            "Return ONLY valid JSON with keys 'score' (int), 'feedback' (string), and 'weak_concepts' (list of strings). "
            "Do NOT include any text outside the JSON."
        )

        response = ollama.chat(
            model=QWEN_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a fair grader. Evaluate the user's answers strictly against the correct answers."
                },
                {"role": "user", "content": prompt_text},
            ],
            temperature=0.0,
        )

        raw_text = response["message"]["content"].strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("\n```", 1)[0].strip()

        if raw_text:
            data = json.loads(raw_text)
            return EvaluateResult(**data)
    except Exception:
        # LLM evaluation failed — fall back to exact-match scoring
        pass

    # Fallback: return exact-match results
    feedback_parts = []
    for i, answer in enumerate(answers):
        question = question_map.get(answer["question_id"])
        if not question:
            continue
        if _answers_match(answer["user_answer"], question.correct_answer, question):
            feedback_parts.append(f"Q{i+1}: Correct")
        else:
            feedback_parts.append(f"Q{i+1}: Incorrect (you wrote: {answer['user_answer']}, correct: {question.correct_answer})")

    feedback = " | ".join(feedback_parts) if feedback_parts else "No answers to evaluate."

    return EvaluateResult(
        score=correct_count,
        feedback=feedback,
        weak_concepts=list(set(weak_concepts)),
    )

