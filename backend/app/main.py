from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from datetime import date
from typing import Any, List, Optional

import ollama

from .curriculum import generate_curriculum, Topic
from .planner import build_schedule, DayPlan
from .note import generate_notes, StudyNotes
from .quiz import generate_quiz, Quiz, Question
from .evaluation import evaluate_quiz, EvaluateResult
from .adaptation import recommend_adaptation, AdaptationResult
from .database import (
    get_latest_plan,
    get_mastery_scores,
    init_db,
    save_plan,
    save_quiz_attempt,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="StudyFlow", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)




class PlanRequest(BaseModel):
    subject: str
    deadline: date
    daily_hours: float = 1.0


class PlanResponse(BaseModel):
    plan_id: int
    subject: str
    deadline: date
    daily_hours: float
    total_days: int
    start_date: date
    curriculum: List[Topic]
    schedule: List[DayPlan]


class NotesRequest(BaseModel):
    subject: str
    topic: str
    subtopic: Optional[str] = None


class ExplainRequest(BaseModel):
    subject: str
    topic: str
    subtopic: Optional[str] = None
    question: str


class QuizRequest(BaseModel):
    subject: str
    topic: str
    subtopic: Optional[str] = None
    notes_content: Optional[str] = None  # study notes to base questions on
    num_questions: int = 5


class UserAnswer(BaseModel):
    question_id: str
    user_answer: str


class EvaluateRequest(BaseModel):
    subject: str
    topic: str
    questions: List[Question]
    answers: List[UserAnswer]


class EvaluationResponse(EvaluateResult):
    attempt_id: int


class AdaptationRequest(BaseModel):
    subject: str
    topic: str
    score: int
    weak_concepts: List[str]



@app.get("/")
def root():
    return {"message": "StudyFlow API is running"}


@app.get("/state")
def get_state() -> dict[str, Any]:
    """Return the current local StudyFlow state."""
    return {
        "latest_plan": get_latest_plan(),
        "mastery_scores": get_mastery_scores(),
    }


@app.post("/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest):
    """Generate curriculum + schedule from a subject and deadline."""
    today = date.today()
    total_days = (request.deadline - today).days
    if total_days < 1:
        total_days = 1

    curriculum = generate_curriculum(request.subject)
    schedule = build_schedule(curriculum, today, total_days)
    plan_id = save_plan(
        subject=request.subject,
        deadline=request.deadline,
        daily_hours=request.daily_hours,
        total_days=total_days,
        start_date=today,
        curriculum=curriculum,
        schedule=schedule,
    )

    return PlanResponse(
        plan_id=plan_id,
        subject=request.subject,
        deadline=request.deadline,
        daily_hours=request.daily_hours,
        total_days=total_days,
        start_date=today,
        curriculum=curriculum,
        schedule=schedule,
    )


@app.post("/notes", response_model=StudyNotes)
def get_study_notes(request: NotesRequest):
    """Generate concise study notes for a specific topic/subtopic."""
    return generate_notes(
        subject=request.subject,
        topic_title=request.topic,
        subtopic=request.subtopic,
    )


@app.post("/explain")
def explain_concept(request: ExplainRequest):
    """User-driven deeper explanations (optional agent, no state change)."""

    if request.subtopic:
        target = f"{request.topic} - {request.subtopic}"
    else:
        target = request.topic

    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {
                "role": "system",
                "content": "You are a tutor. Explain the concept clearly and concisely."
            },
            {
                "role": "user",
                "content": (
                    f"In the context of learning {request.subject}, "
                    f"explain: {request.question} "
                    f"(related to {target})"
                )
            }
        ])

    return {"explanation": response["message"]["content"]}



@app.post("/quiz", response_model=Quiz)
def get_quiz(request: QuizRequest):
    """Generate quiz questions based on study notes content."""
    return generate_quiz(
        subject=request.subject,
        topic=request.topic,
        subtopic=request.subtopic,
        notes_content=request.notes_content,
        num_questions=request.num_questions,
    )

@app.post("/evaluate", response_model=EvaluationResponse)
def evaluate_answers(request: EvaluateRequest):
    """Evaluate user answers to quiz questions."""
    result = evaluate_quiz(
        subject=request.subject,
        topic=request.topic,
        questions=request.questions,
        answers=[a.model_dump() for a in request.answers],
    )
    attempt_id = save_quiz_attempt(
        subject=request.subject,
        topic=request.topic,
        questions=request.questions,
        answers=[a.model_dump() for a in request.answers],
        score=result.score,
        feedback=result.feedback,
        weak_concepts=result.weak_concepts,
    )

    return EvaluationResponse(
        attempt_id=attempt_id,
        score=result.score,
        feedback=result.feedback,
        weak_concepts=result.weak_concepts,
    )


@app.post("/adapt", response_model=AdaptationResult)
def adapt_study_plan(request: AdaptationRequest):
    """Recommend study adjustments based on evaluation results."""
    return recommend_adaptation(
        subject=request.subject,
        topic=request.topic,
        score=request.score,
        weak_concepts=request.weak_concepts,
    )
