import { useState } from "react";
import type { StudyNotes } from "../types";
import { api } from "../api/client";

interface Props {
  notes: StudyNotes;
  subject: string;
  onStartQuiz?: (topic: string, subtopic?: string) => void;
}

export default function NotesDisplay({ notes, subject, onStartQuiz }: Props) {
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await api.explain({
        subject,
        topic: notes.topic,
        question: question.trim(),
      });
      setExplanation(res.explanation);
    } catch {
      setExplanation("Sorry, I couldn't generate an explanation. Try again.");
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Summary</h3>
        <p className="text-gray-700 text-sm leading-relaxed">{notes.summary}</p>
      </div>

      {/* Key Concepts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Concepts</h3>
        <ul className="space-y-1">
          {notes.key_concepts.map((concept, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              {concept}
            </li>
          ))}
        </ul>
      </div>

      {/* Important Terms */}
      {notes.important_terms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Important Terms</h3>
          <ul className="space-y-1">
            {notes.important_terms.map((term, i) => (
              <li key={i} className="text-sm text-gray-700">
                {term}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Mistakes */}
      {notes.common_mistakes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-2">Common Mistakes</h3>
          <ul className="space-y-1">
            {notes.common_mistakes.map((mistake, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&#9888;</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Practice */}
      {notes.recommended_practice.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommended Practice</h3>
          <ul className="space-y-1">
            {notes.recommended_practice.map((practice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-500 mt-0.5">&#9655;</span>
                {practice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Est time badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Estimated: {notes.estimated_study_time} min
        </span>

        {onStartQuiz && (
          <button
            onClick={() => onStartQuiz(notes.topic)}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 transition-colors"
          >
            Take Quiz
          </button>
        )}
      </div>

      {/* Ask a Question */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Ask a Question</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Why is this concept important?"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={explaining || !question.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {explaining ? "..." : "Ask"}
          </button>
        </div>

        {explaining && (
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating explanation...
          </div>
        )}

        {explanation && (
          <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}
