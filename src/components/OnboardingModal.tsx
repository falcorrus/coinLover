import React, { useState, useMemo } from "react";
import { DollarSign, Check, ChevronRight, LayoutTemplate, SquareDashed, ArrowLeft, Coins, Info, Search, X } from "lucide-react";
import { RatesService } from "../services/RatesService";
import { APP_SETTINGS } from "../constants/settings";

interface Props {
  isOpen: boolean;
  onComplete: (baseCurrency: string, localCurrency: string, useTemplate: boolean) => void;
}

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP"];

// Standard ISO 4217 Currency Map (Top 50+)
const CURRENCY_MAP: Record<string, string> = {
  "USD": "США (Доллар)", "EUR": "Еврозона (Евро)", "GBP": "Великобритания (Фунт)",
  "RUB": "Россия (Рубль)", "RSD": "Сербия (Динар)", "BRL": "Бразилия (Реал)",
  "GEL": "Грузия (Лари)", "KZT": "Казахстан (Тенге)", "TRY": "Турция (Лира)",
  "AMD": "Армения (Драм)", "THB": "Таиланд (Бат)", "AED": "ОАЭ (Дирхам)",
  "CNY": "Китай (Юань)", "JPY": "Япония (Иена)", "BYN": "Беларусь (Рубль)",
  "IDR": "Индонезия (Рупия)", "VND": "Вьетнам (Донг)", "ILS": "Израиль (Шекель)",
  "UAH": "Украина (Гривна)", "ARS": "Аргентина (Песо)", "MXN": "Мексика (Песо)",
  "CAD": "Канада (Доллар)", "AUD": "Австралия (Доллар)", "CHF": "Швейцария (Франк)",
  "INR": "Индия (Рупия)", "KRW": "Южная Корея (Вона)", "SGD": "Сингапур (Доллар)",
  "NOK": "Норвегия (Крона)", "SEK": "Швеция (Крона)", "DKK": "Дания (Крона)",
  "PLN": "Польша (Злотый)", "CZK": "Чехия (Крона)", "HUF": "Венгрия (Форинт)",
  "RON": "Румыния (Лей)", "BGN": "Болгария (Лев)", "UZS": "Узбекистан (Сум)",
  "AZN": "Азербайджан (Манат)", "KGS": "Киргизия (Сом)", "TJS": "Таджикистан (Сомони)",
  "MNT": "Монголия (Тугрик)", "EGP": "Египет (Фунт)", "ZAR": "ЮАР (Рэнд)",
  "HKD": "Гонконг (Доллар)", "NZD": "Новая Зеландия (Доллар)", "PHP": "Филиппины (Песо)",
  "MYR": "Малайзия (Ринггит)", "MOP": "Макао (Патака)", "SAR": "Саудовская Аравия (Риал)",
  "QAR": "Катар (Риал)", "COP": "Колумбия (Песо)", "CLP": "Чили (Песо)",
  "PEN": "Перу (Соль)", "DOP": "Доминикана (Песо)", "CRC": "Коста-Рика (Колон)"
};

export const OnboardingModal: React.FC<Props> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [localCurrency, setLocalCurrency] = useState("RUB");
  const [useTemplate, setUseTemplate] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchSearchQuery] = useState("");

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toUpperCase();
    return Object.entries(CURRENCY_MAP).filter(([code, country]) => 
      code.includes(q) || country.toUpperCase().includes(q)
    );
  }, [searchQuery]);

  const currencyName = CURRENCY_MAP[localCurrency.toUpperCase()];
  const isValidCurrency = !!currencyName;

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem(APP_SETTINGS.STORAGE_KEYS.LAST_CURRENCY, selectedCurrency);
    RatesService.syncRatesInBackground();
    onComplete(selectedCurrency, localCurrency.toUpperCase(), useTemplate);
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
                    Выберите вашу <b>основную валюту</b> для ведения статистики и аналитики.
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
          ) : step === 2 ? (
            <div className="flex flex-col h-full overflow-hidden relative">
              {showInfo && (
                <div className="absolute inset-0 z-50 bg-[var(--bg-color)] animate-in slide-in-from-right duration-300 flex flex-col">
                  <div className="p-6 flex justify-between items-center border-b border-[var(--glass-border)]/50">
                    <h3 className="font-black uppercase text-xs tracking-widest text-slate-500">Доступные валюты</h3>
                    <button onClick={() => setShowInfo(false)} className="w-8 h-8 rounded-full bg-[var(--glass-item-bg)] flex items-center justify-center"><X size={16} /></button>
                  </div>
                  <div className="p-4 border-b border-[var(--glass-border)]/50 bg-black/10">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchSearchQuery(e.target.value)}
                        placeholder="Поиск по коду или стране..."
                        className="w-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-[var(--primary-color)] transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar p-2">
                    {filteredCurrencies.map(([code, name]) => (
                      <button 
                        key={code} 
                        onClick={() => { setLocalCurrency(code); setShowInfo(false); }}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--glass-item-bg)] transition-colors group"
                      >
                        <span className="font-black tracking-widest group-hover:text-blue-400 transition-colors">{code}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-8 text-center flex flex-col items-center gap-4 border-b border-[var(--glass-border)]/50 shrink-0 relative">
                <button 
                  onClick={() => setStep(1)}
                  className="absolute left-6 top-8 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors bg-[var(--glass-item-bg)] rounded-full"
                >
                  <ArrowLeft size={16} />
                </button>
                <button 
                  onClick={() => setShowInfo(true)}
                  className="absolute right-6 top-8 w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors bg-blue-500/5 rounded-full"
                >
                  <Info size={16} />
                </button>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mt-2">
                  <Coins size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Местная валюта</h2>
                  <p className="text-sm text-slate-400 leading-relaxed px-4">
                    Валюта для текущих расходов.
                  </p>
                </div>
              </div>

              <div className="p-8 flex flex-col gap-6 flex-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Код валюты (3 буквы)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={localCurrency}
                      onChange={(e) => setLocalCurrency(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="RUB"
                      className={`w-full bg-[var(--glass-item-bg)] border ${isValidCurrency ? 'border-blue-500/50 bg-blue-500/5' : 'border-[var(--glass-border)]'} rounded-2xl py-5 px-6 text-center text-3xl font-black tracking-[0.3em] text-[var(--text-main)] focus:border-blue-500 outline-none transition-all`}
                    />
                    {isValidCurrency && (
                      <div className="absolute -bottom-8 left-0 right-0 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">{currencyName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-2 shrink-0">
                <button
                  onClick={() => setStep(3)}
                  disabled={!isValidCurrency}
                  className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:grayscale text-white font-black uppercase tracking-widest text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <span>Далее</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-8 text-center flex flex-col items-center gap-4 border-b border-[var(--glass-border)]/50 shrink-0 relative">
                <button 
                  onClick={() => setStep(2)}
                  className="absolute left-6 top-8 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors bg-[var(--glass-item-bg)] rounded-full"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mt-2">
                  <LayoutTemplate size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Наполнение</h2>
                  <p className="text-sm text-slate-400 leading-relaxed px-4">
                    Начать с пустого листа или использовать готовый набор категорий?
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
                    <span className="font-black tracking-wider text-sm">Использовать шаблон</span>
                  </div>
                  <p className={`text-[10px] ${useTemplate ? "text-emerald-500/80" : "text-slate-500"}`}>
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
                    <span className="font-black tracking-wider text-sm">Пустая база</span>
                  </div>
                  <p className={`text-[10px] ${!useTemplate ? "text-amber-500/80" : "text-slate-500"}`}>
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
