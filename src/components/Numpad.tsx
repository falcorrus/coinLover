import React from "react";
import { X, ChevronRight, Check, CalendarDays, Delete, Divide, Plus, Minus, Equal, Percent, MessageSquare, Link2, Trash2 } from "lucide-react";
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
    // Toggle: clicking the active tag deselects it
    onTagSelect(data.tag === t ? null : t);
  };

  const handleCommentSave = () => {
    onCommentChange(commentDraft.trim());
    setIsCommentOpen(false);
  };

  const hasComment = data.comment.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#050505] animate-in slide-in-from-right duration-500 ease-in-out">
      <div className="flex justify-between items-center px-4 py-4 bg-[#121212] border-b border-white/5 text-left text-white">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
          {isEditing && onRemove && (
            <button onClick={onRemove} className="p-2 text-rose-500 hover:text-rose-400 transition-colors">
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-left text-white">
          <span className="text-slate-500 uppercase">{data.source?.name}</span>
          <ChevronRight size={16} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[#10b981]"} />
          <div className="flex flex-col items-center">
            <span className="text-white uppercase">{data.destination?.name}</span>
            {data.tag && <span className="text-[9px] text-[#10b981] font-black uppercase mt-1">{data.tag}</span>}
          </div>
        </div>
        <button onClick={() => onSubmit()} disabled={data.amount === "0"} className="p-2 text-[#10b981] hover:text-white"><Check size={26} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full flex items-center gap-3">
          <div
            onClick={() => onFieldChange("source")}
            className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative transition-all duration-300 ${data.activeField === "source"
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[#10b981]/20 border-[#10b981] ring-1 ring-[#10b981]/50')
              : 'bg-white/[0.02] border-white/5 opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "source" ? "text-white" : "text-slate-500"}`}>{data.amount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              <span className={`text-[10px] font-black uppercase ${data.activeField === "source" ? (data.type === 'expense' ? 'text-[#D4AF37]' : 'text-[#10b981]') : 'text-slate-500'}`}>
                {(data.source as any)?.currency || (data.destination as any)?.currency || "USD"}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase opacity-40">ОТКУДА</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1">
            {data.targetLinked
              ? <Link2 size={18} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[#10b981]"} />
              : <ChevronRight size={18} className="text-slate-600" />
            }
            {(() => {
              const fromCur = (data.source as any)?.currency || "USD";
              const toCur = (data.destination as any)?.currency || "USD";
              if (fromCur !== toCur) {
                const rates = RatesService.getCachedRates() || { USD: 1 };
                return (
                  <div className="text-[8px] text-slate-500 font-bold whitespace-nowrap mt-1 flex flex-col items-center opacity-80">
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
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[#10b981]/20 border-[#10b981] ring-1 ring-[#10b981]/50')
              : 'bg-white/[0.02] border-white/5 opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "destination" ? "text-white" : "text-slate-500"}`}>{data.targetAmount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              <span className={`text-[10px] font-black uppercase ${data.activeField === "destination" ? (data.type === 'expense' ? 'text-[#D4AF37]' : 'text-[#10b981]') : 'text-slate-500'}`}>
                {(data.destination as any)?.currency || (data.source as any)?.currency || "USD"}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase opacity-40">КУДА</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags + Comment bar */}
      {data.type === 'expense' && data.destination && (
        <div className="flex items-center px-4 py-3 gap-3 bg-[#111] shrink-0 border-t border-white/5">
          {/* Tags scrollable area */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {(data.destination as Category).tags.map(t => (
              <button
                key={t}
                onClick={() => handleTagClick(t)}
                className={`px-4 py-1.5 rounded-full uppercase text-[10px] font-black whitespace-nowrap transition-all duration-200 ${data.tag === t
                  ? "bg-[#10b981] text-white scale-105"
                  : "bg-white/5 text-slate-500 hover:bg-white/10"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Comment icon button */}
          <button
            onClick={() => setIsCommentOpen(true)}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${hasComment
              ? "bg-[#6d5dfc]/20 text-[#6d5dfc]"
              : "bg-white/5 text-slate-500 hover:text-white"
              }`}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      )}

      <div className="bg-[#1e1e1e] flex flex-col">
        <div className="grid grid-cols-[3fr_2fr]">
          <div className="grid grid-cols-3 bg-[#2a2a2a] gap-[1px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => onPress(num.toString())} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5">{num}</button>
            ))}
            <button onClick={() => onPress(".")} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5">,</button>
            <button onClick={() => onPress("0")} className="h-[72px] flex items-center justify-center text-[32px] font-light text-white hover:bg-white/5">0</button>
            <button onClick={onDelete} className="h-[72px] flex items-center justify-center text-slate-500"><Delete size={26} /></button>
          </div>
          <div className="grid grid-cols-2 bg-[#333] gap-[1px]">
            <button onClick={() => onPress("C")} className="h-[72px] flex items-center justify-center text-[20px] font-bold text-[#D4AF37] hover:bg-white/5">C</button>
            <button onClick={() => onPress("/")} className="h-[72px] flex items-center justify-center text-slate-400 hover:bg-white/5"><Divide size={22} /></button>
            <button onClick={() => onPress("*")} className="h-[72px] flex items-center justify-center text-slate-400 hover:bg-white/5"><X size={22} /></button>
            <button onClick={() => onPress("-")} className="h-[72px] flex items-center justify-center text-slate-400 hover:bg-white/5"><Minus size={22} /></button>
            <button onClick={() => onPress("+")} className="h-[72px] flex items-center justify-center text-slate-400 hover:bg-white/5"><Plus size={22} /></button>
            <button onClick={() => onPress("%")} className="h-[72px] flex items-center justify-center text-slate-400 hover:bg-white/5"><Percent size={20} /></button>
            <button onClick={() => onPress("=")} className="h-[72px] col-span-2 flex items-center justify-center text-white bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20"><Equal size={24} /></button>
          </div>
        </div>
        <div className="px-4 pb-8 pt-4 bg-[#1e1e1e]">
          <div className="flex h-14 bg-[#050505] rounded-full p-1.5 border border-white/5 shadow-2xl mx-auto w-full max-w-[360px] gap-1">
            {isEditing ? (
              <button
                onClick={() => onSubmit()}
                className="flex-1 rounded-full text-sm font-black uppercase text-white bg-[#6d5dfc] shadow-lg"
              >
                ✓ Сохранить изменения
              </button>
            ) : (
              <>
                <button
                  onClick={handleYesterday}
                  className="flex-[1] rounded-full text-[10px] font-bold uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Вчера
                </button>
                <button
                  onClick={() => onSubmit()}
                  className="flex-[2] rounded-full text-[11px] font-black uppercase text-white bg-[#10b981] shadow-[0_4px_20px_rgba(16,185,129,0.3)] scale-[1.02] active:scale-[0.98] transition-all tracking-wider"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="flex-[1] rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative"
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

      {/* Comment Modal */}
      {isCommentOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-t-3xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#6d5dfc]" />
                <h3 className="text-sm font-bold uppercase">Комментарий</h3>
              </div>
              <button onClick={() => setIsCommentOpen(false)} className="p-1 text-slate-500"><X size={20} /></button>
            </div>

            <textarea
              autoFocus
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              placeholder="Заметка к транзакции..."
              rows={3}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white resize-none text-sm focus:border-[#6d5dfc]/50"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setCommentDraft(""); onCommentChange(""); setIsCommentOpen(false); }}
                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-bold text-sm"
              >
                ОЧИСТИТЬ
              </button>
              <button
                onClick={handleCommentSave}
                className="flex-1 h-12 rounded-xl bg-[#6d5dfc] text-white font-bold shadow-lg text-sm"
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
