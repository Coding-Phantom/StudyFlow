interface Props {
  /** Brief context-specific message after the "AI can make mistakes" prefix */
  children?: string;
  /** Compact style for small spaces (default false) */
  compact?: boolean;
}

export default function AIDisclaimer({ children, compact }: Props) {
  const text = children ?? "AI-generated content may not always be accurate. Use your best judgment and verify important information.";

  if (compact) {
    return (
      <div className="flex items-start gap-1.5 text-xs text-gray-400">
        <svg className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>AI can make mistakes. {text}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 text-sm bg-amber-50/80 border border-amber-200/50 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-amber-800 leading-relaxed">
        <span className="font-semibold">AI can make mistakes.</span> {text}
      </p>
    </div>
  );
}
