import React from "react";
import { X, Trash2, Briefcase } from "lucide-react";
import { IncomeSource } from "../types";
import { COLORS, INCOME_ICONS, IconMap } from "../constants";

interface Props {
    isOpen: boolean;
    income: IncomeSource | null;
    onClose: () => void;
    onSave: (name: string, icon: string, color: string) => void;
    onDelete: () => void;
}

export const IncomeModal: React.FC<Props> = ({ isOpen, income, onClose, onSave, onDelete }) => {
    const [name, setName] = React.useState("");
    const [icon, setIcon] = React.useState("business");
    const [color, setColor] = React.useState("var(--success-color)");

    React.useEffect(() => {
        if (isOpen) {
            setName(income?.name || "");
            setIcon(income?.icon || "business");
            setColor(income?.color || "var(--success-color)");
        }
    }, [isOpen, income]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-500 text-[var(--text-main)] text-left">
                <div className="flex justify-between items-center text-[var(--text-main)]">
                    <h3 className="text-lg font-bold uppercase text-[var(--text-main)]">{income ? "Edit Income" : "New Income"}</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-main)]"><X size={24} /></button>
                </div>
                <div className="flex flex-col gap-4 text-[var(--text-main)]">
                    <div className="flex flex-col gap-1.5 text-[var(--text-main)]">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] w-full" />
                    </div>

                    <div className="flex flex-col gap-2 text-left text-[var(--text-main)]">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Icon</label>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 text-[var(--text-main)] text-left">
                            {INCOME_ICONS.map(i => (
                                <button key={i} onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${icon === i ? "border-[var(--success-color)] bg-[var(--success-color)]/10" : "border-[var(--glass-border)]"}`}>
                                    {React.createElement(IconMap[i] || Briefcase, { size: 20 })}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-left text-[var(--text-main)]">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase text-left text-[var(--text-main)]">Color</label>
                        <div className="flex justify-between text-[var(--text-main)]">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${color === c ? "border-[var(--text-main)] scale-110" : "border-transparent opacity-50"}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 items-center text-left text-[var(--text-main)]">
                    {income && (
                        <button onClick={onDelete} className="w-12 h-12 rounded-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--danger-color)] flex items-center justify-center text-left">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={() => onSave(name, icon, color)} className="flex-1 h-14 rounded-2xl bg-[var(--success-color)] text-white font-bold shadow-lg shadow-[var(--success-color)]/20 uppercase text-center">SAVE</button>
                </div>
            </div>
        </div>
    );
};
