import React from "react";
import { X, Trash2, Wallet, AlertCircle } from "lucide-react";
import { Account } from "../types";
import { COLORS, ACCOUNT_ICONS, IconMap } from "../constants";

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSave: (name: string, balance: number, currency: string, icon: string, color: string) => void;
  onDelete: () => void;
}

const CURRENCIES = ["USD", "RUB", "BRL", "EUR", "ARS"];

export const AccountModal: React.FC<Props> = ({ isOpen, account, onClose, onSave, onDelete }) => {
  const [name, setName] = React.useState("");
  const [balance, setBalance] = React.useState("0");
  const [currency, setCurrency] = React.useState("USD");
  const [icon, setIcon] = React.useState("wallet");
  const [color, setColor] = React.useState("var(--primary-color)");
  const [showCurrencyInfo, setShowCurrencyInfo] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(account?.name || "");
      setBalance(account?.balance.toString() || "0");
      setCurrency(account?.currency || "USD");
      setIcon(account?.icon || "wallet");
      setColor(account?.color || "var(--primary-color)");
      setShowCurrencyInfo(false);
    }
  }, [isOpen, account]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={onClose}>
      <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-300 text-[var(--text-main)] text-left overflow-y-auto max-h-[90vh] hide-scrollbar relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center text-[var(--text-main)]">
          <h3 className="text-lg font-bold uppercase text-[var(--text-main)]">{account ? "Изменить кошелек" : "Новый кошелек"}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-main)]"><X size={24} /></button>
        </div>

        {/* Custom Currency Info Popup */}
        {showCurrencyInfo && (
          <>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[205] rounded-3xl" onClick={() => setShowCurrencyInfo(false)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-[var(--panel-bg)] border border-[var(--primary-color)]/30 rounded-2xl p-5 z-[210] shadow-2xl animate-in fade-in zoom-in-90 duration-200">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary-color)]/10 flex items-center justify-center text-[var(--primary-color)]">
                    <AlertCircle size={18} />
                  </div>
                  <button onClick={() => setShowCurrencyInfo(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={16} /></button>
                </div>
                <p className="text-xs leading-relaxed font-medium text-[var(--text-main)]">
                  Можно любую валюту, для которой есть трёхбуквенный международный код
                </p>
                <button 
                  onClick={() => setShowCurrencyInfo(false)}
                  className="mt-1 py-2 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                >
                  Понятно
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-4 text-[var(--text-main)]">
          <div className="flex flex-col gap-1.5 text-[var(--text-main)] relative">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Напр. Личный"
              className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] w-full focus:border-[var(--primary-color)]/50"
            />
            {!name.trim() && (
              <span className="text-[9px] text-[var(--primary-color)] font-medium mt-1 ml-1 animate-pulse">
                Назовите кошелек. Позже сможете редактировать долгим нажатием на иконку
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-[var(--text-main)]">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Баланс</label>
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-[var(--text-main)]">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Валюта</label>
                <button 
                  type="button"
                  onClick={() => setShowCurrencyInfo(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors"
                >
                  <AlertCircle size={10} />
                </button>
              </div>
              <input
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value.toUpperCase())}
                className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] w-full font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {CURRENCIES.map(curr => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all duration-300 ${currency === curr ? "bg-[var(--text-main)] text-[var(--bg-color)] border-[var(--text-main)]" : "bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)]"}`}
              >
                {curr}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-left text-[var(--text-main)]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Иконка</label>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 text-[var(--text-main)] text-left">
              {ACCOUNT_ICONS.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${icon === i ? "border-[var(--primary-color)] bg-[var(--primary-color)]/10" : "border-[var(--glass-border)]"}`}
                >
                  {React.createElement(IconMap[i] || Wallet, { size: 20 })}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-left text-[var(--text-main)]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase text-left text-[var(--text-main)]">Цвет</label>
            <div className="flex justify-between text-[var(--text-main)]">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${color === c ? "border-[var(--text-main)] scale-110" : "border-transparent opacity-50"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4 items-center text-left text-[var(--text-main)]">
          {account && (
            <button onClick={onDelete} className="w-12 h-12 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--danger-color)] flex items-center justify-center text-left">
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={() => onSave(name, parseFloat(balance), currency, icon, color)}
            disabled={!name.trim()}
            className="flex-1 h-14 rounded-2xl bg-[var(--primary-color)] text-white font-bold shadow-lg shadow-[var(--primary-color)]/20 uppercase text-center disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all"
          >
            СОХРАНИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};
