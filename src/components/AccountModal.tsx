import React from "react";
import { X, Trash2, Wallet } from "lucide-react";
import { Account } from "../types";
import { COLORS, ACCOUNT_ICONS, IconMap } from "../constants";

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSave: (name: string, balance: number, icon: string, color: string) => void;
  onDelete: () => void;
}

export const AccountModal: React.FC<Props> = ({ isOpen, account, onClose, onSave, onDelete }) => {
  const [name, setName] = React.useState("");
  const [balance, setBalance] = React.useState("0");
  const [icon, setIcon] = React.useState("wallet");
  const [color, setColor] = React.useState("#6d5dfc");

  React.useEffect(() => {
    if (isOpen) {
      setName(account?.name || "");
      setBalance(account?.balance.toString() || "0");
      setIcon(account?.icon || "wallet");
      setColor(account?.color || "#6d5dfc");
    }
  }, [isOpen, account]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
      <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 text-white text-left">
        <div className="flex justify-between items-center text-white">
          <h3 className="text-lg font-bold uppercase text-white">{account ? "Edit Wallet" : "New Wallet"}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-white"><X size={24} /></button>
        </div>
        <div className="flex flex-col gap-4 text-white">
          <div className="flex flex-col gap-1.5 text-white">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white w-full" />
          </div>
          <div className="flex flex-col gap-1.5 text-white">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Balance</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white w-full" />
          </div>
          <div className="flex flex-col gap-2 text-left text-white">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Icon</label>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 text-white text-left">
              {ACCOUNT_ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${icon === i ? "border-[#6d5dfc] bg-[#6d5dfc]/10" : "border-white/5"}`}>
                  {React.createElement(IconMap[i] || Wallet, { size: 20 })}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-left text-white">
            <label className="text-[10px] font-bold text-slate-500 uppercase text-left text-white">Color</label>
            <div className="flex justify-between text-white">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent opacity-50"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 items-center text-left text-white">
          {account && (
            <button onClick={onDelete} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-[#f43f5e] flex items-center justify-center text-left">
              <Trash2 size={20} />
            </button>
          )}
          <button onClick={() => onSave(name, parseFloat(balance), icon, color)} className="flex-1 h-14 rounded-2xl bg-[#6d5dfc] text-white font-bold shadow-lg uppercase text-center">SAVE</button>
        </div>
      </div>
    </div>
  );
};
