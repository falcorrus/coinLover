import React, { useState } from "react";
import { DollarSign, Check, ChevronRight, LayoutTemplate, SquareDashed, ArrowLeft } from "lucide-react";
import { RatesService } from "../services/RatesService";
import { APP_SETTINGS } from "../constants/settings";

interface Props {
  isOpen: boolean;
  onComplete: (currency: string, useTemplate: boolean) => void;
}

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP"];

export const OnboardingModal: React.FC<Props> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [useTemplate, setUseTemplate] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, selectedCurrency);
    // Force a sync of rates for the new base currency
    RatesService.syncRatesInBackground();
    onComplete(selectedCurrency, useTemplate);
  };

  return (
    <>
      <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md animate-in fade-in duration-300" />
      <div className="fixed inset-0 z-[501] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-[32px] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 slide-in-from-bottom-8">
          
          {step === 1 ? (
            <>
              <div className="p-8 text-center flex flex-col items-center gap-4 border-b border-[var(--glass-border)]/50 shrink-0 relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <DollarSign size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Добро пожаловать</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Выберите вашу основную валюту для ведения статистики и аналитики.
                  </p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-3">
                  {POPULAR_CURRENCIES.map(curr => (
                    <button
                      key={curr}
                      onClick={() => setSelectedCurrency(curr)}
                      className={`relative p-4 rounded-2xl border transition-all duration-200 flex items-center justify-center gap-2 ${
                        selectedCurrency === curr
                          ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-md shadow-amber-500/10"
                          : "border-[var(--glass-border)] hover:bg-[var(--glass-item-bg)] text-slate-400 hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="font-black text-lg tracking-wider">{curr}</span>
                      {selectedCurrency === curr && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 pt-2 shrink-0">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black uppercase tracking-widest text-sm transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span>Далее</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-8 text-center flex flex-col items-center gap-4 border-b border-[var(--glass-border)]/50 shrink-0 relative">
                <button 
                  onClick={() => setStep(1)}
                  className="absolute left-6 top-8 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors bg-[var(--glass-item-bg)] rounded-full"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mt-2">
                  <LayoutTemplate size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Наполнение</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Хотите ли вы начать с пустого листа или использовать готовый набор категорий?
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-4 flex-1">
                <button
                  onClick={() => setUseTemplate(true)}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-2 text-left ${
                    useTemplate
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-md shadow-emerald-500/10"
                      : "border-[var(--glass-border)] hover:bg-[var(--glass-item-bg)] text-slate-400 hover:text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutTemplate size={20} className={useTemplate ? "text-emerald-500" : "text-slate-500"} />
                    <span className="font-black tracking-wider">Использовать шаблон</span>
                  </div>
                  <p className={`text-xs ${useTemplate ? "text-emerald-500/80" : "text-slate-500"}`}>
                    Базовый набор: наличные, банковская карта, доходы, еда, жилье, развлечения.
                  </p>
                  {useTemplate && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setUseTemplate(false)}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-2 text-left ${
                    !useTemplate
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-md shadow-amber-500/10"
                      : "border-[var(--glass-border)] hover:bg-[var(--glass-item-bg)] text-slate-400 hover:text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <SquareDashed size={20} className={!useTemplate ? "text-amber-500" : "text-slate-500"} />
                    <span className="font-black tracking-wider">Пустая база</span>
                  </div>
                  <p className={`text-xs ${!useTemplate ? "text-amber-500/80" : "text-slate-500"}`}>
                    Только один кошелек (Наличные). Вы сами создадите все нужные категории.
                  </p>
                  {!useTemplate && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              </div>

              <div className="p-6 pt-2 shrink-0">
                <button
                  onClick={handleFinish}
                  className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-sm transition-colors shadow-lg flex items-center justify-center gap-2 ${
                    useTemplate ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20" : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
                  }`}
                >
                  <span>Начать работу</span>
                  <Check size={18} />
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
};
