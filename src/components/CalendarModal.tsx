import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction } from "../types";
import { safeParseDate } from "../hooks/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    transactions?: Transaction[];
}

export const CalendarModal: React.FC<Props> = ({ isOpen, onClose, onSelect, transactions = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (isOpen) {
            setCurrentDate(new Date());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(d => {
        const y = d.getFullYear();
        const m = d.getMonth();
        return m === 0 ? new Date(y - 1, 11, 1) : new Date(y, m - 1, 1);
    });

    const nextMonth = () => setCurrentDate(d => {
        const y = d.getFullYear();
        const m = d.getMonth();
        return m === 11 ? new Date(y + 1, 0, 1) : new Date(y, m + 1, 1);
    });

    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    const daysArr = [];
    let firstDay = 0;
    let totalDays = 30;

    try {
        firstDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to Monday start
        totalDays = daysInMonth(year, month);
    } catch (e) {
        console.error("Error calculating calendar dates:", e);
    }

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
        daysArr.push(null);
    }
    // Days of month
    for (let d = 1; d <= totalDays; d++) {
        daysArr.push(d);
    }

    const handleDateClick = (day: number) => {
        try {
            onSelect(new Date(year, month, day));
            onClose();
        } catch (e) {
            console.error("Error selecting date:", e);
        }
    };

    const isToday = (day: number) => {
        try {
            const today = new Date();
            return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        } catch {
            return false;
        }
    };

    const getDayInfo = (day: number) => {
        try {
            if (!transactions || !Array.isArray(transactions) || !transactions.length) return null;
            
            const dayTx = transactions.filter(t => {
                if (!t || !t.date) return false;
                const d = safeParseDate(t.date);
                if (isNaN(d.getTime())) return false;
                return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
            });

            if (dayTx.length === 0) return null;

            return {
                hasIncome: dayTx.some(t => t && t.type === "income"),
                hasExpense: dayTx.some(t => t && t.type === "expense"),
                hasTransfer: dayTx.some(t => t && t.type === "transfer")
            };
        } catch (err) {
            console.error("Error in getDayInfo:", err);
            return null;
        }
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
                    {daysArr.map((day, i) => {
                        const info = day ? getDayInfo(day) : null;
                        const today = isToday(day || 0);
                        
                        return (
                            <div key={i} className="aspect-square flex flex-col items-center justify-center">
                                {day ? (
                                    <button
                                        onClick={() => handleDateClick(day)}
                                        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-300 relative
                                            ${today
                                                ? "bg-[var(--primary-color)] text-white font-bold shadow-lg shadow-[var(--primary-color)]/30"
                                                : "hover:bg-[var(--glass-item-active)] text-[var(--text-main)]"
                                            }
                                        `}
                                    >
                                        <span>{day}</span>
                                        {info && (
                                            <div className="absolute bottom-1.5 flex gap-0.5">
                                                {info.hasIncome && <div className={`w-0.5 h-0.5 rounded-full ${today ? 'bg-white' : 'bg-[var(--success-color)]'}`} />}
                                                {info.hasExpense && <div className={`w-0.5 h-0.5 rounded-full ${today ? 'bg-white/70' : 'bg-[#D4AF37]'}`} />}
                                                {info.hasTransfer && <div className={`w-0.5 h-0.5 rounded-full ${today ? 'bg-white/50' : 'bg-indigo-400'}`} />}
                                            </div>
                                        )}
                                    </button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};

