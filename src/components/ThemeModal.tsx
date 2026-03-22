import React from "react";
import { X, Check, Palette, Sparkles, Sun } from "lucide-react";

interface ThemeOption {
  id: "modern" | "zen";
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelect: (theme: "modern" | "zen") => void;
}

const THEMES: ThemeOption[] = [
  {
    id: "modern",
    name: "Modern Glow",
    description: "Borderless with soft neon glow",
    icon: <Sparkles className="w-5 h-5 text-purple-400" />
  },
  {
    id: "zen",
    name: "Zen Precision",
    description: "Architectural purity and clarity",
    icon: <Sun className="w-5 h-5 text-slate-600" />
  }
];

export const ThemeModal: React.FC<Props> = ({ isOpen, onClose, currentTheme, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 sm:zoom-in-95">
        <div className="px-6 py-5 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">App Theme</h2>
              <p className="text-xs text-[var(--text-muted)]">Choose your visual style</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--glass-item-active)] rounded-full transition-colors text-[var(--text-muted)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 grid gap-3">
          {THEMES.map((theme) => {
            const isActive = currentTheme === theme.id || (currentTheme === 'dark' && theme.id === 'modern');
            
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSelect(theme.id);
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden group ${
                  isActive 
                    ? "bg-[var(--glass-item-active)] border-primary shadow-lg shadow-primary/5" 
                    : "bg-transparent border-[var(--glass-border)] hover:border-[var(--glass-border-highlight)]"
                }`}
              >
                {/* Visual Preview Background */}
                <div 
                  className="absolute right-[-10px] top-[-10px] w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
                  style={{ 
                    backgroundColor: theme.id === 'zen' ? '#f8f9fa' : '#0D1117' 
                  }}
                />

                <div className={`p-3 rounded-xl ${isActive ? 'bg-primary/20 text-primary' : 'bg-[var(--glass-item-bg)] text-[var(--text-muted)]'}`}>
                  {theme.icon}
                </div>

                <div className="flex-1">
                  <div className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    {theme.name}
                    {isActive && <Check size={14} className="text-primary" />}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{theme.description}</div>
                </div>

                {/* Mini Mockup Preview */}
                <div className="hidden sm:flex items-center gap-1 opacity-40">
                  <div 
                    className="w-8 h-8 rounded-lg border border-[var(--glass-border)]"
                    style={{ 
                      backgroundColor: theme.id === 'zen' ? '#f8f9fa' : '#0D1117',
                      filter: theme.id === 'modern' ? `drop-shadow(0 0 6px #a78bfa80)` : 'none'
                    }}
                  />
                  <div 
                    className="w-8 h-8 rounded-full border border-[var(--glass-border)] flex items-center justify-center"
                    style={{ backgroundColor: theme.id === 'zen' ? '#F8FAFC' : '#161b22' }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.id === 'zen' ? '#1A1A1A' : '#a78bfa' }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-6 bg-[var(--glass-item-bg)] text-center text-xs text-[var(--text-muted)]">
          Theme preference is saved to your local storage.
        </div>
      </div>
    </div>
  );
};
