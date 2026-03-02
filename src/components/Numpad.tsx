import React from "react";
import { X, ChevronRight, Check, MessageCircle, CalendarDays, Delete } from "lucide-react";
import { NumpadData, Category } from "../types";
import { IconMap } from "../constants";

interface Props {
  data: NumpadData;
  onClose: () => void;
  onPress: (val: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onTagSelect: (tag: string) => void;
}

export const Numpad: React.FC<Props> = ({ data, onClose, onPress, onDelete, onSubmit, onTagSelect }) => {
  if (!data.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#050505] animate-in slide-in-from-bottom-full duration-300">
      <div className="flex justify-between items-center px-4 py-4 bg-[#121212] border-b border-white/5 text-left text-white">
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-left text-white">
          <span className="text-slate-500 uppercase">{data.source?.name}</span>
          <ChevronRight size={16} className={data.type === 'expense' ? "text-[#f43f5e]" : "text-[#10b981]"} />
          <div className="flex flex-col items-center">
            <span className="text-white uppercase">{data.destination?.name}</span>
            {data.tag && <span className="text-[9px] text-[#10b981] font-black uppercase mt-1">{data.tag}</span>}
          </div>
        </div>
        <button onClick={onSubmit} disabled={data.amount === "0"} className="p-2 text-[#10b981] hover:text-white"><Check size={26} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full flex items-center gap-3">
          <div className={`flex-1 h-36 rounded-[24px] border flex flex-col items-end justify-center p-6 relative ${data.type === 'expense' ? 'bg-[#f43f5e]/10 border-[#f43f5e]/20' : 'bg-[#10b981]/10 border-[#10b981]/20'}`}>
            <span className="text-4xl sm:text-5xl font-light text-white tracking-tighter text-right overflow-hidden">{data.amount}</span>
            <span className={`text-xs font-bold mt-2 absolute bottom-5 right-6 uppercase ${data.type === 'expense' ? 'text-[#f43f5e]' : 'text-[#10b981]'}`}>USD</span>
          </div>
          <ChevronRight size={24} className="text-slate-500" />
          <div className="flex-1 h-36 rounded-[24px] bg-white/[0.02] border border-white/5 flex flex-col items-end justify-center p-6 relative">
            <span className="text-4xl sm:text-5xl font-light text-slate-500 tracking-tighter text-right overflow-hidden">{data.amount}</span>
            <span className="text-xs font-bold text-slate-500 mt-2 absolute bottom-5 right-6 uppercase">BRL</span>
          </div>
        </div>
      </div>

      {data.type === 'expense' && data.destination && (
        <div className="flex items-center px-4 py-3 gap-3 bg-[#111] shrink-0 border-t border-white/5 overflow-x-auto hide-scrollbar">
          {(data.destination as Category).tags.map(t => (
            <button 
              key={t} 
              onClick={() => onTagSelect(t)} 
              className={`px-4 py-1.5 rounded-full uppercase text-[10px] font-black whitespace-nowrap ${data.tag === t ? "bg-[#10b981] text-white" : "bg-white/5 text-slate-500"}`}
            >
              {t}
            </button>
          ))}
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
            {Array(8).fill(0).map((_, i) => <button key={i} className="h-[72px] flex items-center justify-center text-slate-500 hover:bg-white/5"><MessageCircle size={22} /></button>)}
          </div>
        </div>
        <div className={`flex h-14 ${data.type === 'expense' ? 'bg-[#f43f5e]' : 'bg-[#10b981]'}`}>
          <button className="flex-1 text-white text-xs font-bold uppercase">Вчера</button>
          <button onClick={onSubmit} className="flex-1 text-white text-xs font-bold uppercase bg-black/10">Сегодня</button>
          <button className="w-[72px] flex items-center justify-center text-white border-l border-white/10"><CalendarDays size={20} /></button>
        </div>
      </div>
    </div>
  );
};
