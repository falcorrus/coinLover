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
    const [color, setColor] = React.useState("#10b981");

    React.useEffect(() => {
        if (isOpen) {
            setName(income?.name || "");
            setIcon(income?.icon || "business");
            setColor(income?.color || "#10b981");
        }
    }, [isOpen, income]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
            <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 text-white text-left">
                <div className="flex justify-between items-center text-white">
                    <h3 className="text-lg font-bold uppercase text-white">{income ? "Edit Income" : "New Income"}</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-white"><X size={24} /></button>
                </div>
                <div className="flex flex-col gap-4 text-white">
                    <div className="flex flex-col gap-1.5 text-white">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white w-full" />
                    </div>

                    <div className="flex flex-col gap-2 text-left text-white">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Icon</label>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 text-white text-left">
                            {INCOME_ICONS.map(i => (
                                <button key={i} onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-150 ${icon === i ? "border-[#10b981] bg-[#10b981]/10" : "border-white/5"}`}>
                                    {React.createElement(IconMap[i] || Briefcase, { size: 20 })}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-left text-white">
                        <label className="text-[10px] font-bold text-slate-500 uppercase text-left text-white">Color</label>
                        <div className="flex justify-between text-white">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${color === c ? "border-white scale-110" : "border-transparent opacity-50"}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 items-center text-left text-white">
                    {income && (
                        <button onClick={onDelete} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-[#f43f5e] flex items-center justify-center text-left">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={() => onSave(name, icon, color)} className="flex-1 h-14 rounded-2xl bg-[#10b981] text-white font-bold shadow-lg uppercase text-center">SAVE</button>
                </div>
            </div>
        </div>
    );
};
