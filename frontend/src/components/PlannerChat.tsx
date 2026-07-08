import { useState, useRef, useEffect } from "react";
import { api } from "../api/client";
import type { ChatMessage, Topic } from "../types";
import AIDisclaimer from "./AIDisclaimer";

interface Props {
  onPlanCreated: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your **Planning Assistant**. 🎯\n\nTell me what you'd like to learn and I'll help you build a study plan. For example:\n\n> *\"I want to learn web development in 2 months\"*\n> *\"I need to study for the GRE, I have 6 weeks\"*\n> *\"Help me plan learning Python\"*",
};

export default function PlannerChat({ onPlanCreated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [planData, setPlanData] = useState<{
    subject: string;
    deadline: string;
    daily_hours: number;
    curriculum: Topic[];
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");

    const userMessage: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setSending(true);

    try {
      const result = await api.plannerChat({
        messages: messages.slice(1), // exclude the welcome message from history
        message: text,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.reply,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (result.plan_ready && result.plan_data) {
        setPlanReady(true);
        setPlanData(result.plan_data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get response from planning assistant",
      );
      // Put the user message back so they can retry
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFinalize = async () => {
    if (!planData) return;
    setCreating(true);
    setError("");
    try {
      await api.plannerCreate({
        subject: planData.subject,
        deadline: planData.deadline,
        daily_hours: planData.daily_hours,
        curriculum: planData.curriculum,
      });
      onPlanCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create plan",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setPlanReady(false);
    setPlanData(null);
    setError("");
    setInput("");
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 px-1 pb-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-[#5eead4] to-[#c084fc] text-deep-bg rounded-br-md"
                  : "bg-white/[0.06] border border-border text-text-primary rounded-bl-md"
              }`}
            >
              {/* Simple markdown-ish rendering for assistant messages */}
              {msg.role === "assistant" ? (
                <AssistantMessage content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/[0.06] border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger-muted/30 rounded-xl px-4 py-2.5 border border-danger/20 mb-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Plan ready banner */}
      {planReady && planData && (
        <div className="card p-4 border border-accent/20 bg-accent/[0.04] mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#c084fc] flex items-center justify-center shrink-0 shadow-md shadow-[#5eead4]/[0.2]">
              <svg className="w-5 h-5 text-deep-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-text-primary text-sm">Plan Ready</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                <span className="font-medium">{planData.subject}</span>
                {" · "}Deadline: {new Date(planData.deadline).toLocaleDateString()}
                {" · "}{planData.daily_hours}h/day
                {" · "}{planData.curriculum.length} topics
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {planData.curriculum.map((t) => (
                  <span
                    key={t.title}
                    className="text-[11px] font-medium bg-white/[0.06] border border-border px-2 py-0.5 rounded-full text-text-secondary"
                  >
                    {t.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleFinalize}
              disabled={creating}
              className="flex-1 btn-primary justify-center py-2 text-sm"
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Plan...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Create Study Plan
                </span>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={creating}
              className="btn-secondary py-2 text-sm"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* AI Disclaimer */}
      {!planReady && <AIDisclaimer compact />}

      {/* Input area */}
      {!planReady && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what you want to learn..."
              rows={2}
              disabled={sending}
              className="w-full resize-none pr-10"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary h-[42px] w-[42px] !px-0 justify-center shrink-0"
          >
            {sending ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/** Renders assistant messages with basic formatting. */
function AssistantMessage({ content }: { content: string }) {
  // Split on double newlines for paragraphs
  const paragraphs = content.split("\n\n").filter(Boolean);

  return (
    <>
      {paragraphs.map((p, i) => {
        // Check if it's a bullet list
        if (p.startsWith("- ") || p.startsWith("* ")) {
          const items = p.split("\n").filter(Boolean);
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5 mb-2 last:mb-0">
              {items.map((item, j) => (
                <li key={j}>{formatInline(item.replace(/^[-*]\s*/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Check if it's a numbered list
        if (/^\d+\.\s/.test(p)) {
          const items = p.split("\n").filter(Boolean);
          return (
            <ol key={i} className="list-decimal list-inside space-y-0.5 mb-2 last:mb-0">
              {items.map((item, j) => (
                <li key={j}>{formatInline(item.replace(/^\d+\.\s*/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="mb-2 last:mb-0">
            {formatInline(p)}
          </p>
        );
      })}
    </>
  );
}

/** Renders inline bold, italic, and inline code. */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-white/[0.08] px-1 py-0.5 rounded text-[13px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Handle inline links (basic)
    if (part.includes("http")) {
      const urlParts = part.split(/(https?:\/\/[^\s]+)/g);
      return urlParts.map((urlPart, j) => {
        if (urlPart.startsWith("http")) {
          return (
            <a key={j} href={urlPart} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {urlPart}
            </a>
          );
        }
        return urlPart;
      });
    }
    return part;
  });
}
