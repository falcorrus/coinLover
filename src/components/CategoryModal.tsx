import React, { useRef } from "react";
import { X, Trash2, Plus, ShoppingBag, Tag } from "lucide-react";
import { Category } from "../types";
import { COLORS, IconMap } from "../constants";

interface Props {
    isOpen: boolean;
    category: Category | null;
    onClose: () => void;
    onSave: (category: Partial<Category>) => void;
    onDelete: () => void;
}

const CATEGORY_ICONS = [
    "shop", "rent", "cafe", "baby", "more", "health", "activity",
    "business", "food", "transit", "subs", "gift", "trendingUp", "laptop"
];

export const CategoryModal: React.FC<Props> = ({ isOpen, category, onClose, onSave, onDelete }) => {
    const [name, setName] = React.useState("");
    const [icon, setIcon] = React.useState("shop");
    const [color, setColor] = React.useState("#6d5dfc");
    const [tags, setTags] = React.useState<string[]>([]);
    const [newTag, setNewTag] = React.useState("");
    const tagInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setName(category?.name || "");
            setIcon(category?.icon || "shop");
            setColor(category?.color || "#6d5dfc");
            setTags(category?.tags ? [...category.tags] : []);
            setNewTag("");
        }
    }, [isOpen, category]);

    if (!isOpen) return null;

    const addTag = () => {
        const trimmed = newTag.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
        }
        setNewTag("");
        tagInputRef.current?.focus();
    };

    const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); addTag(); }
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({ ...category, name: name.trim(), icon, color, tags });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-sm p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-500 text-white text-left overflow-y-auto max-h-[90vh] hide-scrollbar">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold uppercase">{category ? "Изменить категорию" : "Новая категория"}</h3>
                    <button onClick={onClose} className="p-2 -mr-2"><X size={24} /></button>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Название</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Напр. Транспорт"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white w-full focus:border-[#6d5dfc]/50"
                    />
                </div>

                {/* Icon */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Иконка</label>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                        {CATEGORY_ICONS.map(i => (
                            <button
                                key={i}
                                onClick={() => setIcon(i)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${icon === i ? "border-[#6d5dfc] bg-[#6d5dfc]/10" : "border-white/5"}`}
                                style={{ color: icon === i ? color : "#64748b" }}
                            >
                                {React.createElement(IconMap[i] || ShoppingBag, { size: 20 })}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Цвет</label>
                    <div className="flex justify-between">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${color === c ? "border-white scale-110" : "border-transparent opacity-50"}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <Tag size={12} className="text-slate-500" />
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Теги</label>
                    </div>

                    {/* Tag input */}
                    <div className="flex gap-2">
                        <input
                            ref={tagInputRef}
                            type="text"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Новый тег..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 outline-none text-sm text-white focus:border-[#6d5dfc]/50"
                        />
                        <button
                            onClick={addTag}
                            disabled={!newTag.trim()}
                            className="w-10 h-10 rounded-xl bg-[#6d5dfc]/20 border border-[#6d5dfc]/30 flex items-center justify-center text-[#6d5dfc] disabled:opacity-30 transition-opacity"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Existing tags */}
                    {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {tags.map(t => (
                                <div
                                    key={t}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 group"
                                >
                                    <span className="text-[11px] font-bold uppercase text-slate-400">{t}</span>
                                    <button
                                        onClick={() => removeTag(t)}
                                        className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center text-slate-500 hover:bg-[#f43f5e]/20 hover:text-[#f43f5e] transition-colors"
                                    >
                                        <X size={9} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-600 italic">Тегов пока нет — добавьте первый</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2 items-center">
                    {category && (
                        <button onClick={onDelete} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-[#f43f5e] flex items-center justify-center">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 h-14 rounded-2xl bg-[#6d5dfc] text-white font-bold shadow-lg uppercase disabled:opacity-40 transition-opacity"
                    >
                        СОХРАНИТЬ
                    </button>
                </div>
            </div>
        </div>
    );
};
