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
          <div key={name} className="text-center text-xs font-semibold text-gray-400 py-2 tracking-wide">
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
                ${isToday ? "bg-indigo-50 ring-2 ring-indigo-500 ring-offset-2" : ""}
                ${dayPlan ? "hover:bg-indigo-50/60 cursor-pointer" : "cursor-default"}
              `}
            >
              <span
                className={`font-semibold text-sm ${
                  isToday ? "text-indigo-700" : dayPlan ? "text-gray-800" : "text-gray-300"
                }`}
              >
                {day}
              </span>
              {taskCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ring-1 ${
                      completedCount === taskCount
                        ? "bg-green-400 ring-green-200"
                        : "bg-indigo-400 ring-indigo-200"
                    }`}
                  />
                  {completedCount < taskCount && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-200" />
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
