from pydantic import BaseModel
from typing import List
import ollama
import json
from .config import LLAMA_MODEL

# Ex: topic = "calculus", subtopics = "limits, derivatives, integrals"
class Topic(BaseModel):
    title: str
    subtopics: List[str] = []


def generate_curriculum(subject: str) -> List[Topic]:

    response = ollama.chat(
        model=LLAMA_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that generates a curriculum for a given subject."
            },
            {
                "role": "user",
                "content":(
                  f"Generate a curriculum for the subject: {subject}. "
                  "Return only a JSON list of objects. "
                  "Each object has a 'title' (the topic name) and a 'subtopics' list. "
                  '[{"title": "Topic A", "subtopics": ["Subtopic 1", "Subtopic 2"]}]\n'
                    "Do NOT include any other text or explanation."
                )
            }
        ])
    

    raw_text = response["message"]["content"]

    data = json.loads(raw_text)

    topics = [Topic(**item) for item in data]

    return topics


if __name__ == "__main__":
    topics = generate_curriculum("Python Basics")
    for t in topics:
        print(f"{t.title}: {', '.join(t.subtopics)}")