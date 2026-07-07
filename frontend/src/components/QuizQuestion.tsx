import type { Question } from "../types";

interface Props {
  question: Question;
  index: number;
  value: string;
  onChange: (value: string) => void;
  showResult?: boolean;
  correctAnswer?: string;
  isCorrect?: boolean;
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

  // For short answer: check key word overlap
  if (question.type === "short_answer") {
    const caWords = new Set(ca.split(/\s+/));
    const uaWords = new Set(ua.split(/\s+/));
    const significant = new Set([...caWords].filter((w) => w.length > 2));
    if (significant.size > 0 && [...significant].every((w) => uaWords.has(w))) return true;
    if (caWords.size > 0) {
      const intersection = new Set([...caWords].filter((w) => uaWords.has(w)));
      if (intersection.size >= caWords.size * 0.5) return true;
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
      className={`bg-white rounded-xl border p-5 transition-colors ${
        showResult
          ? isCorrect
            ? "border-green-400 bg-green-50"
            : "border-red-400 bg-red-50"
          : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Question {index + 1} &middot; {typeLabel}
        </span>
        {showResult && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
        )}
      </div>

      {/* Prompt */}
      <p className="text-sm font-medium text-gray-900 mb-3">{question.prompt}</p>

      {/* Multiple Choice */}
      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isSelected = value === option;
            const isRightOption = showResult && i === correctOptionIndex;
            const isWrongSelection = showResult && isSelected && !isRightOption;

            let borderClass = "border-gray-200 hover:border-indigo-300";
            if (isRightOption) borderClass = "border-green-400 bg-green-50";
            else if (isWrongSelection) borderClass = "border-red-400 bg-red-50";

            return (
              <label
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  showResult ? "cursor-default" : ""
                } ${borderClass}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={() => !showResult && onChange(option)}
                  disabled={showResult}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
                {isRightOption && (
                  <svg className="w-4 h-4 text-green-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isWrongSelection && (
                  <svg className="w-4 h-4 text-red-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:text-gray-500 ${
              showResult
                ? isCorrect
                  ? "border-green-400 bg-green-50"
                  : "border-red-400 bg-red-50"
                : "border-gray-300 disabled:bg-gray-50"
            }`}
          />
        </div>
      )}

      {/* Show correct answer after submission (only if wrong) */}
      {showResult && !isCorrect && correctAnswer && (
        <div className="mt-3 text-sm">
          <span className="font-medium text-gray-600">Correct answer: </span>
          <span className="text-gray-900">{correctAnswer}</span>
        </div>
      )}
    </div>
  );
}
