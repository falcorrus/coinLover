import React from "react";
import { DollarSign, Euro } from "lucide-react";

interface Props {
  isOpen: boolean;
  onSelect: (currency: "USD" | "EUR") => void;
}

export const CurrencySetupModal: React.FC<Props> = ({ isOpen, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      <div className="relative w-full max-w-sm bg-[#121212] border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
          <DollarSign size={40} className="text-amber-500" />
        </div>
        
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Выберите валюту</h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Выберите базовую валюту для вашего пространства. Все итоги и аналитика будут отображаться в этой валюте.
          <br/>
          <span className="text-rose-500 font-bold mt-2 block italic text-[10px] uppercase tracking-widest">Действие нельзя будет отменить</span>
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button 
            onClick={() => onSelect("USD")}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-2xl font-black text-white group-hover:text-amber-500">$</span>
            </div>
            <span className="font-black uppercase tracking-widest text-xs">USD</span>
          </button>

          <button 
            onClick={() => onSelect("EUR")}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <span className="text-2xl font-black text-white group-hover:text-blue-500">€</span>
            </div>
            <span className="font-black uppercase tracking-widest text-xs">EUR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
