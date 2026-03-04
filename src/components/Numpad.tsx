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
  }, [isCommentOpen]);

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
            <button onClick={onRemove} className="p-2 text-[var(--danger-color)] hover:text-[var(--danger-color)] transition-colors opacity-80 hover:opacity-100">
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
        <button onClick={() => onSubmit()} disabled={data.amount === "0"} className="p-2 text-[var(--success-color)] hover:text-[var(--text-main)] transition-colors"><Check size={26} /></button>
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
            {(() => {
              const fromCur = (data.source as any)?.currency || "USD";
              const toCur = data.type === "expense" ? "USD" : ((data.destination as any)?.currency || "USD");
              if (fromCur !== toCur) {
                const rates = RatesService.getCachedRates() || { USD: 1 };
                return (
                  <div className="text-[8px] text-[var(--text-muted)] font-bold whitespace-nowrap mt-1 flex flex-col items-center opacity-80">
                    {fromCur !== "USD" && <span>1 USD = {rates[fromCur]?.toFixed(2) || '?'} {fromCur}</span>}
                    {toCur !== "USD" && <span>1 USD = {rates[toCur]?.toFixed(2) || '?'} {toCur}</span>}
                  </div>
                );
              }
              return null;
            })()}
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

      {/* Tags + Comment bar */}
      {data.type === 'expense' && data.destination && (
        <div className="flex items-center px-4 py-3 gap-3 bg-[var(--glass-bg)] shrink-0 border-t border-[var(--glass-border)]">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {(data.destination as Category).tags.map(t => (
              <button
                key={t}
                onClick={() => handleTagClick(t)}
                className={`px-4 py-1.5 rounded-full uppercase text-[10px] font-black whitespace-nowrap transition-all duration-200 ${data.tag === t
                  ? "bg-[var(--success-color)] text-white scale-105"
                  : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] border border-[var(--glass-border)] hover:bg-[var(--glass-item-active)]"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCommentOpen(true)}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${hasComment
              ? "bg-[var(--primary-color)]/20 text-[var(--primary-color)]"
              : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      )}

      <div className="bg-[var(--numpad-bg)] flex flex-col border-t border-[var(--glass-border)]">
        <div className="flex gap-2 p-3 bg-[var(--numpad-bg)]">
          {/* Numeric Block */}
          <div className="flex-[3] grid grid-cols-3 gap-[1px] bg-[var(--glass-border)] rounded-2xl overflow-hidden border border-[var(--glass-border)] shadow-sm">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => onPress(num.toString())} className="h-16 flex items-center justify-center text-3xl font-light text-[var(--text-main)] bg-[var(--bg-color)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]">{num}</button>
            ))}
            <button onClick={() => onPress(".")} className="h-16 flex items-center justify-center text-3xl font-light text-[var(--text-main)] bg-[var(--bg-color)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]">,</button>
            <button onClick={() => onPress("0")} className="h-16 flex items-center justify-center text-3xl font-light text-[var(--text-main)] bg-[var(--bg-color)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]">0</button>
            <button onClick={onDelete} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-color)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><Delete size={26} /></button>
          </div>

          {/* Operators Block */}
          <div className="flex-[2] grid grid-cols-2 gap-[1px] bg-[var(--glass-border)] rounded-2xl overflow-hidden border border-[var(--glass-border)] shadow-sm">
            <button onClick={() => onPress("C")} className="h-16 flex items-center justify-center text-xl font-black text-[#D4AF37] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]">C</button>
            <button onClick={() => onPress("/")} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><Divide size={22} /></button>
            <button onClick={() => onPress("*")} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><X size={22} /></button>
            <button onClick={() => onPress("-")} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><Minus size={22} /></button>
            <button onClick={() => onPress("+")} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><Plus size={22} /></button>
            <button onClick={() => onPress("%")} className="h-16 flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-card-bg)] hover:bg-[var(--glass-item-bg)] transition-colors active:bg-[var(--glass-item-active)]"><Percent size={20} /></button>
            <button onClick={() => onPress("=")} className="h-16 col-span-2 flex items-center justify-center text-[var(--text-main)] bg-[var(--primary-color)]/20 hover:bg-[var(--primary-color)]/30 transition-colors active:bg-[var(--primary-color)]/40"><Equal size={24} /></button>
          </div>
        </div>
        <div className="px-4 pb-8 pt-4 bg-[var(--bg-color)]">
          <div className="flex h-14 bg-[var(--glass-item-bg)] rounded-full p-1.5 border border-[var(--glass-border)] shadow-2xl shadow-[var(--shadow-color)] mx-auto w-full max-w-[360px] gap-1">
            {isEditing ? (
              <button
                onClick={() => onSubmit()}
                className="flex-1 rounded-full text-sm font-black uppercase text-white bg-[var(--primary-color)] shadow-lg shadow-[var(--primary-color)]/20 transition-all"
              >
                ✓ Сохранить изменения
              </button>
            ) : (
              <>
                <button
                  onClick={handleYesterday}
                  className="flex-[1] rounded-full text-[10px] font-bold uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] transition-colors"
                >
                  Вчера
                </button>
                <button
                  onClick={() => onSubmit()}
                  className="flex-[2] rounded-full text-[11px] font-black uppercase text-white bg-[var(--success-color)] shadow-lg shadow-[var(--success-color)]/20 scale-[1.02] active:scale-[0.98] transition-all tracking-wider"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex-[1] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] transition-colors relative"
                >
                  <CalendarDays size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={handleDateSelect}
      />

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
