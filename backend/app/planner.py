from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from .curriculum import Topic 

class StudyTask(BaseModel):
    topic: str
    subtopic: Optional[str] = None


class DayPlan(BaseModel):
    day: int
    date: date
    tasks: List[StudyTask]


def build_schedule(
    curriculum: List[Topic],
    start_date: date,
    total_days: int
) -> List[DayPlan]:
    
    # Step 1: Flatten all subtopics into a single list
    subtopics = []
    for topic in curriculum:
        if topic.subtopics: 
            for subtopic in topic.subtopics:
                subtopics.append(StudyTask(topic=topic.title, subtopic=subtopic))
        else:
            subtopics.append(StudyTask(topic=topic.title))

    # Step 2: Pre-create empty DayPlans for each day
    from datetime import timedelta

    schedule = []
    for i in range(total_days):
        schedule.append(DayPlan(
            day=i + 1,
            date=start_date + timedelta(days=i),
            tasks=[]
        ))

    # Step 3: Assign each subtopic to a day (round-robin)
    for i, task in enumerate(subtopics):
        day_index = i % total_days
        schedule[day_index].tasks.append(task)

    return schedule



if __name__ == "__main__":
    from .curriculum import generate_curriculum
    from datetime import date

    topics = generate_curriculum("Calculus Power Rule")
    schedule = build_schedule(topics, date.today(), 10)

    for day in schedule:
        task_list = [f"{t.topic}: {t.subtopic or '(overview)'}" for t in day.tasks]
        print(f"Day {day.day} ({day.date}): {', '.join(task_list) if task_list else '(free day)'}")