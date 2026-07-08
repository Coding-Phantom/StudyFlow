import type { DayPlan } from "../types";

interface Props {
  year: number;
  month: number; // 0-indexed (0=Jan)
  schedule: DayPlan[];
  onDayClick?: (date: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({ year, month, schedule, onDayClick }: Props) {
  // Build a map of date string -> tasks count
  const taskMap = new Map<string, DayPlan>();
  for (const day of schedule) {
    taskMap.set(day.date, day);
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-xs font-semibold text-text-muted py-2 tracking-wide">
            {name}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const dayPlan = taskMap.get(dateStr);
          const taskCount = dayPlan?.tasks.length ?? 0;
          const completedCount = dayPlan?.tasks.filter((t) => t.completed).length ?? 0;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-200
                ${isToday ? "bg-accent/10 ring-2 ring-accent ring-offset-2 ring-offset-deep-bg" : ""}
                ${dayPlan ? "hover:bg-accent/5 cursor-pointer" : "cursor-default"}
              `}
            >
              <span
                className={`font-semibold text-sm ${
                  isToday ? "text-accent" : dayPlan ? "text-text-primary" : "text-text-muted/40"
                }`}
              >
                {day}
              </span>
              {taskCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ring-1 ${
                      completedCount === taskCount
                        ? "bg-success ring-success/30"
                        : "bg-accent ring-accent/30"
                    }`}
                  />
                  {completedCount < taskCount && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning ring-1 ring-warning/30" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
