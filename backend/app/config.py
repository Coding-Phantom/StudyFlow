"""Central model configuration.

Change these to swap out models without touching every file.
"""

# Used for: curriculum generation, study notes, explanation, adaptation
LLAMA_MODEL = "llama3.1:8b"

# Used for: quiz generation, answer evaluation (needs better precision)
QWEN_MODEL = "qwen2.5:7b"
