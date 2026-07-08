import { useState } from "react";
import type { StudyNotes } from "../types";
import { api } from "../api/client";
import AIDisclaimer from "./AIDisclaimer";

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
      {/* AI disclaimer for study notes */}
      <AIDisclaimer compact>
        These study notes are AI-generated. Cross-check with your course materials.
      </AIDisclaimer>

      {/* Summary */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Summary</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{notes.summary}</p>
      </div>

      {/* Key Concepts */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Key Concepts</h3>
        <ul className="space-y-1">
          {notes.key_concepts.map((concept, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              {concept}
            </li>
          ))}
        </ul>
      </div>

      {/* Important Terms */}
      {notes.important_terms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Important Terms</h3>
          <ul className="space-y-1">
            {notes.important_terms.map((term, i) => (
              <li key={i} className="text-sm text-text-secondary">
                {term}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Mistakes */}
      {notes.common_mistakes.length > 0 && (
        <div className="card border-warning/20 bg-warning-muted/30 p-4">
          <h3 className="text-sm font-semibold text-warning uppercase tracking-wider mb-2">Common Mistakes</h3>
          <ul className="space-y-1">
            {notes.common_mistakes.map((mistake, i) => (
              <li key={i} className="text-sm text-warning flex items-start gap-2">
                <span className="text-warning mt-0.5">&#9888;</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Practice */}
      {notes.recommended_practice.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Recommended Practice</h3>
          <ul className="space-y-1">
            {notes.recommended_practice.map((practice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-accent mt-0.5">&#9655;</span>
                {practice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Est time badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs bg-white/[0.04] text-text-muted px-3 py-1.5 rounded-full font-medium border border-border">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Estimated: {notes.estimated_study_time} min
        </span>

        {onStartQuiz && (
          <button
            onClick={() => onStartQuiz(notes.topic)}
            className="inline-flex items-center gap-1.5 text-xs btn-primary px-4 py-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Take Quiz
          </button>
        )}
      </div>

      {/* Ask a Question */}
      <div className="border-t border-border pt-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="text-sm font-semibold text-text-primary">Ask a Question</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Why is this concept important?"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={explaining || !question.trim()}
            className="btn-primary"
          >
            {explaining ? "..." : "Ask"}
          </button>
        </div>

        {explaining && (
          <div className="flex items-center gap-2 mt-3 text-sm text-text-muted">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating explanation...
          </div>
        )}

        {explanation && (
          <div className="mt-3 bg-surface/50 rounded-xl p-4 text-sm text-text-secondary leading-relaxed border border-border">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}
