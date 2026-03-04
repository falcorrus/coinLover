import React from "react";
import { X, ChevronRight, Check, CalendarDays, Delete, Divide, Plus, Minus, Equal, Percent, MessageSquare, Link2, Trash2, ArrowDown } from "lucide-react";
import { NumpadData, Category } from "../types";
import { IconMap } from "../constants";
import { CalendarModal } from "./CalendarModal";
import { RatesService } from "../services/RatesService";

interface Props {
  data: NumpadData;
  onClose: () => void;
  onFieldChange: (field: "source" | "destination") => void;
  onPress: (val: string) => void;
  onDelete: () => void;
  onSubmit: (date?: string) => void;
  onTagSelect: (tag: string | null) => void;
  onCommentChange: (comment: string) => void;
  onRemove?: () => void;
  isEditing?: boolean;
}

export const Numpad: React.FC<Props> = ({ data, onClose, onFieldChange, onPress, onDelete, onSubmit, onTagSelect, onCommentChange, onRemove, isEditing }) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isCommentOpen, setIsCommentOpen] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState("");

  React.useEffect(() => {
    if (isCommentOpen) setCommentDraft(data.comment);
  }, [isCommentOpen, data.comment]);

  if (!data.isOpen) return null;

  const handleYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    onSubmit(date.toISOString());
  };

  const handleDateSelect = (selectedDate: Date) => {
    onSubmit(selectedDate.toISOString());
    setIsCalendarOpen(false);
  };

  const handleTagClick = (t: string) => {
    onTagSelect(data.tag === t ? null : t);
  };

  const handleCommentSave = () => {
    onCommentChange(commentDraft.trim());
    setIsCommentOpen(false);
  };

  const hasComment = data.comment.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[var(--bg-color)] animate-in slide-in-from-right duration-500 ease-in-out">
      <div className="flex justify-between items-center px-4 py-4 bg-[var(--glass-bg)] border-b border-[var(--glass-border)] text-left text-[var(--text-main)]">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={24} /></button>
          {isEditing && onRemove && (
            <button onClick={onRemove} className="p-2 text-[var(--danger-color)] hover:opacity-80 transition-colors">
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-left text-[var(--text-main)]">
          <span className="text-[var(--text-muted)] uppercase">{data.source?.name}</span>
          <ChevronRight size={16} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[var(--success-color)]"} />
          <div className="flex flex-col items-center">
            <span className="text-[var(--text-main)] uppercase">{data.destination?.name}</span>
            {data.tag && <span className="text-[9px] text-[var(--success-color)] font-black uppercase mt-1">{data.tag}</span>}
          </div>
        </div>
        <button onClick={() => onSubmit()} disabled={data.amount === "0"} className="p-2 text-[var(--success-color)] hover:opacity-80 transition-colors"><Check size={26} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full flex items-center gap-3">
          <div
            onClick={() => onFieldChange("source")}
            className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative transition-all duration-300 ${data.activeField === "source"
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[var(--success-color)]/20 border-[var(--success-color)] ring-1 ring-[var(--success-color)]/50')
              : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "source" ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}`}>{data.amount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              <span className={`text-[10px] font-black uppercase ${data.activeField === "source" ? (data.type === 'expense' ? 'text-[#D4AF37]' : 'text-[var(--success-color)]') : 'text-[var(--text-muted)]'}`}>
                {(data.source as any)?.currency || (data.destination as any)?.currency || "USD"}
              </span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase opacity-40">ОТКУДА</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1">
            {data.targetLinked
              ? <Link2 size={18} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[var(--success-color)]"} />
              : <ArrowDown size={18} className="text-[var(--text-muted)] opacity-60" />
            }
          </div>

          <div
            onClick={() => onFieldChange("destination")}
            className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative transition-all duration-300 ${data.activeField === "destination"
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[var(--success-color)]/20 border-[var(--success-color)] ring-1 ring-[var(--success-color)]/50')
              : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "destination" ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}`}>{data.targetAmount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              <span className={`text-[10px] font-black uppercase ${data.activeField === "destination" ? (data.type === 'expense' ? 'text-[#D4AF37]' : 'text-[var(--success-color)]') : 'text-[var(--text-muted)]'}`}>
                {data.type === "expense" ? "USD" : (data.destination as any)?.currency || (data.source as any)?.currency || "USD"}
              </span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase opacity-40">КУДА</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags + Comment bar - Visible for both Expense and Transfer */}
      <div className="flex items-center px-4 py-3 gap-3 bg-[var(--glass-bg)] shrink-0 border-t border-[var(--glass-border)] overflow-hidden">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {data.type === 'expense' && data.destination && (data.destination as Category).tags && (data.destination as Category).tags.map(t => (
            <button
              key={t}
              onClick={() => handleTagClick(t)}
              className={`px-4 py-1.5 rounded-full uppercase text-[10px] font-black whitespace-nowrap transition-all duration-200 ${data.tag === t
                ? "bg-[var(--success-color)] text-white scale-105 shadow-md shadow-[var(--success-color)]/20"
                : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)]"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Comment icon button - Now always visible */}
        <button
          onClick={() => setIsCommentOpen(true)}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${hasComment
            ? "bg-[var(--primary-color)]/20 text-[var(--primary-color)]"
            : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--glass-border)] shadow-sm"
            }`}
        >
          <MessageSquare size={18} />
        </button>
      </div>

      <div className="bg-[var(--numpad-bg)] p-4 pb-8 border-t border-[var(--glass-border)]">
        <div className="flex gap-3">
          {/* Numeric Block - 2/3 of width */}
          <div className="grid grid-cols-3 gap-2 flex-[2]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => onPress(num.toString())} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] rounded-xl transition-all active:scale-95">{num}</button>
            ))}
            <button onClick={() => onPress(".")} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] rounded-xl transition-all active:scale-95">,</button>
            <button onClick={() => onPress("0")} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] rounded-xl transition-all active:scale-95">0</button>
            <button onClick={onDelete} className="h-14 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--glass-item-bg)] rounded-xl transition-all active:scale-95">
              <Delete size={24} />
            </button>
          </div>

          {/* Operators Block - 1/3 of width (1/2 of numeric) */}
          <div className="flex-[1] bg-[var(--panel-bg)] rounded-2xl flex flex-col p-2 gap-2 shadow-inner">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <button onClick={() => onPress("C")} className="flex items-center justify-center text-xl font-bold text-[#D4AF37] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95">C</button>
              <button onClick={() => onPress("/")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95"><Divide size={20} /></button>
              <button onClick={() => onPress("*")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95"><X size={20} /></button>
              <button onClick={() => onPress("-")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95"><Minus size={20} /></button>
              <button onClick={() => onPress("+")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95"><Plus size={20} /></button>
              <button onClick={() => onPress("%")} className="flex items-center justify-center text-xl font-light text-[var(--text-muted)] hover:bg-[var(--bg-color)]/50 rounded-xl transition-all active:scale-95"><Percent size={18} /></button>
            </div>
            <button onClick={() => onPress("=")} className="h-12 w-full bg-[var(--btn-equals)] rounded-xl flex items-center justify-center text-2xl font-light text-[var(--text-main)] hover:brightness-95 transition-all active:scale-[0.98]">
              =
            </button>
          </div>
        </div>

        {/* Date Switcher */}
        <div className="mt-6 flex justify-center">
          {isEditing ? (
            <button
              onClick={() => onSubmit()}
              className="px-8 py-3 rounded-full text-sm font-black uppercase text-white bg-[var(--primary-color)] shadow-lg shadow-[var(--primary-color)]/20 transition-all active:scale-95 tracking-wider"
            >
              ✓ Сохранить изменения
            </button>
          ) : (
            <div className="flex items-center bg-[var(--panel-bg)] rounded-full p-1 shadow-sm border border-[var(--glass-border)]">
              <button 
                onClick={handleYesterday}
                className="px-6 py-2.5 text-xs font-bold tracking-wider text-[var(--text-muted)] rounded-full hover:bg-[var(--glass-item-bg)] transition-all uppercase"
              >
                Вчера
              </button>
              <button 
                onClick={() => onSubmit()}
                className="px-6 py-2.5 bg-[var(--success-color)] text-white text-xs font-bold tracking-wider rounded-full shadow-sm transition-all uppercase active:scale-95"
              >
                Сегодня
              </button>
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] rounded-full hover:bg-[var(--glass-item-bg)] transition-all ml-1"
              >
                <CalendarDays size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={handleDateSelect}
      />

      {/* Comment Modal */}
      {isCommentOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-t-3xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 shadow-2xl shadow-[var(--shadow-color)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[var(--primary-color)]" />
                <h3 className="text-sm font-bold uppercase text-[var(--text-main)]">Комментарий</h3>
              </div>
              <button onClick={() => setIsCommentOpen(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20} /></button>
            </div>

            <textarea
              autoFocus
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              placeholder="Заметка к транзакции..."
              rows={3}
              className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] resize-none text-sm focus:border-[var(--primary-color)]/50 transition-all"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setCommentDraft(""); onCommentChange(""); setIsCommentOpen(false); }}
                className="flex-1 h-12 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-muted)] font-bold text-sm hover:text-[var(--danger-color)] transition-colors"
              >
                ОЧИСТИТЬ
              </button>
              <button
                onClick={handleCommentSave}
                className="flex-1 h-12 rounded-xl bg-[var(--primary-color)] text-white font-bold shadow-lg shadow-[var(--primary-color)]/20 text-sm active:scale-95 transition-all"
              >
                СОХРАНИТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
