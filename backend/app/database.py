from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Optional

from .curriculum import Topic
from .planner import DayPlan
from .quiz import Question


DB_PATH = Path(__file__).resolve().parents[1] / "data" / "studyflow.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS study_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                deadline TEXT NOT NULL,
                daily_hours REAL NOT NULL,
                total_days INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS subtopics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS day_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                day INTEGER NOT NULL,
                date TEXT NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS study_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_plan_id INTEGER NOT NULL,
                topic TEXT NOT NULL,
                subtopic TEXT,
                position INTEGER NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (day_plan_id) REFERENCES day_plans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                score_percent REAL NOT NULL,
                feedback TEXT NOT NULL,
                weak_concepts_json TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                answers_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS mastery_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                concept TEXT NOT NULL,
                score REAL NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(subject, concept)
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )


def get_setting(key: str) -> Optional[str]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT value FROM app_settings WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else None


def set_setting(key: str, value: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
            (key, value),
        )


def delete_setting(key: str) -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM app_settings WHERE key = ?", (key,))


def save_plan(
    *,
    subject: str,
    deadline: date,
    daily_hours: float,
    total_days: int,
    start_date: date,
    curriculum: Iterable[Topic],
    schedule: Iterable[DayPlan],
) -> int:
    now = _now()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO study_plans (
                subject, deadline, daily_hours, total_days, start_date, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (subject, deadline.isoformat(), daily_hours, total_days, start_date.isoformat(), now),
        )
        plan_id = int(cursor.lastrowid)
        # Auto-activate the new plan in the same transaction
        connection.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
            ("active_plan_id", str(plan_id)),
        )

        for topic_position, topic in enumerate(curriculum, start=1):
            topic_cursor = connection.execute(
                """
                INSERT INTO topics (plan_id, title, position)
                VALUES (?, ?, ?)
                """,
                (plan_id, topic.title, topic_position),
            )
            topic_id = int(topic_cursor.lastrowid)
            for subtopic_position, subtopic in enumerate(topic.subtopics, start=1):
                connection.execute(
                    """
                    INSERT INTO subtopics (topic_id, title, position)
                    VALUES (?, ?, ?)
                    """,
                    (topic_id, subtopic, subtopic_position),
                )

        for day_plan in schedule:
            day_cursor = connection.execute(
                """
                INSERT INTO day_plans (plan_id, day, date)
                VALUES (?, ?, ?)
                """,
                (plan_id, day_plan.day, day_plan.date.isoformat()),
            )
            day_plan_id = int(day_cursor.lastrowid)
            for task_position, task in enumerate(day_plan.tasks, start=1):
                connection.execute(
                    """
                    INSERT INTO study_tasks (day_plan_id, topic, subtopic, position)
                    VALUES (?, ?, ?, ?)
                    """,
                    (day_plan_id, task.topic, task.subtopic, task_position),
                )

        return plan_id


def save_quiz_attempt(
    *,
    subject: str,
    topic: str,
    questions: list[Question],
    answers: list[dict[str, str]],
    score: int,
    feedback: str,
    weak_concepts: list[str],
) -> int:
    total_questions = len(questions)
    score_percent = _score_percent(score, total_questions)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO quiz_attempts (
                subject, topic, score, total_questions, score_percent, feedback,
                weak_concepts_json, questions_json, answers_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                subject,
                topic,
                score,
                total_questions,
                score_percent,
                feedback,
                json.dumps(weak_concepts),
                json.dumps([_model_dump(question) for question in questions]),
                json.dumps(answers),
                _now(),
            ),
        )
        attempt_id = int(cursor.lastrowid)

        _update_mastery(connection, subject, topic, score_percent, weak_concepts)

        return attempt_id


