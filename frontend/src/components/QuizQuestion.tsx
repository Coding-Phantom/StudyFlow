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

  return (
    <div
      className={`card p-5 transition-all duration-300 ${
        showResult
          ? isCorrect
            ? "border-green-300/70 bg-green-50/60"
            : "border-red-300/70 bg-red-50/60"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
            showResult
              ? isCorrect ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"
              : "bg-indigo-100 text-indigo-700"
          }`}>
            {index + 1}
          </span>
          <span className="text-xs font-medium text-gray-400">{typeLabel}</span>
        </div>
        {showResult && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
      <p className="text-sm font-medium text-gray-900 mb-4 leading-relaxed">{question.prompt}</p>

      {/* Multiple Choice */}
      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const isSelected = value === option;
            const isRightOption = showResult && i === correctOptionIndex;
            const isWrongSelection = showResult && isSelected && !isRightOption;

            let borderClass = "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30";
            if (isRightOption) borderClass = "border-green-400 bg-green-50/80";
            else if (isWrongSelection) borderClass = "border-red-400 bg-red-50/80";

            return (
              <label
                key={i}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  showResult ? "cursor-default" : ""
                } ${borderClass} ${isSelected && !showResult ? "border-indigo-400 bg-indigo-50/50 shadow-sm" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => !showResult && onChange(option)}
                  disabled={showResult}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500/30 border-gray-300"
                />
                <span className="text-sm text-gray-700 flex-1">{option}</span>
                {isRightOption && (
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isWrongSelection && (
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-gray-400 ${
              showResult
                ? isCorrect
                  ? "border-2 border-green-400 bg-green-50/80 text-gray-700"
                  : "border-2 border-red-400 bg-red-50/80 text-gray-700"
                : "border-2 border-gray-300 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:bg-gray-50"
            }`}
          />
        </div>
      )}

      {/* Show correct answer after submission (only if wrong) */}
      {showResult && !isCorrect && correctAnswer && (
        <div className="mt-4 flex items-center gap-2 text-sm bg-gray-100/80 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium text-gray-500">Correct answer: </span>
            <span className="font-semibold text-gray-800">{correctAnswer}</span>
          </div>
        </div>
      )}

      {/* Manual override: show on any answer marked incorrect */}
      {showResult && !isCorrect && onMarkCorrect && (
        <div className="mt-3">
          <button
            onClick={() => onMarkCorrect(question.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100/80 hover:bg-green-200/80 px-3 py-1.5 rounded-lg transition-all duration-200 border border-green-200/50"
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
