import React from "react";
import { X, ChevronRight, Check, CalendarDays, Delete, Divide, Plus, Minus, Equal, Percent, MessageSquare, Link2, Trash2, ArrowDown } from "lucide-react";
import { NumpadData, Category, Account } from "../types";
import { IconMap } from "../constants";
import { CalendarModal } from "./CalendarModal";
import { RatesService } from "../services/RatesService";

interface Props {
  data: NumpadData;
  availableCurrencies: string[];
  onClose: () => void;
  onFieldChange: (field: "source" | "destination") => void;
  onCurrencyChange?: (field: "source" | "target", currency: string) => void;
  onPress: (val: string) => void;
  onDelete: () => void;
  onSubmit: (date?: string) => void;
  onTagSelect: (tag: string | null) => void;
  onCommentChange: (comment: string) => void;
  onLinkToggle?: () => void;
  onRemove?: () => void;
  onManageTags?: () => void;
  isEditing?: boolean;
}

export const Numpad: React.FC<Props> = ({ 
  data, availableCurrencies, onClose, onFieldChange, onCurrencyChange, 
  onPress, onDelete, onSubmit, onTagSelect, onCommentChange, onLinkToggle, onRemove, onManageTags, isEditing 
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isCommentOpen, setIsCommentOpen] = React.useState(false);
  const [currencyPicker, setCurrencyPicker] = React.useState<{ isOpen: boolean; field: "source" | "target" | null }>({ isOpen: false, field: null });
  const [commentDraft, setCommentDraft] = React.useState("");

  React.useEffect(() => { if (isCommentOpen) setCommentDraft(data.comment); }, [isCommentOpen, data.comment]);

  if (!data.isOpen) return null;

  const handleYesterday = () => { const date = new Date(); date.setDate(date.getDate() - 1); onSubmit(date.toISOString()); };
  const handleDateSelect = (selectedDate: Date) => { onSubmit(selectedDate.toISOString()); setIsCalendarOpen(false); };
  const handleTagClick = (t: string) => { onTagSelect(data.tag === t ? null : t); };
  const handleCommentSave = () => { onCommentChange(commentDraft.trim()); setIsCommentOpen(false); };
  const hasComment = data.comment.trim().length > 0;

  const getGridCols = () => {
    const count = availableCurrencies.length;
    if (count % 2 === 0 && count <= 8) {
      if (count === 2) return "grid-cols-1";
      if (count === 4) return "grid-cols-2";
      if (count === 6) return "grid-cols-3";
      if (count === 8) return "grid-cols-4";
    }
    return "grid-cols-3";
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[var(--bg-color)] animate-in slide-in-from-right duration-500 ease-in-out font-sans">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[var(--glass-bg)] border-b border-[var(--glass-border)] text-[var(--text-main)] shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button>
          {isEditing && onRemove && (<button onClick={onRemove} className="p-2 text-[var(--danger-color)]"><Trash2 size={20} /></button>)}
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span className="text-[var(--text-muted)] uppercase">{data.source?.name}</span>
          <ChevronRight size={16} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[var(--success-color)]"} />
          <div className="flex flex-col items-center">
            <span className="text-[var(--text-main)] uppercase">{data.destination?.name}</span>
            {data.tag && <span className="text-[9px] text-[var(--success-color)] font-black uppercase mt-1">{data.tag}</span>}
          </div>
        </div>
        <button onClick={() => onSubmit()} disabled={data.sourceAmount === "0"} className="p-2 text-[var(--success-color)]"><Check size={26} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-full flex items-center gap-3">
          {/* SOURCE FIELD (Left) */}
          <div
            onClick={() => onFieldChange("source")}
            className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative transition-all duration-300 ${data.activeField === "source"
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[var(--success-color)]/20 border-[var(--success-color)] ring-1 ring-[var(--success-color)]/50')
              : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "source" ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}`}>{data.sourceAmount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              {data.type === 'income' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrencyPicker({ isOpen: true, field: "source" }); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 active:scale-95 shadow-sm ${data.activeField === "source" ? 'bg-[var(--success-color)] text-white border-[var(--success-color)]' : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)]'}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider">{data.sourceCurrency}</span>
                  <ChevronRight size={12} className="opacity-60" />
                </button>
              ) : (
                <span className={`text-[11px] font-black uppercase px-1 py-0.5 ${data.activeField === "source" ? "text-[#D4AF37]" : "text-[var(--text-muted)]"}`}>{data.sourceCurrency}</span>
              )}
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase opacity-40 ml-1">ОТКУДА</span>
            </div>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onLinkToggle?.(); }} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${data.targetLinked ? 'bg-[var(--glass-item-bg)] border border-[var(--glass-border)] shadow-lg' : 'bg-transparent opacity-40'}`}>
            {data.targetLinked ? <Link2 size={20} className={data.type === 'expense' ? "text-[#D4AF37]" : "text-[var(--success-color)]"} /> : <ArrowDown size={20} className="text-[var(--text-muted)]" />}
          </button>

          {/* DESTINATION FIELD (Right) */}
          <div
            onClick={() => onFieldChange("destination")}
            className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative transition-all duration-300 ${data.activeField === "destination"
              ? (data.type === 'expense' ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'bg-[var(--success-color)]/20 border-[var(--success-color)] ring-1 ring-[var(--success-color)]/50')
              : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] opacity-50'}`}
          >
            <span className={`text-4xl sm:text-5xl font-light tracking-tighter text-right overflow-hidden ${data.activeField === "destination" ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}`}>{data.targetAmount}</span>
            <div className="flex items-center gap-1.5 absolute bottom-5 right-6">
              {data.type === 'expense' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrencyPicker({ isOpen: true, field: "target" }); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 active:scale-95 shadow-sm ${data.activeField === "destination" ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)]'}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider">{data.targetCurrency}</span>
                  <ChevronRight size={12} className="opacity-60" />
                </button>
              ) : (
                <span className={`text-[11px] font-black uppercase px-1 py-0.5 ${data.activeField === "destination" ? "text-[var(--success-color)]" : "text-[var(--text-muted)]"}`}>{data.targetCurrency}</span>
              )}
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase opacity-40 ml-1">КУДА</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar with Tags */}
      <div className="flex items-center px-4 py-3 gap-3 bg-[var(--glass-bg)] shrink-0 border-t border-[var(--glass-border)] overflow-hidden">
        <button 
          onClick={(e) => { e.stopPropagation(); onManageTags?.(); }}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] active:scale-90 transition-all"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {/* Tags for Expense */}
          {data.type === 'expense' && data.destination && (() => {
            const catTags = (data.destination as Category).tags || [];
            const allTags = data.tag && !catTags.includes(data.tag) ? [data.tag, ...catTags] : catTags;
            return allTags.map(t => (
              <button key={t} onClick={() => handleTagClick(t)} className={`px-4 py-1.5 rounded-lg uppercase text-[10px] font-black whitespace-nowrap transition-all duration-200 ${data.tag === t ? "bg-[var(--primary-color)] text-white scale-105" : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] border border-[var(--glass-border)]"}`}>{t}</button>
            ));
          })()}
          {/* Tags for Income */}
          {data.type === 'income' && data.source && (() => {
            const incTags = (data.source as IncomeSource).tags || [];
            const allTags = data.tag && !incTags.includes(data.tag) ? [data.tag, ...incTags] : incTags;
            return allTags.map(t => (
              <button key={t} onClick={() => handleTagClick(t)} className={`px-4 py-1.5 rounded-lg uppercase text-[10px] font-black whitespace-nowrap transition-all duration-200 ${data.tag === t ? "bg-[var(--success-color)] text-white scale-105" : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] border border-[var(--glass-border)]"}`}>{t}</button>
            ));
          })()}
        </div>
        <button onClick={() => setIsCommentOpen(true)} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${hasComment ? "bg-[var(--primary-color)]/20 text-[var(--primary-color)]" : "bg-[var(--glass-item-bg)] text-[var(--text-muted)] border border-[var(--glass-border)]"}`}><MessageSquare size={18} /></button>
      </div>

      {/* Numerical Pad */}
      <div className="bg-[var(--numpad-bg)] p-4 pb-8 border-t border-[var(--glass-border)] shrink-0">
        <div className="flex gap-3">
          <div className="grid grid-cols-3 gap-2 flex-[2]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (<button key={num} onClick={() => onPress(num.toString())} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] hover:bg-[var(--glass-item-bg)] rounded-xl active:scale-95 transition-all">{num}</button>))}
            <button onClick={() => onPress(".")} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] rounded-xl active:scale-95">,</button>
            <button onClick={() => onPress("0")} className="h-14 flex items-center justify-center text-3xl font-light text-[var(--text-main)] rounded-xl active:scale-95">0</button>
            <button onClick={onDelete} className="h-14 flex items-center justify-center text-[var(--text-muted)] rounded-xl active:scale-95"><Delete size={24} /></button>
          </div>
          <div className="flex-[1] bg-[var(--panel-bg)] rounded-2xl flex flex-col p-2 gap-2 shadow-inner">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <button onClick={() => onPress("C")} className="flex items-center justify-center text-xl font-bold text-[#D4AF37] rounded-xl active:scale-95">C</button>
              <button onClick={() => onPress("/")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] rounded-xl active:scale-95"><Divide size={20} /></button>
              <button onClick={() => onPress("*")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] rounded-xl active:scale-95"><X size={20} /></button>
              <button onClick={() => onPress("-")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] rounded-xl active:scale-95"><Minus size={20} /></button>
              <button onClick={() => onPress("+")} className="flex items-center justify-center text-2xl font-light text-[var(--text-muted)] rounded-xl active:scale-95"><Plus size={20} /></button>
              <button onClick={() => onPress("%")} className="flex items-center justify-center text-xl font-light text-[var(--text-muted)] rounded-xl active:scale-95"><Percent size={18} /></button>
            </div>
            <button onClick={() => onPress("=")} className="h-12 w-full bg-[var(--btn-equals)] rounded-xl flex items-center justify-center text-2xl font-light text-[var(--text-main)] active:scale-95">=</button>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          {isEditing ? (<button onClick={() => onSubmit()} className="px-8 py-3 rounded-2xl text-sm font-black uppercase text-white bg-[var(--primary-color)] shadow-lg active:scale-95 tracking-wider">✓ Сохранить</button>) : (
            <div className="flex items-center bg-[var(--panel-bg)] rounded-2xl p-1 border border-[var(--glass-border)]">
              <button onClick={handleYesterday} className="px-6 py-2.5 text-xs font-bold tracking-wider text-[var(--text-muted)] rounded-xl active:bg-[var(--glass-item-bg)] transition-all">Вчера</button>
              <button onClick={() => onSubmit()} className="px-6 py-2.5 bg-[var(--success-color)] text-white text-xs font-bold tracking-wider rounded-xl shadow-sm active:scale-95 transition-all">Сегодня</button>
              <button onClick={() => setIsCalendarOpen(true)} className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] rounded-xl ml-1"><CalendarDays size={20} /></button>
            </div>
          )}
        </div>
      </div>

      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelect={handleDateSelect} />

      {/* Currency Picker Modal */}
      {currencyPicker.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-end justify-center animate-in fade-in duration-300" onClick={() => setCurrencyPicker({ isOpen: false, field: null })}>
          <div className="w-full max-w-md bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-t-3xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold uppercase text-[var(--text-main)]">Выберите валюту</h3><button onClick={() => setCurrencyPicker({ isOpen: false, field: null })} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button></div>
            <div className={`grid ${getGridCols()} gap-2`}>
              {availableCurrencies.map(curr => (
                <button key={curr} onClick={() => { onCurrencyChange?.(currencyPicker.field!, curr); setCurrencyPicker({ isOpen: false, field: null }); }} className={`h-12 rounded-xl border font-bold text-sm transition-all ${(currencyPicker.field === "source" ? data.sourceCurrency : data.targetCurrency) === curr ? "bg-[#D4AF37] text-white border-[#D4AF37]" : "bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-item-active)]"}`}>{curr}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {isCommentOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-t-3xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 shadow-2xl shadow-[var(--shadow-color)]">
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><MessageSquare size={16} className="text-[var(--primary-color)]" /><h3 className="text-sm font-bold uppercase text-[var(--text-main)]">Комментарий</h3></div><button onClick={() => setIsCommentOpen(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button></div>
            <textarea autoFocus value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="Заметка..." rows={3} className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] resize-none text-sm focus:border-[var(--primary-color)]/50 transition-all" />
            <div className="flex gap-3"><button onClick={() => { setCommentDraft(""); onCommentChange(""); setIsCommentOpen(false); }} className="flex-1 h-12 rounded-xl bg-[var(--glass-item-bg)] text-[var(--text-muted)] font-bold text-sm">ОЧИСТИТЬ</button><button onClick={handleCommentSave} className="flex-1 h-12 rounded-xl bg-[var(--primary-color)] text-white font-bold shadow-lg text-sm active:scale-95 transition-all">СОХРАНИТЬ</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
