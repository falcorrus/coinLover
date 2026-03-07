import React from "react";
import { X, Plus, Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tag: string) => void;
  existingTags: string[];
  activeTags: string[];
}

export const TagModal: React.FC<Props> = ({ isOpen, onClose, onSelect, existingTags, activeTags }) => {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTags = existingTags.filter(t => 
    t.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = () => {
    const trimmed = query.trim();
    if (trimmed) {
      // Check if tag already exists case-insensitively
      const existing = existingTags.find(t => t.toLowerCase() === trimmed.toLowerCase());
      onSelect(existing || trimmed);
      setQuery("");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[var(--bg-color)] border border-[var(--glass-border)] rounded-t-3xl p-6 flex flex-col gap-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-[var(--primary-color)]" />
            <h3 className="text-sm font-bold uppercase text-[var(--text-main)] tracking-wider">Управление тегами</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Create / Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск или новый тег..."
            className="w-full bg-[var(--glass-item-bg)] border border-[var(--glass-border)] rounded-2xl px-5 py-4 outline-none text-[var(--text-main)] text-sm focus:border-[var(--primary-color)]/50 transition-all pr-12"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          {query.trim().length > 0 && !existingTags.some(t => t.toLowerCase() === query.trim().toLowerCase()) && (
            <button 
              onClick={handleCreate}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--primary-color)] text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {/* Tag List */}
        <div className="max-h-[40vh] overflow-y-auto hide-scrollbar flex flex-wrap gap-2 pb-4">
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => {
              const isActive = activeTags.some(t => t.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  key={tag}
                  onClick={() => onSelect(tag)}
                  className={`px-4 py-2.5 rounded-xl border transition-all duration-200 text-xs font-bold uppercase active:scale-95 ${
                    isActive 
                      ? "bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20" 
                      : "bg-[var(--glass-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })
          ) : (
            query.trim() === "" && <p className="w-full text-center py-8 text-[var(--text-muted)] text-xs uppercase font-bold opacity-50">Нет существующих тегов</p>
          )}
        </div>

        {query.trim() !== "" && !existingTags.some(t => t.toLowerCase() === query.trim().toLowerCase()) && (
           <button 
            onClick={handleCreate}
            className="w-full py-4 rounded-2xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30 text-[var(--primary-color)] text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all"
           >
             Создать "{query.trim()}"
           </button>
        )}
      </div>
    </div>
  );
};
