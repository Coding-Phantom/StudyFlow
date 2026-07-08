import type { Question } from "../types";

interface Props {
  question: Question;
  index: number;
  value: string;
  onChange: (value: string) => void;
  showResult?: boolean;
  correctAnswer?: string;
  isCorrect?: boolean;
  onMarkCorrect?: (questionId: string) => void;
}

/** Normalize text for generous comparison */
function normalize(text: string): string {
  let t = text.trim().toLowerCase();
  // Remove common punctuation
  for (const ch of ".,;:!?'\"-") {
    t = t.replaceAll(ch, " ");
  }
  // Collapse spaces
  t = t.replace(/\s+/g, " ").trim();
  // Remove leading articles
  for (const article of ["the ", "a ", "an "]) {
    if (t.startsWith(article)) t = t.slice(article.length);
  }
  return t.trim();
}

/** Lenient comparison that handles MC letter labels and short answer variations */
function answersMatch(userAnswer: string, correctAnswer: string, question: Question): boolean {
  const ua = normalize(userAnswer);
  const ca = normalize(correctAnswer);

  if (ua === ca) return true;
  if (ua.includes(ca) || ca.includes(ua)) return true;

  // For short answer: generous key word overlap (matches backend)
  if (question.type === "short_answer") {
    if (!ua) return false;

    const caWords = new Set(ca.split(/\s+/));
    const uaWords = new Set(ua.split(/\s+/));

    // All significant words from correct answer appear
    const significant = new Set([...caWords].filter((w) => w.length > 2));
    if (significant.size > 0 && [...significant].every((w) => uaWords.has(w))) return true;

    // At least 30% word overlap
    if (caWords.size > 0) {
      const intersection = new Set([...caWords].filter((w) => uaWords.has(w)));
      if (intersection.size >= caWords.size * 0.3) return true;
    }

    // At least one significant word matches and user answer is substantial
    if (ua.length >= 3) {
      for (const w of caWords) {
        if (w.length > 2 && uaWords.has(w)) return true;
      }
    }

    // User's words mostly appear in correct answer
    if (uaWords.size >= 1) {
      const overlap = [...uaWords].filter((w) => caWords.has(w)).length;
      if (overlap >= uaWords.size * 0.5) return true;
    }
  }

  if (question.type === "multiple_choice" && question.options) {
    const letterMatch = ca.match(/^(?:option\s+)?([a-d])$/);
    const correctLetter = letterMatch ? letterMatch[1] : ca.length === 1 ? ca : null;

    if (correctLetter) {
      const idx = correctLetter.charCodeAt(0) - 97;
      if (idx >= 0 && idx < question.options.length) {
        return ua === normalize(question.options[idx]);
      }
    }

    for (const opt of question.options) {
      const optLower = normalize(opt);
      if (optLower === ca && optLower === ua) return true;
    }
  }

  return false;
}

/** Given a question and a correctAnswer string, return the index of the matching option (or -1). */
function findCorrectOptionIndex(question: Question, correctAnswer: string): number {
  if (!question.options) return -1;
  const ca = correctAnswer.trim().toLowerCase();

  // If correctAnswer is a letter, return the corresponding index
  const letterMatch = ca.match(/^(?:option\s+)?([a-d])$/);
  const correctLetter = letterMatch ? letterMatch[1] : ca.length === 1 ? ca : null;
  if (correctLetter) {
    const idx = correctLetter.charCodeAt(0) - 97;
    if (idx >= 0 && idx < question.options.length) return idx;
  }

  // Try to find by text match
  for (let i = 0; i < question.options.length; i++) {
    if (answersMatch(question.options[i], correctAnswer, question)) return i;
  }

  return -1;
}

export default function QuizQuestion({
  question,
  index,
  value,
  onChange,
  showResult,
  correctAnswer,
  isCorrect,
  onMarkCorrect,
}: Props) {
  const typeLabel =
    question.type === "multiple_choice"
      ? "Multiple Choice"
      : "Short Answer";

  const correctOptionIndex = showResult && correctAnswer
    ? findCorrectOptionIndex(question, correctAnswer)
    : -1;

  const borderClass = showResult
    ? isCorrect
      ? "border-success/30 bg-success-muted/20"
      : "border-danger/30 bg-danger-muted/20"
    : "";

  return (
    <div className={`card p-5 transition-all duration-300 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
            showResult
              ? isCorrect ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
              : "bg-accent/10 text-accent"
          }`}>
            {index + 1}
          </span>
          <span className="text-xs font-medium text-text-muted">{typeLabel}</span>
        </div>
        {showResult && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isCorrect ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
            }`}
          >
            {isCorrect ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
        )}
      </div>

      {/* Prompt */}
      <p className="text-sm font-medium text-text-primary mb-4 leading-relaxed">{question.prompt}</p>

      {/* Multiple Choice */}
      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const isSelected = value === option;
            const isRightOption = showResult && i === correctOptionIndex;
            const isWrongSelection = showResult && isSelected && !isRightOption;

            let optBorderClass = "border-white/10 hover:border-accent/30 hover:bg-accent/5";
            if (isRightOption) optBorderClass = "border-success/40 bg-success-muted/30";
            else if (isWrongSelection) optBorderClass = "border-danger/40 bg-danger-muted/30";

            const selectedClass = isSelected && !showResult ? "border-accent/40 bg-accent/10" : "";

            return (
              <label
                key={i}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-colors duration-100 ${
                  showResult ? "cursor-default" : ""
                } ${optBorderClass} ${selectedClass} ${!showResult ? "focus-within:ring-2 focus-within:ring-accent/30 focus-within:ring-offset-2 focus-within:ring-offset-deep-bg" : ""}`}
              >
                {/* Hidden radio for events + accessibility */}
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => !showResult && onChange(option)}
                  disabled={showResult}
                  className="sr-only"
                />
                {/* Custom radio dot */}
                <span
                  aria-hidden="true"
                  className={`relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-100 ${
                    isSelected
                      ? "border-accent bg-accent/20"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </span>
                <span className="text-sm text-text-secondary flex-1 select-none">{option}</span>
                {isRightOption && (
                  <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isWrongSelection && (
                  <svg className="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Short Answer */}
      {question.type === "short_answer" && (
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            disabled={showResult}
            className={`w-full ${
              showResult
                ? isCorrect
                  ? "border-2 border-success/40 bg-success-muted/20 text-text-primary"
                  : "border-2 border-danger/40 bg-danger-muted/20 text-text-primary"
                : ""
            }`}
          />
        </div>
      )}

      {/* Show correct answer after submission (only if wrong) */}
      {showResult && !isCorrect && correctAnswer && (
        <div className="mt-4 flex items-center gap-2 text-sm bg-surface/50 rounded-xl px-3.5 py-2.5 border border-border">
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium text-text-muted">Correct answer: </span>
            <span className="font-semibold text-text-primary">{correctAnswer}</span>
          </div>
        </div>
      )}

      {/* Manual override: show on any answer marked incorrect */}
      {showResult && !isCorrect && onMarkCorrect && (
        <div className="mt-3">
          <button
            onClick={() => onMarkCorrect(question.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 hover:bg-success/15 px-3 py-1.5 rounded-lg transition-all duration-200 border border-success/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Mark as Correct
          </button>
        </div>
      )}
    </div>
  );
}
