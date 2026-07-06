from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional

from .curriculum import generate_curriculum, Topic
from .planner import build_schedule, DayPlan
from .note import generate_notes, StudyNotes
from .quiz import generate_quiz, Quiz


app = FastAPI(title="StudyFlow")

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



@app.get("/")
def root():
    return {"message": "StudyFlow API is running"}


@app.post("/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest):
    """Generate curriculum + schedule from a subject and deadline."""
    today = date.today()
    total_days = (request.deadline - today).days
    if total_days < 1:
        total_days = 1

    curriculum = generate_curriculum(request.subject)
    schedule = build_schedule(curriculum, today, total_days)

    return PlanResponse(
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


@app.post("/explain")
def explain_concept(request: ExplainRequest):
    """User-driven deeper explanations (optional agent, no state change)."""
    # Simple: call Ollama directly to explain the concept
    import ollama

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
