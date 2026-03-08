import React from "react";
import { X, Trash2, Briefcase, Plus, Tag } from "lucide-react";
import { IncomeSource } from "../types";
import { COLORS, INCOME_ICONS, IconMap } from "../constants";

interface Props {
    isOpen: boolean;
    income: IncomeSource | null;
    onClose: () => void;
    onSave: (name: string, icon: string, color: string, tags: string[]) => void;
    onDelete: () => void;
}

export const IncomeModal: React.FC<Props> = ({ isOpen, income, onClose, onSave, onDelete }) => {
    const [name, setName] = React.useState("");
    const [icon, setIcon] = React.useState("business");
    const [color, setColor] = React.useState("var(--success-color)");
    const [tags, setTags] = React.useState<string[]>([]);
    const [newTag, setNewTag] = React.useState("");

    React.useEffect(() => {
        if (isOpen) {
            setName(income?.name || "");
            setIcon(income?.icon || "business");
            setColor(income?.color || "var(--success-color)");
            setTags(income?.tags || []);
            setNewTag("");
        }
    }, [isOpen, income]);

    const addTag = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const trimmed = newTag.trim();
        if (trimmed && !(tags || []).some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            setTags([...(tags || []), trimmed]);
            setNewTag("");
        }
    };

    const removeTag = (t: string) => {
        setTags(tags.filter(tag => tag !== t));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-500 text-[var(--text-main)] text-left">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold uppercase">{income ? "Редактировать доход" : "Новый доход"}</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button>
                </div>
                
                <div className="flex flex-col gap-5 overflow-y-auto max-h-[60vh] pr-1 hide-scrollbar">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Название</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 outline-none text-[var(--text-main)] w-full font-semibold focus:border-[var(--success-color)]/50 transition-colors" placeholder="Напр. Зарплата" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Иконка</label>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                            {INCOME_ICONS.map(i => (
                                <button key={i} onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${icon === i ? "border-[var(--success-color)] bg-[var(--success-color)]/10" : "border-[var(--glass-border)] opacity-50 hover:opacity-100"}`}>
                                    {React.createElement(IconMap[i] || Briefcase, { size: 20, color: icon === i ? "var(--success-color)" : "currentColor" })}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Цвет</label>
                        <div className="flex justify-between">
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${color === c ? "border-[var(--text-main)] scale-110" : "border-transparent opacity-50 hover:opacity-80"}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Теги</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" 
                                value={newTag} 
                                onChange={e => setNewTag(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && addTag(e)}
                                className="flex-1 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2 outline-none text-xs text-[var(--text-main)]" 
                                placeholder="Новый тег..." 
                            />
                            <button onClick={(e) => addTag(e)} className="w-10 h-10 rounded-xl bg-[var(--success-color)]/20 text-[var(--success-color)] flex items-center justify-center hover:bg-[var(--success-color)]/30 transition-colors pointer-events-auto">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(t => (
                                <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-full text-[10px] font-bold text-[var(--text-main)] group">
                                    <Tag size={10} className="text-[var(--text-muted)]" />
                                    {t}
                                    <button onClick={() => removeTag(t)} className="text-[var(--text-muted)] hover:text-[var(--danger-color)] transition-colors"><X size={12} /></button>
                                </span>
                            ))}
                            {tags.length === 0 && <span className="text-[10px] text-[var(--text-muted)] italic opacity-50">Нет добавленных тегов</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-2 items-center">
                    {income && (
                        <button onClick={onDelete} className="w-12 h-12 rounded-xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] text-[var(--danger-color)] flex items-center justify-center hover:bg-[var(--danger-color)]/10 transition-all">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={() => onSave(name, icon, color, tags)} className="flex-1 h-14 rounded-2xl bg-[var(--success-color)] text-white font-black shadow-lg shadow-[var(--success-color)]/20 uppercase tracking-widest transition-all active:scale-95">СОХРАНИТЬ</button>
                </div>
            </div>
        </div>
    );
};
