import React from "react";
import { Crown, X } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleRequestPremium = () => {
    const message = "Здравствуйте, дайте, пожалуйста Premium в Coinlover";
    const url = `https://t.me/argodon?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-[320px] p-8 flex flex-col items-center gap-6 text-center border-[var(--glass-border)] shadow-2xl shadow-[var(--shadow-color)] animate-in zoom-in-95 duration-300 slide-in-from-bottom-8 relative">
        
        {/* Crown Icon with pulsing golden background */}
        <div className="relative w-20 h-20 rounded-[32px] flex items-center justify-center bg-amber-500/10 text-amber-500">
          <div className="absolute inset-0 rounded-[32px] animate-ping opacity-20 bg-amber-500" style={{ animationDuration: '3s' }} />
          <Crown size={36} strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] uppercase">Доступно в тарифе Premium</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed px-1">
            Можете запросить тестовый период в TG: <span className="text-[var(--primary-color)] font-bold">@argodon</span>
          </p>
        </div>

        <div className="flex flex-col w-full gap-3 mt-2">
          <button
            onClick={handleRequestPremium}
            className="h-14 rounded-2xl font-black text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-[var(--primary-color)] shadow-[var(--primary-color)]/20"
          >
            Запросить Premium
          </button>

          <button
            onClick={onClose}
            className="h-14 rounded-2xl bg-[var(--glass-item-bg)] border border-[var(--glass-border)] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all duration-300 text-xs tracking-widest uppercase"
          >
            Закрыть
          </button>
        </div>

        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
