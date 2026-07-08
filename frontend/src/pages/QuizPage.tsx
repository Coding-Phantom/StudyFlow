import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import type {
  Plan,
  Question,
  UserAnswer,
  EvaluateResult,
} from "../types";
import QuizQuestion from "../components/QuizQuestion";
import QuizResults from "../components/QuizResults";

type Phase = "setup" | "taking" | "results";

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedTopic = searchParams.get("topic") ?? "";
  const preselectedSubtopic = searchParams.get("subtopic") ?? "";

  // Notes content passed from LearnPage (via location.state)
  const notesContent = (location.state as Record<string, string>)?.notesContent ?? "";

  // Plan / curriculum for topic selection
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Setup state
  const [selectedTopic, setSelectedTopic] = useState(preselectedTopic);
  const [selectedSubtopic, setSelectedSubtopic] = useState(preselectedSubtopic);
  const [numQuestions, setNumQuestions] = useState(5);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  // Evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);

  // Load latest plan for topic selection
  useEffect(() => {
    const load = async () => {
      try {
        const state = await api.getState();
        setPlan(state.latest_plan);
      } catch {
        // no plan yet
      } finally {
        setPlanLoading(false);
      }
    };
    load();
  }, []);

  // Build topic options from curriculum
  const topics =
    plan?.curriculum?.map((t) => ({
      title: t.title,
      subtopics: t.subtopics,
    })) ?? [];

  const currentTopic = topics.find((t) => t.title === selectedTopic);
  const subtopics = currentTopic?.subtopics ?? [];

  // Handle starting the quiz
  const handleStartQuiz = async () => {
    if (!selectedTopic || !plan) return;
    setQuizLoading(true);
    setQuizError("");
    try {
      const quiz = await api.getQuiz({
        subject: plan.subject,
        topic: selectedTopic,
        subtopic: selectedSubtopic || undefined,
        notes_content: notesContent || undefined,
        num_questions: numQuestions,
      });
      setQuestions(quiz.questions);
      setAnswers(new Map());
      setCurrentIndex(0);
      setPhase("taking");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  // Handle answering
  const handleAnswer = (value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questions[currentIndex].id, value);
    setAnswers(newAnswers);
  };

  // Navigate questions
  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!plan) return;
    setEvaluating(true);
    try {
      const userAnswers: UserAnswer[] = questions.map((q) => ({
        question_id: q.id,
        user_answer: answers.get(q.id) ?? "",
      }));

      const evalResult = await api.evaluate({
        subject: plan.subject,
        topic: selectedTopic,
        questions,
        answers: userAnswers,
      });

      setResult(evalResult);
      setPhase("results");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Failed to evaluate quiz");
    } finally {
      setEvaluating(false);
    }
  };

  // Check if all questions are answered
  const allAnswered = questions.every((q) => (answers.get(q.id) ?? "").trim() !== "");
  const currentAnswered = (answers.get(questions[currentIndex]?.id) ?? "").trim() !== "";

  // Handle review topics click from results
  const handleReviewTopics = (topics: string[]) => {
    if (topics.length > 0) {
      navigate(`/learn?focus=${encodeURIComponent(topics[0])}`);
    }
  };

  // No plan
  if (!planLoading && !plan) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5eead4] to-[#c084fc] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#5eead4]/[0.15]">
          <svg className="w-8 h-8 text-deep-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">No Study Plan Yet</h1>
        <p className="text-text-secondary mt-2">Create a study plan before taking quizzes.</p>
        <a
          href="/plans"
          className="btn-primary mt-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create a Plan
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Quiz</h1>
        <p className="text-text-secondary mt-1.5">
          {phase === "setup" && "Select a topic and generate a quiz."}
          {phase === "taking" && `Question ${currentIndex + 1} of ${questions.length}`}
          {phase === "results" && "Your results"}
        </p>
      </div>

      {/* PHASE: Setup */}
      {phase === "setup" && (
        <div className="card p-6 max-w-lg mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#c084fc] flex items-center justify-center shadow-md shadow-[#5eead4]/[0.2]">
              <svg className="w-5 h-5 text-deep-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Configure Quiz</h2>
              <p className="text-sm text-text-secondary">Choose a topic and number of questions</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedSubtopic("");
              }}
              className="w-full"
            >
              <option value="">Select a topic...</option>
              {topics.map((t) => (
                <option key={t.title} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {subtopics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Subtopic <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <select
                value={selectedSubtopic}
                onChange={(e) => setSelectedSubtopic(e.target.value)}
                className="w-full"
              >
                <option value="">All subtopics</option>
                {subtopics.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Number of Questions: <span className="text-accent font-bold">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          {quizError && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-muted/30 rounded-lg px-3.5 py-2.5 border border-danger/20">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizError}
            </div>
          )}

          <button
            onClick={handleStartQuiz}
            disabled={!selectedTopic || quizLoading}
            className="w-full btn-primary justify-center py-2.5"
          >
            {quizLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating quiz... (may take 30s)
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Quiz
              </span>
            )}
          </button>
        </div>
      )}

      {/* PHASE: Taking */}
      {phase === "taking" && questions.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Progress bar with labels */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-text-muted w-16">Progress</span>
            <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5eead4] to-[#c084fc] h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-accent w-12 text-right">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>

          {/* Question */}
          <QuizQuestion
            question={questions[currentIndex]}
            index={currentIndex}
            value={answers.get(questions[currentIndex].id) ?? ""}
            onChange={handleAnswer}
          />

          {/* AI Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-text-muted bg-white/[0.03] rounded-xl px-3.5 py-2.5 border border-border">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>AI can make mistakes. Answers are graded generously, but you can review and override results after submission.</p>
          </div>

          {/* Error display */}
          {quizError && (
            <div className="card px-4 py-3 text-sm text-danger flex items-center gap-2 border-danger/20 bg-danger-muted/30">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizError}
              <button onClick={handleSubmit} className="ml-auto underline hover:no-underline text-sm font-semibold">
                Retry
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="text-xs font-medium text-text-muted bg-white/[0.04] px-3 py-1.5 rounded-full">
              {answers.size} of {questions.length} answered
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!currentAnswered}
                className="btn-primary"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || evaluating}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 shadow-md bg-gradient-to-r from-[#34d399] to-[#2dd4bf] text-deep-bg hover:shadow-lg hover:shadow-[#34d399]/[0.25] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {evaluating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Evaluating...
                  </span>
                ) : (
                  <>
                    Submit Quiz
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE: Results */}
      {phase === "results" && (
        <>
          {quizError && (
            <div className="card px-4 py-3 text-sm text-danger flex items-center gap-2 border-danger/20 bg-danger-muted/30">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizError}
            </div>
          )}
          {result ? (
            <QuizResults
              subject={plan!.subject}
              topic={selectedTopic}
              questions={questions}
              answers={questions.map((q) => ({
                question_id: q.id,
                user_answer: answers.get(q.id) ?? "",
              }))}
              result={result}
              onReviewTopics={handleReviewTopics}
            />
          ) : (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4 border border-border">
                <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary font-medium">No results available.</p>
              <button
                onClick={() => setPhase("setup")}
                className="mt-3 text-accent font-semibold underline hover:no-underline text-sm inline-flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start a new quiz
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
