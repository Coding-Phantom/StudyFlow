from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from datetime import date
from typing import Any, List, Optional

import ollama
import traceback

from .config import LLAMA_MODEL
from .curriculum import generate_curriculum, Topic
from .planner import build_schedule, DayPlan
from .note import generate_notes, StudyNotes
from .quiz import generate_quiz, Quiz, Question
from .evaluation import evaluate_quiz, EvaluateResult
from .adaptation import recommend_adaptation, AdaptationResult
from .database import (
    get_active_plan,
    get_mastery_scores,
    get_all_plans,
    get_plan_by_id,
    complete_task,
    init_db,
    save_plan,
    save_quiz_attempt,
    set_active_plan,
    delete_plan_by_id,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="StudyFlow", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a CORS-friendly JSON error."""
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        },
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
    active = get_active_plan()
    return {
        "latest_plan": active,
        "active_plan_id": active["id"] if active else None,
        "mastery_scores": get_mastery_scores(),
    }


@app.get("/plans")
def list_plans():
    """Return all study plans (basic info, no curriculum/schedule)."""
    return get_all_plans()


@app.get("/plans/{plan_id}")
def get_plan(plan_id: int):
    """Return a specific plan with full curriculum and schedule."""
    plan = get_plan_by_id(plan_id)
    if plan is None:
        return {"error": "Plan not found"}, 404
    return plan


@app.post("/plans/{plan_id}/activate")
def activate_plan(plan_id: int):
    """Set a plan as the active plan."""
    plan = get_plan_by_id(plan_id)
    if plan is None:
        return {"error": "Plan not found"}, 404
    set_active_plan(plan_id)
    return {"status": "ok", "active_plan_id": plan_id}


@app.delete("/plans/{plan_id}")
def delete_plan(plan_id: int):
    """Delete a plan and all its related data."""
    success = delete_plan_by_id(plan_id)
    if not success:
        return {"error": "Plan not found"}, 404
    return {"status": "ok", "deleted_plan_id": plan_id}


@app.patch("/tasks/{task_id}/complete")
def mark_task_complete(task_id: int):
    """Mark a study task as completed."""
    success = complete_task(task_id)
    if not success:
        return {"error": "Task not found"}, 404
    return {"status": "ok", "task_id": task_id}


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
        model=LLAMA_MODEL,
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

@app.post("/evaluate")
def evaluate_answers(request: EvaluateRequest):
    """Evaluate user answers to quiz questions."""
    try:
        result = evaluate_quiz(
            subject=request.subject,
            topic=request.topic,
            questions=request.questions,
            answers=[a.model_dump() for a in request.answers],
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Evaluation failed: {str(e)}. Check that Ollama is running."},
        )

    try:
        attempt_id = save_quiz_attempt(
            subject=request.subject,
            topic=request.topic,
            questions=request.questions,
            answers=[a.model_dump() for a in request.answers],
            score=result.score,
            feedback=result.feedback,
            weak_concepts=result.weak_concepts,
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to save quiz results: {str(e)}"},
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