def get_latest_plan() -> Optional[dict[str, Any]]:
    """Return the most recently created plan."""
    with get_connection() as connection:
        plan = connection.execute(
            """
            SELECT *
            FROM study_plans
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()

        if plan is None:
            return None

        return _hydrate_plan(connection, plan)


def get_active_plan() -> Optional[dict[str, Any]]:
    """Return the active plan (set by user) or fall back to latest."""
    active_plan_id = get_setting("active_plan_id")
    if active_plan_id is not None:
        plan = get_plan_by_id(int(active_plan_id))
        if plan is not None:
            return plan
    # Fallback to latest plan
    return get_latest_plan()


def set_active_plan(plan_id: int) -> None:
    """Set a plan as the active plan."""
    set_setting("active_plan_id", str(plan_id))


def delete_plan_by_id(plan_id: int) -> bool:
    """Delete a plan and all its related data (CASCADE). Returns True if deleted."""
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM study_plans WHERE id = ?", (plan_id,)
        )
        if cursor.rowcount == 0:
            return False
        # If the deleted plan was active, clear the active setting
        active_id = get_setting("active_plan_id")
        if active_id and int(active_id) == plan_id:
            connection.execute(
                "DELETE FROM app_settings WHERE key = 'active_plan_id'"
            )
        return True


def get_all_plans() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, subject, deadline, daily_hours, total_days, start_date, created_at
            FROM study_plans
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]


def get_plan_by_id(plan_id: int) -> Optional[dict[str, Any]]:
    with get_connection() as connection:
        plan = connection.execute(
            """
            SELECT *
            FROM study_plans
            WHERE id = ?
            """,
            (plan_id,),
        ).fetchone()

        if plan is None:
            return None

        return _hydrate_plan(connection, plan)


def complete_task(task_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE study_tasks
            SET completed = 1
            WHERE id = ?
            """,
            (task_id,),
        )
        return cursor.rowcount > 0


def get_mastery_scores() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT subject, concept, score, updated_at
            FROM mastery_scores
            ORDER BY subject, concept
            """
        ).fetchall()
        return [dict(row) for row in rows]


def _update_mastery(
    connection: sqlite3.Connection,
    subject: str,
    topic: str,
    score_percent: float,
    weak_concepts: list[str],
) -> None:
    _upsert_mastery_score(connection, subject, topic, score_percent)

    for concept in weak_concepts:
        adjusted_score = min(score_percent, 45.0)
        _upsert_mastery_score(connection, subject, concept, adjusted_score)


def _upsert_mastery_score(
    connection: sqlite3.Connection,
    subject: str,
    concept: str,
    new_score: float,
) -> None:
    existing = connection.execute(
        """
        SELECT score
        FROM mastery_scores
        WHERE subject = ? AND concept = ?
        """,
        (subject, concept),
    ).fetchone()

    if existing is None:
        score = new_score
    else:
        score = (float(existing["score"]) * 0.7) + (new_score * 0.3)

    connection.execute(
        """
        INSERT INTO mastery_scores (subject, concept, score, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(subject, concept)
        DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at
        """,
        (subject, concept, round(score, 2), _now()),
    )


def _hydrate_plan(connection: sqlite3.Connection, plan: sqlite3.Row) -> dict[str, Any]:
    topics = connection.execute(
        """
        SELECT *
        FROM topics
        WHERE plan_id = ?
        ORDER BY position
        """,
        (plan["id"],),
    ).fetchall()

    schedule = connection.execute(
        """
        SELECT *
        FROM day_plans
        WHERE plan_id = ?
        ORDER BY day
        """,
        (plan["id"],),
    ).fetchall()

    return {
        **dict(plan),
        "curriculum": [_hydrate_topic(connection, topic) for topic in topics],
        "schedule": [_hydrate_day_plan(connection, day_plan) for day_plan in schedule],
    }


def _hydrate_topic(connection: sqlite3.Connection, topic: sqlite3.Row) -> dict[str, Any]:
    subtopics = connection.execute(
        """
        SELECT title
        FROM subtopics
        WHERE topic_id = ?
        ORDER BY position
        """,
        (topic["id"],),
    ).fetchall()

    return {
        "title": topic["title"],
        "subtopics": [row["title"] for row in subtopics],
    }


def _hydrate_day_plan(connection: sqlite3.Connection, day_plan: sqlite3.Row) -> dict[str, Any]:
    tasks = connection.execute(
        """
        SELECT topic, subtopic, completed
        FROM study_tasks
        WHERE day_plan_id = ?
        ORDER BY position
        """,
        (day_plan["id"],),
    ).fetchall()

    return {
        "day": day_plan["day"],
        "date": day_plan["date"],
        "tasks": [dict(task) for task in tasks],
    }


def _model_dump(model: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _score_percent(score: int, total_questions: int) -> float:
    if total_questions <= 0:
        return 0.0
    return round((score / total_questions) * 100, 2)


def _now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")
