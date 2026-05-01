import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react';

interface DateNavigatorProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = weekdays[d.getDay()];
    return `${month}月${day}日 ${weekday}`;
  } catch {
    return dateStr;
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function CalendarPopup({ selectedDate, onSelect, onClose }: { selectedDate: string; onSelect: (d: string) => void; onClose: () => void }) {
  const [viewYear, setViewYear] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.getMonth();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const today = new Date().toISOString().split('T')[0];

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const pad = (n: number) => n.toString().padStart(2, '0');
  const toStr = (d: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div
      ref={ref}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white/95 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-2xl shadow-black/10 p-4 w-72"
    >
      {/* 年月导航 */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setViewYear(viewYear - 1)} className="text-xs text-gray-400 hover:text-gray-600 px-1">
            <ChevronDown className="w-3 h-3 inline" />年
          </button>
          <span className="text-sm font-semibold text-gray-700">{viewYear}年{viewMonth + 1}月</span>
          <button type="button" onClick={() => setViewYear(viewYear + 1)} className="text-xs text-gray-400 hover:text-gray-600 px-1">
            年<ChevronUp className="w-3 h-3 inline" />
          </button>
        </div>
        <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 星期头 */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekdays.map(w => (
          <div key={w} className="text-center text-[10px] text-gray-400 font-medium py-1">{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = toStr(day);
          const isSelected = dateStr === selectedDate;
          const isTodayDate = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => { onSelect(dateStr); onClose(); }}
              className={`
                w-9 h-9 rounded-lg text-xs font-medium transition-all outline-none
                ${isSelected ? 'bg-teal-500 text-white shadow-sm' : ''}
                ${!isSelected && isTodayDate ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-300' : ''}
                ${!isSelected && !isTodayDate ? 'text-gray-600 hover:bg-gray-100' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* 底部快捷 */}
      <div className="flex justify-center mt-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => { onSelect(today); onClose(); }}
          className="px-3 py-1 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors"
        >
          回到今天
        </button>
      </div>
    </div>
  );
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="flex items-center gap-1 relative">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        className="p-1.5 rounded-lg hover:bg-white/60 text-gray-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors
          ${isToday(date) ? 'bg-teal-50/60 text-teal-700' : 'bg-white/40 text-gray-600 hover:bg-white/60'}`}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        <span className="text-sm font-medium">{formatDate(date)}</span>
        {isToday(date) && <span className="text-[10px] text-teal-500 font-medium">今天</span>}
      </button>

      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        className="p-1.5 rounded-lg hover:bg-white/60 text-gray-500 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {!isToday(date) && (
        <button
          type="button"
          onClick={() => onChange(new Date().toISOString().split('T')[0])}
          className="px-2 py-1 rounded-lg bg-teal-50/60 text-teal-600 text-xs font-medium hover:bg-teal-100/60 transition-colors"
        >
          回到今天
        </button>
      )}

      {showCalendar && (
        <CalendarPopup
          selectedDate={date}
          onSelect={onChange}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
