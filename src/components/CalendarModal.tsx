import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
}

export const CalendarModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    if (!isOpen) return null;

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    const daysArr = [];
    const firstDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to Monday start
    const totalDays = daysInMonth(year, month);

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
        daysArr.push(null);
    }
    // Days of month
    for (let d = 1; d <= totalDays; d++) {
        daysArr.push(d);
    }

    const handleDateClick = (day: number) => {
        onSelect(new Date(year, month, day));
        onClose();
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in">
            <div className="glass-panel w-full max-w-[340px] p-6 shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 text-[var(--text-main)]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-[var(--glass-item-bg)] rounded-lg text-[var(--text-muted)]">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold uppercase tracking-widest min-w-[100px] text-center">
                            {monthNames[month]} {year}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-[var(--glass-item-bg)] rounded-lg text-[var(--text-muted)]">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
                        <div key={d} className="text-[10px] font-black text-[var(--text-muted)] uppercase text-center py-2">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {daysArr.map((day, i) => (
                        <div key={i} className="aspect-square flex items-center justify-center">
                            {day ? (
                                <button
                                    onClick={() => handleDateClick(day)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all duration-300
                    ${isToday(day)
                                            ? "bg-[var(--primary-color)] text-white font-bold shadow-lg shadow-[var(--primary-color)]/30"
                                            : "hover:bg-[var(--glass-item-active)] text-[var(--text-main)]"
                                        }
                  `}
                                >
                                    {day}
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold uppercase text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};
