import React from "react";
import { X, Check, Palette, Sparkles, Sun, Leaf } from "lucide-react";

interface ThemeOption {
  id: "white" | "mint" | "black";
  name: string;
  description: string;
  icon: React.ReactNode;
  previewColor: string;
  accentColor: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelect: (theme: "white" | "mint" | "black") => void;
}

const THEMES: ThemeOption[] = [
  {
    id: "white",
    name: "White",
    description: "Minimalist purity and clarity",
    icon: <Sun className="w-5 h-5 text-slate-600" />,
    previewColor: "#FFFFFF",
    accentColor: "#64748B"
  },
  {
    id: "mint",
    name: "Mint",
    description: "Organic feel and Soft UI",
    icon: <Leaf className="w-5 h-5 text-emerald-600" />,
    previewColor: "#E8F0ED",
    accentColor: "#924A28"
  },
  {
    id: "black",
    name: "Black",
    description: "Borderless with soft glow",
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    previewColor: "#0D1117",
    accentColor: "#a78bfa"
  }
];

export const ThemeModal: React.FC<Props> = ({ isOpen, onClose, currentTheme, onSelect }) => {
  if (!isOpen) return null;

  // Map legacy names to new ones for active state
  const getActiveId = () => {
    if (currentTheme === 'zen') return 'white';
    if (currentTheme === 'modern' || currentTheme === 'dark') return 'black';
    return currentTheme;
  };

  const activeId = getActiveId();

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
            const isActive = activeId === theme.id;
            
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
                    backgroundColor: theme.previewColor
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
                      backgroundColor: theme.previewColor,
                      filter: theme.id === 'black' ? `drop-shadow(0 0 6px #a78bfa80)` : 'none'
                    }}
                  />
                  <div 
                    className="w-8 h-8 rounded-full border border-[var(--glass-border)] flex items-center justify-center"
                    style={{ backgroundColor: theme.id === 'black' ? '#161b22' : theme.id === 'mint' ? '#F3FBF8' : '#F8FAFC' }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accentColor }} />
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
