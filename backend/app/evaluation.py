from pydantic import BaseModel
from typing import List, Optional
import ollama
import json
from .quiz import Question


class EvaluateResult(BaseModel):
    score: int
    feedback: str
    weak_concepts: list[str]


def evaluate_quiz(
    subject: str,
    topic: str,
    questions: List[Question],
    answers: List[dict],
) -> EvaluateResult:
    # id to each question
    question_map = {q.id: q for q in questions}

    prompt_text = (
        f"You are evaluating a quiz for {subject} on the topic '{topic}'.\n"
        "The user has provided answers to the following questions:\n\n"
    )

    # compare answers
    for answer in answers:
        question = question_map.get(answer["question_id"])
        if not question:
            continue  # Skip if question ID is not found
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

    # Call the LLM to evaluate the answers
    response = ollama.chat(
        model="llama3.1:8b",
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

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1].rsplit("\n```", 1)[0].strip()

    if not raw_text:
        raise ValueError("LLM returned empty response")

    data = json.loads(raw_text)
    return EvaluateResult(**data)

