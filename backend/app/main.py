from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date, datetime
from typing import List

from .curriculum import generate_curriculum, Topic
from .planner import build_schedule, DayPlan

# ── FastAPI app ──────────────────────────────────────────────────
app = FastAPI(title="StudyFlow")

# Allow requests from the React dev server (Vite default is port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ────────────────────────────────────

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


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "StudyFlow API is running"}


@app.post("/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest):
    """
    Takes a subject + deadline + daily hours,
    generates a curriculum and builds a study schedule.
    """
    # Calculate how many days we have to study
    today = date.today()
    total_days = (request.deadline - today).days
    if total_days < 1:
        total_days = 1  # at least 1 day

    # Step 1: Generate curriculum (uses LLM)
    curriculum = generate_curriculum(request.subject)

    # Step 2: Build schedule (pure logic, no LLM)
    schedule = build_schedule(curriculum, today, total_days)

    # Step 3: Return everything
    return PlanResponse(
        subject=request.subject,
        deadline=request.deadline,
        daily_hours=request.daily_hours,
        total_days=total_days,
        start_date=today,
        curriculum=curriculum,
        schedule=schedule,
    )
